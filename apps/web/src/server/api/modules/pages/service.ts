import { getPool } from "@aka/db";
import type { PageRow } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import { deleteRow, findById, insertRow, reorderRows, updateRow } from "../../lib/columns.js";
import { slugify, uniqueSlug } from "../../lib/slug.js";
import { logActivity } from "../../lib/activity.js";
import { toRichHtml } from "../../lib/rich-text.js";
import type { createPageSchema, updatePageSchema } from "./route.js";

const FIELDS = {
  section: "section",
  slug: "slug",
  title: "title",
  summary: "summary",
  heroImageUrl: "hero_image_url",
  body: "body",
  blocks: "blocks",
  status: "status",
  showInNav: "show_in_nav",
  sortOrder: "sort_order",
  seoTitle: "seo_title",
  seoDescription: "seo_description",
};

export async function listPages() {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT p.id, p.section, p.slug, p.title, p.summary, p.hero_image_url, p.status, p.show_in_nav,
            p.sort_order, p.published_at, p.updated_at, COALESCE(JSON_LENGTH(p.blocks), 0) AS block_count,
            a.full_name AS updated_by_name
     FROM pages p LEFT JOIN admins a ON a.id = p.updated_by
     ORDER BY FIELD(p.section, 'about', 'academics', 'admissions', 'student-life', 'alumni'), p.sort_order, p.title`,
  );
  return rows;
}

export async function getPage(id: number) {
  const page = await findById<PageRow>("pages", id, "Page");
  return { ...page, body: toRichHtml(page.body), blocks: page.blocks ?? [] };
}

async function resolveSlug(
  section: string,
  title: string,
  slug: string | undefined,
  excludeId?: number,
) {
  if (!slug) return uniqueSlug("pages", title, { column: "section", value: section }, excludeId);
  const free = await uniqueSlug("pages", slug, { column: "section", value: section }, excludeId);
  if (free !== slugify(slug))
    throw new AppError(`Another page in this section already uses the address “${slug}”.`, 409);
  return free;
}

export async function createPage(adminId: number, input: z.infer<typeof createPageSchema>) {
  const slug = await resolveSlug(input.section, input.title, input.slug);
  const extra: Record<string, string | number | null> = {
    created_by: adminId,
    updated_by: adminId,
  };
  if (input.status === "published") extra.published_at = sqlNow();
  const id = await insertRow("pages", { blocks: [], ...input, slug }, FIELDS, extra);
  logActivity(
    adminId,
    input.status === "published" ? "published" : "created",
    "page",
    id,
    `Created page “${input.title}”`,
  );
  return getPage(id);
}

export async function updatePage(
  adminId: number,
  id: number,
  input: z.infer<typeof updatePageSchema>,
) {
  const current = await findById<PageRow>("pages", id, "Page");
  const section = input.section ?? current.section;
  const patch = { ...input };
  if (input.slug !== undefined || input.section !== undefined) {
    patch.slug = await resolveSlug(
      section,
      input.title ?? current.title,
      input.slug || current.slug,
      id,
    );
  }
  const extra: Record<string, string | number | null> = { updated_by: adminId };
  const publishing = input.status === "published" && current.status !== "published";
  if (publishing && !current.published_at) extra.published_at = sqlNow();
  await updateRow("pages", id, patch, FIELDS, extra);
  logActivity(
    adminId,
    publishing ? "published" : "updated",
    "page",
    id,
    `${publishing ? "Published" : "Updated"} page “${input.title ?? current.title}”`,
  );
  return getPage(id);
}

export async function duplicatePage(adminId: number, id: number) {
  const page = await getPage(id);
  return createPage(adminId, {
    section: page.section,
    title: `${page.title} (copy)`,
    slug: "",
    summary: page.summary,
    heroImageUrl: page.hero_image_url,
    body: page.body,
    blocks: page.blocks as never,
    status: "draft",
    showInNav: false,
    sortOrder: page.sort_order + 1,
    seoTitle: page.seo_title,
    seoDescription: page.seo_description,
  });
}

export async function reorderPages(adminId: number, ids: Array<number>) {
  await reorderRows("pages", ids);
  logActivity(adminId, "reordered", "page", null, `Reordered ${ids.length} pages`);
}

export async function deletePage(adminId: number, id: number) {
  const page = await findById<PageRow>("pages", id, "Page");
  await deleteRow("pages", id, "Page");
  logActivity(adminId, "deleted", "page", id, `Deleted page “${page.title}”`);
}

export function sqlNow() {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}
