// Migrates the old WordPress site (database `akatsico_website`) into the CMS.
//
//   npm run migrate:wordpress -w apps/web            # run
//   npm run migrate:wordpress -w apps/web -- --dry   # report only, no writes
//
// Env (apps/web/.env): DATABASE_URL, R2_*; optional WP_DATABASE_URL (default:
// same server, database akatsico_website) and WP_UPLOADS_URL (default:
// https://akatsico.edu.gh/wp-content/uploads).
//
// Re-runnable: rows are matched by natural keys (section+slug, type+slug,
// kind+slug) and updated; media already transferred is reused. Re-running
// overwrites CMS edits made to migrated rows, so run it before editors start.
import { randomUUID } from "node:crypto";
import mysql from "mysql2/promise";
import type { Pool, RowDataPacket } from "mysql2/promise";
import { blocksSchema } from "../src/lib/blocks";
import { DIRECTORY_GROUPS, personSlug } from "../src/lib/directory";
import type { Block } from "../src/lib/blocks";
import { legacyRedirect } from "../src/lib/legacy-redirects";
import { isRichTextEmpty, plainText, sanitizeRichText } from "../src/server/api/lib/rich-text";
import { MediaPipe } from "./wp/media";
import type { Folder } from "./wp/media";
import { decodeEntities, phpUnserialize, toSegments } from "./wp/shortcodes";
import type { Segment } from "./wp/shortcodes";

const DRY = process.argv.includes("--dry");
const SITE = "https://akatsico.edu.gh";
const UPLOADS = (process.env.WP_UPLOADS_URL ?? `${SITE}/wp-content/uploads`).replace(/\/$/, "");
const PLACEHOLDER = /placeholder(male|female)|revslider\//i;

const report = { created: [] as Array<string>, updated: [] as Array<string>, notes: [] as Array<string> };
const id = () => randomUUID().slice(0, 12);

// ---- Connections -----------------------------------------------------------

const targetUrl = process.env.DATABASE_URL?.replace(/"/g, "");
if (!targetUrl) throw new Error("DATABASE_URL is not set.");
const wpUrl = process.env.WP_DATABASE_URL ?? targetUrl.replace(/\/[^/?]+(\?|$)/, "/akatsico_website$1");
const db: Pool = mysql.createPool({ uri: targetUrl, dateStrings: true });
const wp: Pool = mysql.createPool({ uri: wpUrl, dateStrings: true });

async function q<T = RowDataPacket>(pool: Pool, sql: string, params: Array<unknown> = []) {
  const [rows] = await pool.query<RowDataPacket[]>(sql, params);
  return rows as unknown as Array<T>;
}

// ---- Text helpers ------------------------------------------------------------

const ACRONYMS = new Set(["ICT", "SRC", "STS", "HOD", "PE", "II", "III", "IV", "CEO", "IT"]);
const SMALL = new Set(["of", "and", "in", "the", "for", "to", "a", "an", "on"]);

// "BISMARK LEMBOE" → "Bismark Lemboe"; mixed-case input is left alone.
function tidyCase(s: string) {
  const t = decodeEntities(s).replace(/\s+/g, " ").trim();
  if (t !== t.toUpperCase() || !/[A-Z]/.test(t)) return t;
  return t
    .split(" ")
    .map((w, i) => {
      if (ACRONYMS.has(w.replace(/[^A-Z]/g, ""))) return w;
      const lower = w.toLowerCase();
      if (i > 0 && SMALL.has(lower)) return lower;
      return lower.replace(/(^|[-'’(])([a-z])/g, (_, p, c: string) => p + c.toUpperCase());
    })
    .join(" ");
}

const normName = (s: string) =>
  s
    .toLowerCase()
    .replace(/\b(dr|mr|mrs|ms|prof|rev|ing)\.?\s+/g, "")
    .replace(/[^a-z]/g, "");

// First real paragraph — skips one-line labels like "<strong>Principal</strong>".
function summaryOf(html: string, max = 220) {
  const paragraphs = [...html.matchAll(/<p>([\s\S]*?)<\/p>/g)].map((m) => plainText(m[1] ?? "", max));
  return paragraphs.find((p) => p.length >= 40) ?? (plainText(html, max) || null);
}

// ---- WordPress attachments → R2 ------------------------------------------------

const attachments = new Map<number, { file: string; alt: string; title: string }>();
let media: MediaPipe;

async function loadAttachments() {
  const rows = await q<{ ID: number; title: string; file: string | null; alt: string | null }>(
    wp,
    `SELECT p.ID, p.post_title title,
            (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_wp_attached_file') file,
            (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = '_wp_attachment_image_alt') alt
     FROM wp_posts p WHERE p.post_type = 'attachment'`,
  );
  for (const r of rows) if (r.file) attachments.set(r.ID, { file: r.file, alt: r.alt ?? "", title: r.title });
}

async function attachmentUrl(attId: number | null | undefined, folder: Folder): Promise<string | null> {
  if (!attId) return null;
  const att = attachments.get(Number(attId));
  if (!att || PLACEHOLDER.test(att.file)) return null;
  if (DRY) return `${UPLOADS}/${att.file}`;
  return (await media.migrate(att.file, folder, att.alt))?.url ?? null;
}

async function uploadUrl(url: string | null | undefined, folder: Folder): Promise<string | null> {
  if (!url || PLACEHOLDER.test(url) || !url.includes("/wp-content/uploads/")) return null;
  if (DRY) return url;
  return (await media.migrateUrl(url, folder))?.url ?? null;
}

// Resolves image placeholders and old-site links, then sanitises.
async function finalizeHtml(html: string, folder: Folder): Promise<string> {
  let out = html;
  for (const m of [...out.matchAll(/wpimg:(\d+)/g)]) {
    const url = await attachmentUrl(Number(m[1]), folder);
    out = url ? out.replace(m[0], url) : out.replace(new RegExp(`<p><img src="${m[0]}"[^>]*></p>`), "");
  }
  for (const m of [...new Set([...out.matchAll(/https?:\/\/(?:www\.)?akatsico\.edu\.gh\/wp-content\/uploads\/[^"'\s<)]+/g)].map((x) => x[0]))]) {
    const url = await uploadUrl(m, folder);
    if (url) out = out.split(m).join(url);
  }
  out = out.replace(/href="https?:\/\/(?:www\.)?akatsico\.edu\.gh(\/[^"]*)?"/g, (_, path: string | undefined) => {
    const p = path ?? "/";
    return `href="${legacyRedirect(p) ?? (p.replace(/\/+$/, "") || "/")}"`;
  });
  const clean = sanitizeRichText(out);
  return isRichTextEmpty(clean) ? "" : clean;
}

// Headings that only labelled a structure we now render ourselves.
const STRUCTURAL_HEADING = /^(head of (department|unit)|staff|src executives|college management|find us|say hello)$/i;

function segmentHtml(seg: Segment) {
  if (seg.kind === "html") return seg.html;
  if (seg.kind === "heading" && !STRUCTURAL_HEADING.test(seg.text)) return `<h${seg.level}>${tidyCase(seg.text)}</h${seg.level}>`;
  return "";
}

// ---- Team members (Team Manager plugin "tmm") --------------------------------------

interface Member {
  name: string;
  title: string;
  bio: string | null;
  photo: string | null; // WordPress URL
}

const teams = new Map<string, Array<Member>>();

async function loadTeams() {
  const rows = await q<{ slug: string; head: string }>(
    wp,
    `SELECT p.post_name slug, m.meta_value head FROM wp_posts p
     JOIN wp_postmeta m ON m.post_id = p.ID AND m.meta_key = '_tmm_head'
     WHERE p.post_type = 'tmm' AND p.post_status = 'publish'`,
  );
  for (const r of rows) {
    const data = phpUnserialize(r.head) as Record<string, Record<string, string>> | null;
    const members = Object.values(data ?? {}).map((m) => ({
      name: tidyCase(`${m._tmm_firstname ?? ""} ${m._tmm_lastname ?? ""}`),
      title: tidyCase(m._tmm_job ?? ""),
      bio: (m._tmm_desc ?? "").trim() || null,
      photo: m._tmm_photo || null,
    }));
    teams.set(r.slug, members.filter((m) => m.name));
  }
}

// Staff rows link to their directory profile by slug (profiles themselves
// live in staff_profiles and survive re-imports).
async function upsertPerson(p: {
  group: string;
  name: string;
  title: string;
  departmentId?: number | null;
  photoUrl?: string | null;
  bio?: string | null;
  unitRole?: string | null;
  sortOrder: number;
}) {
  if (DRY) return;
  const slug = DIRECTORY_GROUPS.includes(p.group) ? personSlug(p.name) : null;
  const unitRole = p.unitRole ?? (p.departmentId && /^head\b/i.test(p.title) ? p.title : null);
  await db.execute(
    `INSERT INTO people (group_key, name, title, profile_slug, unit_role, department_id, photo_url, bio, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
    [p.group, p.name, p.title || "Staff", slug, unitRole, p.departmentId ?? null, p.photoUrl ?? null, p.bio ?? null, p.sortOrder],
  );
  if (slug) await db.execute("INSERT IGNORE INTO staff_profiles (slug) VALUES (?)", [slug]);
}

// ---- Pages -----------------------------------------------------------------------

const PEOPLE_GROUP_FOR_TEAM: Record<string, { group: "management" | "student_leadership"; title: string }> = {
  "management-members": { group: "management", title: "College Management" },
  "core-src": { group: "student_leadership", title: "SRC Executives" },
};

async function pageBlocksFrom(content: string, opts: { folder: Folder; profileRole?: string }) {
  const blocks: Array<Block> = [];
  let html = "";
  let contact = false;
  const flush = async () => {
    const clean = await finalizeHtml(html, opts.folder);
    if (clean) blocks.push({ id: id(), type: "richText", html: clean });
    html = "";
  };
  for (const seg of toSegments(content)) {
    if (seg.kind === "team") {
      await flush();
      const target = PEOPLE_GROUP_FOR_TEAM[seg.name];
      if (target) blocks.push({ id: id(), type: "people", title: target.title, intro: "", group: target.group, layout: "grid" });
      else report.notes.push(`Team "${seg.name}" embedded in a page was not mapped to a people group.`);
    } else if (seg.kind === "profile") {
      await flush();
      const photo = await attachmentUrl(seg.imageId, opts.folder);
      const role = opts.profileRole ? `<p><strong>${opts.profileRole}</strong></p>` : "";
      const bio = await finalizeHtml(role + seg.bioHtml, opts.folder);
      const name = tidyCase(seg.name);
      if (photo) {
        blocks.push({ id: id(), type: "imageText", title: name, html: bio, imageUrl: photo, imageAlt: name, imagePosition: "left" });
      } else {
        blocks.push({ id: id(), type: "richText", html: sanitizeRichText(`<h2>${name}</h2>${bio}`) });
      }
    } else if (seg.kind === "map" || seg.kind === "form") {
      contact = true;
    } else {
      html += segmentHtml(seg);
    }
  }
  await flush();
  if (contact) blocks.push({ id: id(), type: "contact", title: "Get in touch", intro: "", showForm: true, showMap: true });
  return blocksSchema.parse(blocks);
}

interface PageSpec {
  wp?: number;
  section: "about" | "academics" | "admissions" | "student-life" | "alumni";
  slug: string;
  title: string;
  order: number;
  summary?: string;
  profileRole?: string;
  blocks?: (wpBlocks: Array<Block>) => Array<Block>;
}

const PAGES: Array<PageSpec> = [
  { wp: 15, section: "about", slug: "office-of-the-principal", title: "Principal’s Office", order: 0, profileRole: "Principal" },
  { wp: 17, section: "about", slug: "history", title: "History of AkatsiCoE", order: 1 },
  {
    wp: 19,
    section: "about",
    slug: "management",
    title: "Management",
    order: 2,
    summary: "The leadership team of Akatsi College of Education.",
  },
  {
    wp: 42,
    section: "about",
    slug: "contact-us",
    title: "Contact Us",
    order: 3,
    summary: "Find us in Akatsi, Volta Region — or send us a message.",
  },
  { wp: 441, section: "academics", slug: "student-affairs", title: "Student Affairs", order: 0, profileRole: "Dean of Students" },
  {
    wp: 21,
    section: "academics",
    slug: "departments",
    title: "Academic Departments",
    order: 1,
    summary: "Our six academic departments deliver the college’s Bachelor of Education programmes.",
    blocks: () => [{ id: id(), type: "departments", title: "", intro: "", kind: "department" }],
  },
  {
    wp: 25,
    section: "academics",
    slug: "units",
    title: "Units of the College",
    order: 2,
    summary: "The administrative and support units that keep the college running.",
    blocks: () => [{ id: id(), type: "departments", title: "", intro: "", kind: "unit" }],
  },
  { wp: 27, section: "student-life", slug: "student-leadership", title: "Student Leadership", order: 0 },
  { wp: 32, section: "student-life", slug: "student-services", title: "Student Services", order: 1 },
];

async function migratePages(heroes: Map<number, string | null>) {
  for (const spec of PAGES) {
    const [row] = spec.wp ? await q<{ post_content: string }>(wp, "SELECT post_content FROM wp_posts WHERE ID = ?", [spec.wp]) : [];
    const wpBlocks = row ? await pageBlocksFrom(row.post_content, { folder: "pages", profileRole: spec.profileRole }) : [];
    const blocks = blocksSchema.parse(spec.blocks ? spec.blocks(wpBlocks) : wpBlocks);
    const firstText = blocks.find((b) => b.type === "richText" || b.type === "imageText") as { html: string } | undefined;
    const summary = spec.summary ?? (firstText ? summaryOf(firstText.html) : null);
    const hero = spec.wp ? (heroes.get(spec.wp) ?? null) : null;
    if (DRY) {
      report.updated.push(`page ${spec.section}/${spec.slug}: ${blocks.map((b) => b.type).join(", ")}`);
      continue;
    }
    const [result] = await db.execute<mysql.ResultSetHeader>(
      `INSERT INTO pages (section, slug, title, summary, hero_image_url, body, blocks, status, show_in_nav, sort_order, published_at, created_by, updated_by)
       VALUES (?, ?, ?, ?, ?, NULL, ?, 'published', 1, ?, NOW(), ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), summary = VALUES(summary), hero_image_url = VALUES(hero_image_url),
         body = NULL, blocks = VALUES(blocks), status = 'published', show_in_nav = 1, sort_order = VALUES(sort_order),
         published_at = COALESCE(published_at, NOW()), updated_by = VALUES(updated_by)`,
      [spec.section, spec.slug, spec.title, summary, hero, JSON.stringify(blocks), spec.order, adminId, adminId],
    );
    (result.affectedRows === 1 ? report.created : report.updated).push(`page /${spec.section}/${spec.slug}`);
  }
}

// ---- Departments & units ---------------------------------------------------------------

interface OrgSpec {
  kind: "department" | "unit";
  slug: string;
  name: string;
  wp: Array<number>;
  order: number;
}

const DEPARTMENTS: Array<OrgSpec> = [
  { kind: "department", slug: "mathematics-ict", name: "", wp: [161], order: 0 },
  { kind: "department", slug: "education-studies", name: "", wp: [162], order: 1 },
  { kind: "department", slug: "science-physical-education", name: "", wp: [163], order: 2 },
  { kind: "department", slug: "languages", name: "", wp: [164], order: 3 },
  { kind: "department", slug: "social-sciences", name: "", wp: [221], order: 4 },
  { kind: "department", slug: "vocational-and-technical", name: "", wp: [595], order: 5 },
];

// In the order of the old "Units of the College" page.
const UNITS: Array<OrgSpec> = [
  { kind: "unit", slug: "academic-affairs", name: "Academic Affairs", wp: [], order: 0 },
  { kind: "unit", slug: "college-registry", name: "College Registry", wp: [533], order: 1 },
  { kind: "unit", slug: "assessment", name: "Assessment Unit", wp: [468], order: 2 },
  { kind: "unit", slug: "guidance-and-counselling", name: "Guidance and Counselling", wp: [], order: 3 },
  { kind: "unit", slug: "internal-audit", name: "Internal Audit", wp: [877], order: 4 },
  { kind: "unit", slug: "procurement", name: "Procurement Unit", wp: [906], order: 5 },
  { kind: "unit", slug: "quality-assurance", name: "Quality Assurance Unit", wp: [921, 478], order: 6 },
  { kind: "unit", slug: "ict", name: "ICT Unit", wp: [429], order: 7 },
  { kind: "unit", slug: "supported-teaching-in-schools", name: "Supported Teaching in Schools", wp: [888], order: 8 },
  { kind: "unit", slug: "finance", name: "Finance Unit", wp: [521], order: 9 },
  { kind: "unit", slug: "kitchen", name: "Kitchen", wp: [894], order: 10 },
  { kind: "unit", slug: "stores", name: "Stores", wp: [891], order: 11 },
  { kind: "unit", slug: "transport", name: "Transport Unit", wp: [903], order: 12 },
  { kind: "unit", slug: "works", name: "Works", wp: [529], order: 13 },
];

async function migrateOrg(spec: OrgSpec, heroes: Map<number, string | null>) {
  const folder: Folder = "departments";
  let html = "";
  let head: { name: string; photo: string | null; bio: string } | null = null;
  const members: Array<{ name: string; title: string; photo: string | null; bio: string | null }> = [];
  let wpTitle = "";

  for (const wpId of spec.wp) {
    const [row] = await q<{ post_title: string; post_content: string }>(wp, "SELECT post_title, post_content FROM wp_posts WHERE ID = ?", [wpId]);
    if (!row) continue;
    wpTitle ||= decodeEntities(row.post_title);
    for (const seg of toSegments(row.post_content)) {
      if (seg.kind === "profile" && !head) {
        head = { name: tidyCase(seg.name), photo: await attachmentUrl(seg.imageId, "people"), bio: await finalizeHtml(seg.bioHtml, "people") };
      } else if (seg.kind === "profile") {
        members.push({ name: tidyCase(seg.name), title: "", photo: await attachmentUrl(seg.imageId, "people"), bio: plainText(seg.bioHtml, 4000) || null });
      } else if (seg.kind === "team") {
        const team = teams.get(seg.name);
        if (!team) report.notes.push(`${spec.slug}: team "${seg.name}" not found.`);
        for (const m of team ?? []) members.push({ name: m.name, title: m.title, photo: await uploadUrl(m.photo, "people"), bio: m.bio });
      } else if (seg.kind === "member") {
        members.push({ name: tidyCase(seg.name), title: tidyCase(seg.title), photo: await attachmentUrl(seg.imageId, "people"), bio: null });
      } else {
        html += segmentHtml(seg);
      }
    }
  }

  const body = await finalizeHtml(html, folder);
  const name = spec.name || wpTitle;
  const headTitle = spec.kind === "unit" ? "Head of Unit" : "Head of Department";
  const image = spec.wp[0] ? (heroes.get(spec.wp[0]) ?? null) : null;
  const published = spec.wp.length > 0;

  if (DRY) {
    report.updated.push(`${spec.kind} ${spec.slug}: head=${head?.name ?? "-"}, staff=${members.length}, body=${body.length}ch`);
    return;
  }
  await db.execute(
    `INSERT INTO departments (kind, slug, name, summary, body, image_url, head_name, head_title, head_photo_url, is_published, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), summary = VALUES(summary), body = VALUES(body), image_url = VALUES(image_url),
       head_name = VALUES(head_name), head_title = VALUES(head_title), head_photo_url = VALUES(head_photo_url),
       is_published = VALUES(is_published), sort_order = VALUES(sort_order),
       programmes = NULL, email = NULL, phone = NULL, location = NULL`,
    [spec.kind, spec.slug, name, body ? summaryOf(body) : null, body || null, image, head?.name ?? null, head ? headTitle : null, head?.photo ?? null, published ? 1 : 0, spec.order],
  );
  const [dept] = await q<{ id: number }>(db, "SELECT id FROM departments WHERE kind = ? AND slug = ?", [spec.kind, spec.slug]);
  report.updated.push(`${spec.kind} ${name}${published ? "" : " (unpublished stub — no page on the old site)"}`);

  // Staff: replace this department's people with the migrated list, head first.
  await db.execute("DELETE FROM people WHERE department_id = ? AND group_key = 'staff'", [dept!.id]);
  let order = 0;
  if (head) {
    const match = members.findIndex((m) => normName(m.name) === normName(head.name));
    const merged = match >= 0 ? members.splice(match, 1)[0]! : null;
    await upsertPerson({
      group: "staff",
      name: merged?.name ?? head.name,
      title: merged?.title || headTitle,
      departmentId: dept!.id,
      photoUrl: head.photo ?? merged?.photo,
      bio: plainText(head.bio, 4000) || merged?.bio || null,
      unitRole: headTitle,
      sortOrder: order++,
    });
  }
  const seen = new Set<string>();
  for (const m of members) {
    if (seen.has(normName(m.name))) continue;
    seen.add(normName(m.name));
    await upsertPerson({ group: "staff", name: m.name, title: m.title, departmentId: dept!.id, photoUrl: m.photo, bio: m.bio, sortOrder: order++ });
  }
}

// ---- Posts ----------------------------------------------------------------------------

async function migratePosts(heroes: Map<number, string | null>) {
  const rows = await q<{ ID: number; post_type: string; post_name: string; post_title: string; post_content: string; post_date: string }>(
    wp,
    `SELECT ID, post_type, post_name, post_title, post_content, post_date FROM wp_posts
     WHERE post_status = 'publish' AND post_type IN ('news_and_events', 'notice_board') ORDER BY post_date`,
  );
  for (const r of rows) {
    const type = r.post_type === "notice_board" ? "announcement" : "news";
    const html = toSegments(r.post_content).map(segmentHtml).join("");
    const body = await finalizeHtml(html, "posts");
    const title = decodeEntities(r.post_title).trim();
    // Placeholder copy left on the old site is imported as a draft for review.
    const placeholder = /\bXYZ\b|lorem ipsum/i.test(r.post_content);
    const category = type === "announcement" ? (/admission|fee|registration/i.test(title) ? "Admissions" : "General") : "College News";
    const slug = r.post_name.replace(/_/g, "-").slice(0, 190);
    if (placeholder) report.notes.push(`${type} “${title}” contains placeholder text — imported as a DRAFT for review.`);
    if (DRY) {
      report.updated.push(`${type} ${slug} (${placeholder ? "draft" : "published"})`);
      continue;
    }
    await db.execute(
      `INSERT INTO posts (type, slug, title, excerpt, body, cover_image_url, category, status, published_at, author_id, updated_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE title = VALUES(title), excerpt = VALUES(excerpt), body = VALUES(body),
         cover_image_url = VALUES(cover_image_url), category = VALUES(category), status = VALUES(status),
         published_at = VALUES(published_at)`,
      [type, slug, title, plainText(body, 220) || null, body || null, heroes.get(r.ID) ?? null, category, placeholder ? "draft" : "published", r.post_date, adminId, adminId],
    );
    report.updated.push(`${type} “${title}”`);
  }
}

// ---- Guides & docs → Downloads ------------------------------------------------------

async function migrateDocuments() {
  const rows = await q<{ ID: number; post_title: string; post_date: string; att: string | null }>(
    wp,
    `SELECT p.ID, p.post_title, p.post_date,
            (SELECT meta_value FROM wp_postmeta WHERE post_id = p.ID AND meta_key = 'guide_doc_upload') att
     FROM wp_posts p WHERE p.post_type = 'guides_and_docs' AND p.post_status = 'publish'`,
  );
  for (const r of rows) {
    const att = attachments.get(Number(r.att));
    const title = decodeEntities(r.post_title).trim();
    if (!att) {
      report.notes.push(`Download “${title}” has no file attached on the old site — skipped.`);
      continue;
    }
    const asset = DRY ? null : await media.migrate(att.file, "documents", title);
    if (!DRY && !asset) continue;
    const category = /calend[ae]r|timetable/i.test(title) ? "timetable" : /brochure|report|magazine/i.test(title) ? "report" : "other";
    if (DRY) {
      report.updated.push(`document “${title}” (${category})`);
      continue;
    }
    const [existing] = await q<{ id: number }>(db, "SELECT id FROM documents WHERE file_url = ? OR title = ? LIMIT 1", [asset!.url, title]);
    const values = [title, category, asset!.url, asset!.filename, asset!.mime, asset!.size, r.post_date.slice(0, 10)];
    if (existing) {
      await db.execute(
        "UPDATE documents SET title = ?, category = ?, file_url = ?, file_name = ?, mime_type = ?, size_bytes = ?, published_on = ?, is_published = 1 WHERE id = ?",
        [...values, existing.id],
      );
    } else {
      await db.execute(
        "INSERT INTO documents (title, category, file_url, file_name, mime_type, size_bytes, published_on, is_published, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 1, ?)",
        [...values, adminId],
      );
    }
    report.updated.push(`download “${title}”`);
  }
}

// ---- Home slider (Slider Revolution 7) → Spotlights ------------------------------------------

async function migrateSpotlights() {
  const slides = await q<{ slide_order: number; params: string; layers: string }>(
    wp,
    "SELECT slide_order, params, layers FROM wp_revslider_slides7 WHERE slider_id = 5 AND slide_order > 0 ORDER BY slide_order",
  );
  const news = await q<{ post_name: string; post_title: string }>(
    wp,
    "SELECT post_name, post_title FROM wp_posts WHERE post_type = 'news_and_events' AND post_status = 'publish'",
  );
  if (!DRY) await db.execute("DELETE FROM spotlights WHERE image_url LIKE '%/wp/%'");

  let order = 0;
  for (const s of slides) {
    type Layer = { type?: string; subtype?: string; href?: string; content?: { text?: string }; bg?: { image?: { src?: string } } };
    const params = JSON.parse(s.params) as { title?: string };
    const parsed = JSON.parse(s.layers) as Array<Layer> | Record<string, Layer>;
    const layers = Array.isArray(parsed) ? parsed : Object.values(parsed);
    const background = layers.find((l) => l.subtype === "slidebg")?.bg?.image?.src;
    const texts = layers
      .filter((l) => l.type === "text" && l.subtype !== "button")
      .map((l) =>
        decodeEntities(l.content?.text ?? "")
          .replace(/<\/?br\s*\/?>/gi, "\n")
          .replace(/<[^>]+>/g, "")
          .split("\n")
          .map((x) => x.replace(/\s+/g, " ").trim())
          .filter(Boolean),
      )
      .filter((lines) => lines.length);
    const buttons = layers.filter((l) => l.subtype === "button" && l.href && l.href !== "#");
    const button = buttons.find((b) => /apply/i.test(b.content?.text ?? "")) ?? buttons[0];

    // Line breaks in slide text are visual only. An all-caps first line is a
    // name ("NIHAD MUMUNI" / "First Female SRC Prez-Elect"); a trailing
    // "Apply now" just repeats the button.
    const lines = (texts[0] ?? []).filter((l, i, all) => !(i === all.length - 1 && i > 0 && /^apply now!?$/i.test(l)));
    const nameFirst = lines.length > 1 && lines[0] === lines[0]!.toUpperCase();
    let title = nameFirst ? tidyCase(lines[0]!) : lines.join(" ");
    let caption = [...(nameFirst ? lines.slice(1) : []), ...texts.slice(1).flat()].join(" ") || null;
    let ctaLabel = button ? tidyCase(button.content?.text ?? "") : null;
    let ctaUrl = button?.href ?? null;
    const showText = Boolean(title);
    // Text-less slide: link it to the news story it illustrates.
    if (!title && params.title) {
      const words = params.title.toLowerCase().split(/\s+/);
      const story = news.find((n) => words.every((w) => n.post_title.toLowerCase().includes(w)));
      title = story ? decodeEntities(story.post_title) : tidyCase(params.title);
      if (story) {
        ctaLabel = "Read more";
        ctaUrl = `/news/${story.post_name.replace(/_/g, "-")}`;
        caption = null;
      }
    }
    const image = await uploadUrl(background, "spotlights");
    if (!image) {
      report.notes.push(`Slide “${title}” has no downloadable background — skipped.`);
      continue;
    }
    if (DRY) {
      report.updated.push(`spotlight “${title}” → ${ctaUrl ?? "no button"}`);
      continue;
    }
    await db.execute(
      "INSERT INTO spotlights (title, caption, image_url, cta_label, cta_url, show_text, is_active, sort_order, created_by) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)",
      [title.slice(0, 200), caption?.slice(0, 500) ?? null, image, ctaLabel, ctaUrl, showText ? 1 : 0, order++, adminId],
    );
    report.updated.push(`spotlight “${title}”`);
  }
}

// ---- People groups shown on pages (management, SRC) -------------------------------------

async function migrateGroups() {
  for (const [team, target] of Object.entries(PEOPLE_GROUP_FOR_TEAM)) {
    const members = teams.get(team) ?? [];
    if (!DRY) await db.execute("DELETE FROM people WHERE group_key = ? AND department_id IS NULL", [target.group]);
    for (const [i, m] of members.entries()) {
      await upsertPerson({ group: target.group, name: m.name, title: m.title, photoUrl: await uploadUrl(m.photo, "people"), bio: m.bio, sortOrder: i });
    }
    report.updated.push(`${target.title}: ${members.length} people`);
  }
}

// ---- Site settings ----------------------------------------------------------------

async function migrateSettings(principal: { name: string; bio: string; photo: string | null }) {
  const stored = new Map(
    (await q<{ setting_key: string; value: unknown }>(db, "SELECT setting_key, value FROM site_settings")).map((r) => [r.setting_key, r.value as Record<string, unknown>]),
  );
  const { DEFAULT_SETTINGS } = await import("../src/lib/settings");
  const current = <TKey extends keyof typeof DEFAULT_SETTINGS>(k: TKey) =>
    ({ ...DEFAULT_SETTINGS[k], ...(stored.get(k) ?? {}) }) as (typeof DEFAULT_SETTINGS)[TKey];
  const [units] = await q<{ n: number }>(db, "SELECT COUNT(*) n FROM departments WHERE kind = 'unit' AND is_published = 1");

  const updates = {
    identity: { ...current("identity"), motto: "Head, Heart and Hands" },
    // From the old site's header, footer and Contact Us map.
    contact: {
      ...current("contact"),
      address: "Akatsi College of Education\nAkatsi, Volta Region, Ghana\nGhana Post GPS: VX-0021-0401",
      postalAddress: "",
      phone: "+233 25 675 4949",
      altPhone: "024 538 3769",
      email: "info@akatsico.edu.gh",
      officeHours: "",
      mapQuery: "6.125290,0.799683",
    },
    socials: { ...current("socials"), facebook: "https://facebook.com/akatsico" },
    quickLinks: {
      items: [
        { label: "Apply Now", url: "https://admission.coeportal.edu.gh/", icon: "apply", highlight: true },
        { label: "Student Portal", url: "https://portal.akatsico.edu.gh", icon: "portal", highlight: false },
        { label: "Check Admission Status", url: "http://www.admissionsghana.com/", icon: "news", highlight: false },
        { label: "Academic Calendar", url: "/downloads?category=timetable", icon: "calendar", highlight: false },
        { label: "Downloads", url: "/downloads", icon: "download", highlight: false },
        { label: "Contact Us", url: "/about/contact-us", icon: "contact", highlight: false },
      ],
    },
    welcome: {
      ...current("welcome"),
      eyebrow: "Office of the Principal",
      title: "Welcome to Akatsi College of Education",
      message: principal.bio,
      name: principal.name,
      role: "Principal, Akatsi College of Education",
      photoUrl: principal.photo ?? "",
      linkLabel: "Read the Principal’s profile",
      linkUrl: "/about/office-of-the-principal",
    },
    // Only figures the old site actually states.
    stats: {
      title: "AkatsiCoE at a Glance",
      intro: "Training teachers of Head, Heart and Hands since 1963",
      items: [
        { value: 1963, suffix: "", label: "Founded", note: "Opened in October 1963 with 42 students" },
        { value: DEPARTMENTS.length, suffix: "", label: "Academic departments", note: "Delivering the B.Ed programmes" },
        { value: Number(units?.n ?? 0), suffix: "", label: "Units", note: "Supporting teaching, learning and welfare" },
      ],
    },
    cta: { ...current("cta"), primaryLabel: "Apply Online", primaryUrl: "https://admission.coeportal.edu.gh/" },
  };
  if (DRY) {
    report.updated.push(`settings: ${Object.keys(updates).join(", ")}`);
    return;
  }
  for (const [key, value] of Object.entries(updates)) {
    await db.execute(
      `INSERT INTO site_settings (setting_key, value, updated_by) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)`,
      [key, JSON.stringify(value), adminId],
    );
  }
  report.updated.push(`settings: ${Object.keys(updates).join(", ")}`);
}

// ---- Starter content the real data replaces --------------------------------------------

async function retireStarterContent() {
  if (DRY) return;
  await db.query("DELETE FROM posts WHERE slug IN ('welcome-to-our-new-website', 'using-the-downloads-page', 'orientation-for-new-students')");
  const keep = [...DEPARTMENTS, ...UNITS].map((d) => `${d.kind}:${d.slug}`);
  const all = await q<{ id: number; kind: string; slug: string }>(db, "SELECT id, kind, slug FROM departments");
  for (const d of all) if (!keep.includes(`${d.kind}:${d.slug}`)) await db.execute("DELETE FROM departments WHERE id = ?", [d.id]);
  await db.query("DELETE FROM people WHERE name LIKE '[%'");
  // Pages with no counterpart on the old site stay, as drafts, for review.
  await db.query(
    "UPDATE pages SET status = 'draft' WHERE (section, slug) IN (('admissions', 'entry-requirements'), ('alumni', 'alumni-association'))",
  );
  // How to Apply: the official portals from the old site's slider and header.
  const blocks = blocksSchema.parse([
    {
      id: id(),
      type: "richText",
      html: "<p>Admission to Akatsi College of Education is through the Colleges of Education online admission portal. Applications open once a year; watch our announcements for dates and the official admission notice.</p>",
    },
    {
      id: id(),
      type: "cards",
      title: "",
      intro: "",
      columns: 3,
      items: [
        { title: "Apply online", text: "Submit your application on the Colleges of Education admission portal.", imageUrl: "", url: "https://admission.coeportal.edu.gh/" },
        { title: "Check admission status", text: "Find out whether you have been offered admission.", imageUrl: "", url: "http://www.admissionsghana.com/" },
        { title: "Admission notices", text: "Fees, reporting dates and other notices for applicants.", imageUrl: "", url: "/announcements?category=Admissions" },
      ],
    },
    { id: id(), type: "documents", title: "Admission documents", intro: "", category: "admissions", limit: 10 },
  ]);
  await db.execute("UPDATE pages SET blocks = ?, body = NULL, summary = ? WHERE section = 'admissions' AND slug = 'how-to-apply'", [
    JSON.stringify(blocks),
    "Apply through the Colleges of Education admission portal.",
  ]);
}

// ---- Run --------------------------------------------------------------------------------

let adminId: number | null = null;

async function main() {
  console.log(`${DRY ? "[dry run] " : ""}Migrating WordPress → akaweb`);
  const [admin] = await q<{ id: number }>(db, "SELECT id FROM admins WHERE role = 'super_admin' AND is_active = 1 ORDER BY id LIMIT 1");
  adminId = admin?.id ?? null;
  media = new MediaPipe(db, UPLOADS, adminId);

  await loadAttachments();
  await loadTeams();

  // Featured images of the pages, departments and posts being migrated
  // (plus the Alumni page's, used as that section's banner).
  const pageIds = [...PAGES.map((p) => p.wp), ...DEPARTMENTS.flatMap((d) => d.wp), 29].filter((x): x is number => Boolean(x));
  const thumbs = await q<{ post_id: number; att: string; post_type: string }>(
    wp,
    `SELECT m.post_id, m.meta_value att, p.post_type FROM wp_postmeta m JOIN wp_posts p ON p.ID = m.post_id
     WHERE m.meta_key = '_thumbnail_id' AND p.post_status = 'publish'
       AND (p.ID IN (?) OR p.post_type IN ('news_and_events', 'notice_board'))`,
    [pageIds],
  );
  const heroes = new Map<number, string | null>();
  for (const t of thumbs) {
    const folder: Folder = t.post_type === "page" ? "pages" : t.post_type === "departments" ? "departments" : "posts";
    heroes.set(t.post_id, await attachmentUrl(Number(t.att), folder));
  }

  await retireStarterContent();
  for (const d of [...DEPARTMENTS, ...UNITS]) await migrateOrg(d, heroes);
  await migrateGroups();
  await migratePages(heroes);
  await migratePosts(heroes);
  await migrateDocuments();
  await migrateSpotlights();

  // The Principal's profile doubles as the home page welcome.
  const [principalRow] = await q<{ post_content: string }>(wp, "SELECT post_content FROM wp_posts WHERE ID = 15");
  const profile = toSegments(principalRow?.post_content ?? "").find((s) => s.kind === "profile");
  if (profile?.kind === "profile") {
    const firstPara = plainText(/<p>([\s\S]*?)<\/p>/.exec(profile.bioHtml)?.[1] ?? profile.bioHtml, 1200);
    await migrateSettings({
      name: "Dr. Felix Kwame Kumedzro",
      bio: firstPara,
      photo: await attachmentUrl(profile.imageId, "people"),
    });
  }

  // Section landing banners from the old pages' featured images.
  if (!DRY) {
    const [sections] = await q<{ value: Record<string, { intro: string; imageUrl: string }> }>(db, "SELECT value FROM site_settings WHERE setting_key = 'sections'");
    const value = { ...(sections?.value ?? {}) } as Record<string, { intro: string; imageUrl: string }>;
    const banner = { about: 17, academics: 21, "student-life": 32, alumni: 29 } as const;
    for (const [section, pageId] of Object.entries(banner)) {
      const previous = value[section] as { intro: string } | undefined;
      value[section] = { intro: previous ? previous.intro : "", imageUrl: heroes.get(pageId) ?? "" };
    }
    if (!("admissions" in value)) value.admissions = { intro: "", imageUrl: "" };
    await db.execute(
      "INSERT INTO site_settings (setting_key, value, updated_by) VALUES ('sections', ?, ?) ON DUPLICATE KEY UPDATE value = VALUES(value)",
      [JSON.stringify(value), adminId],
    );
    await db.execute("INSERT INTO activity_log (admin_id, action, entity, summary) VALUES (?, 'created', 'settings', ?)", [
      adminId,
      "Imported content from the WordPress site (akatsico_website)",
    ]);
  }

  console.log(`\nMedia: ${media.uploaded} uploaded to R2, ${media.reused} reused.`);
  if (media.missing.length) console.log(`Missing on the old site (skipped):\n  - ${media.missing.join("\n  - ")}`);
  console.log(`\nImported:\n  - ${[...report.created, ...report.updated].join("\n  - ")}`);
  if (report.notes.length) console.log(`\nReview:\n  - ${report.notes.join("\n  - ")}`);
  await db.end();
  await wp.end();
}

main().catch(async (err: unknown) => {
  console.error(err);
  await db.end();
  await wp.end();
  process.exit(1);
});
