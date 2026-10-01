// Read-only queries behind the public website. Server-only — reached through
// the server functions in server/public.ts, which import this dynamically so
// mysql2 never lands in the browser bundle.
import { getPool } from "@aka/db";
import type {
  DepartmentKind,
  DepartmentRow,
  DocumentRow,
  PageRow,
  PageSection,
  PersonRow,
  PostRow,
  PostType,
  SpotlightRow,
} from "@aka/db";
import type { RowDataPacket } from "mysql2";
import type { Block } from "#/lib/blocks";
import { blocksSchema } from "#/lib/blocks";
import { SECTIONS } from "#/lib/content";
import { documentsKey } from "#/lib/documents-key";
import { getAllSettings } from "./api/modules/settings/service.js";
import { plainText, toRichHtml } from "./api/lib/rich-text.js";
import { likePattern } from "./api/lib/query.js";

const pool = () => getPool();

async function rows<T>(sql: string, params: Array<unknown> = []): Promise<Array<T>> {
  const [result] = await pool().query<RowDataPacket[]>(sql, params);
  return result.map((r) => ({ ...r }) as T);
}

const LIVE_POST = "p.status = 'published' AND p.published_at <= NOW()";

export type PostCard = Pick<
  PostRow,
  | "id"
  | "type"
  | "slug"
  | "title"
  | "excerpt"
  | "cover_image_url"
  | "category"
  | "is_featured"
  | "is_pinned"
  | "published_at"
  | "event_start"
  | "event_end"
  | "venue"
  | "expires_on"
>;

const CARD_COLUMNS =
  "p.id, p.type, p.slug, p.title, COALESCE(p.excerpt, '') AS excerpt, p.cover_image_url, p.category, p.is_featured, p.is_pinned, p.published_at, p.event_start, p.event_end, p.venue, p.expires_on";

export type HeroSlide = SpotlightRow & { image_width: number | null; image_height: number | null };

export interface NavGroup {
  section: PageSection;
  label: string;
  path: string;
  items: Array<{ title: string; href: string; summary: string | null }>;
}

// ---- Layout --------------------------------------------------------------

export async function getLayout() {
  const [settings, navPages] = await Promise.all([
    getAllSettings(),
    rows<Pick<PageRow, "section" | "slug" | "title" | "summary">>(
      `SELECT section, slug, title, summary FROM pages
       WHERE status = 'published' AND show_in_nav = 1 ORDER BY sort_order, title`,
    ),
  ]);
  const nav: Array<NavGroup> = SECTIONS.map((s) => ({
    section: s.key,
    label: s.label,
    path: s.path,
    items: navPages
      .filter((p) => p.section === s.key)
      .map((p) => ({ title: p.title, href: `${s.path}/${p.slug}`, summary: p.summary })),
  }));
  const today = new Date().toISOString().slice(0, 10);
  const notice = settings.notice.enabled && settings.notice.title && (!settings.notice.expiresOn || settings.notice.expiresOn >= today)
    ? settings.notice
    : null;
  return { settings, nav, notice };
}

// ---- Home ----------------------------------------------------------------

export async function getHome() {
  const [spotlights, news, announcements, upcoming, departments, studentLife, documents] = await Promise.all([
    // Image dimensions come from the media library, so the carousel can
    // fit each slide's picture to its proportions.
    rows<HeroSlide>(
      `SELECT s.*, a.width AS image_width, a.height AS image_height FROM spotlights s
       LEFT JOIN media_assets a ON a.url = s.image_url
       WHERE s.is_active = 1
         AND (s.starts_on IS NULL OR s.starts_on <= CURDATE()) AND (s.ends_on IS NULL OR s.ends_on >= CURDATE())
       ORDER BY s.sort_order, s.id DESC LIMIT 8`,
    ),
    rows<PostCard>(
      `SELECT ${CARD_COLUMNS} FROM posts p WHERE p.type = 'news' AND ${LIVE_POST}
       ORDER BY p.is_featured DESC, p.published_at DESC LIMIT 5`,
    ),
    rows<PostCard>(
      `SELECT ${CARD_COLUMNS} FROM posts p WHERE p.type = 'announcement' AND ${LIVE_POST}
         AND (p.expires_on IS NULL OR p.expires_on >= CURDATE())
       ORDER BY p.is_pinned DESC, p.published_at DESC LIMIT 4`,
    ),
    rows<PostCard>(
      `SELECT ${CARD_COLUMNS} FROM posts p WHERE p.type = 'event' AND ${LIVE_POST}
         AND COALESCE(p.event_end, p.event_start) >= NOW()
       ORDER BY p.event_start LIMIT 4`,
    ),
    rows<Pick<DepartmentRow, "id" | "slug" | "name" | "summary" | "image_url" | "kind">>(
      `SELECT id, slug, name, summary, image_url, kind FROM departments
       WHERE is_published = 1 AND kind = 'department' ORDER BY sort_order, name LIMIT 8`,
    ),
    rows<Pick<PageRow, "slug" | "title" | "summary" | "hero_image_url">>(
      `SELECT slug, title, summary, hero_image_url FROM pages
       WHERE status = 'published' AND section = 'student-life' ORDER BY sort_order, title LIMIT 4`,
    ),
    rows<DocumentRow>(
      `SELECT * FROM documents WHERE is_published = 1 ORDER BY published_on DESC, id DESC LIMIT 5`,
    ),
  ]);

  // No upcoming events? Show the most recent ones instead of an empty band.
  const events = upcoming.length
    ? upcoming
    : await rows<PostCard>(
        `SELECT ${CARD_COLUMNS} FROM posts p WHERE p.type = 'event' AND ${LIVE_POST} ORDER BY p.event_start DESC LIMIT 3`,
      );

  return { spotlights, news, announcements, events, eventsAreUpcoming: upcoming.length > 0, departments, studentLife, documents };
}

// ---- Sections & pages ----------------------------------------------------

export async function getSection(section: PageSection) {
  const pages = await rows<Pick<PageRow, "id" | "slug" | "title" | "summary" | "hero_image_url">>(
    `SELECT id, slug, title, summary, hero_image_url FROM pages
     WHERE status = 'published' AND section = ? ORDER BY sort_order, title`,
    [section],
  );
  return { pages };
}

export interface ResolvedBlockData {
  people: Record<string, Array<PersonRow & { department_name: string | null }>>;
  departments: Record<string, Array<Pick<DepartmentRow, "id" | "kind" | "slug" | "name" | "summary" | "image_url" | "head_name" | "head_title">>>;
  documents: Record<string, Array<DocumentRow>>;
}

// Fetches what the directory-style blocks (people, departments, downloads)
// need, once per distinct group/kind/category on the page.
async function resolveBlocks(blocks: Array<Block>): Promise<ResolvedBlockData> {
  const data: ResolvedBlockData = { people: {}, departments: {}, documents: {} };
  const tasks: Array<Promise<void>> = [];
  for (const block of blocks) {
    if (block.type === "people" && !(block.group in data.people)) {
      data.people[block.group] = [];
      tasks.push(
        rows<PersonRow & { department_name: string | null }>(
          `SELECT p.*, d.name AS department_name FROM people p LEFT JOIN departments d ON d.id = p.department_id
           WHERE p.group_key = ? AND p.is_active = 1 ORDER BY p.sort_order, p.name`,
          [block.group],
        ).then((r) => {
          data.people[block.group] = r;
        }),
      );
    }
    if (block.type === "departments" && !(block.kind in data.departments)) {
      data.departments[block.kind] = [];
      tasks.push(
        rows<ResolvedBlockData["departments"][string][number]>(
          `SELECT id, kind, slug, name, summary, image_url, head_name, head_title FROM departments
           WHERE kind = ? AND is_published = 1 ORDER BY sort_order, name`,
          [block.kind],
        ).then((r) => {
          data.departments[block.kind] = r;
        }),
      );
    }
    if (block.type === "documents") {
      const key = documentsKey(block.category, block.limit);
      if (key in data.documents) continue;
      data.documents[key] = [];
      tasks.push(
        rows<DocumentRow>(
          `SELECT * FROM documents WHERE is_published = 1 ${block.category ? "AND category = ?" : ""}
           ORDER BY published_on DESC, id DESC LIMIT ?`,
          block.category ? [block.category, block.limit] : [block.limit],
        ).then((r) => {
          data.documents[key] = r;
        }),
      );
    }
  }
  await Promise.all(tasks);
  return data;
}

export async function getPage(section: PageSection, slug: string, preview = false) {
  const [page] = await rows<PageRow>(
    `SELECT * FROM pages WHERE section = ? AND slug = ? ${preview ? "" : "AND status = 'published'"}`,
    [section, slug],
  );
  if (!page) return null;
  // Stored blocks are re-validated so a hand-edited row can't break the page.
  const parsed = blocksSchema.safeParse(page.blocks ?? []);
  const blocks = parsed.success ? parsed.data : [];
  const [siblings, resolved] = await Promise.all([
    rows<Pick<PageRow, "slug" | "title">>(
      `SELECT slug, title FROM pages WHERE section = ? AND status = 'published' ORDER BY sort_order, title`,
      [section],
    ),
    resolveBlocks(blocks),
  ]);
  return { page: { ...page, body: toRichHtml(page.body), blocks }, siblings, resolved };
}

// ---- Posts ---------------------------------------------------------------

export interface PostListQuery {
  type: PostType;
  page: number;
  category?: string;
  q?: string;
  when?: "upcoming" | "past";
}

export const POSTS_PAGE_SIZE = 9;

export async function listPosts(query: PostListQuery) {
  const where = ["p.type = ?", LIVE_POST];
  const params: Array<unknown> = [query.type];
  if (query.category) {
    where.push("p.category = ?");
    params.push(query.category);
  }
  if (query.q) {
    where.push("(p.title LIKE ? OR p.excerpt LIKE ? OR p.body LIKE ?)");
    params.push(likePattern(query.q), likePattern(query.q), likePattern(query.q));
  }
  let order = "p.is_pinned DESC, p.published_at DESC, p.id DESC";
  if (query.type === "event") {
    if (query.when === "past") {
      where.push("COALESCE(p.event_end, p.event_start) < NOW()");
      order = "p.event_start DESC";
    } else {
      where.push("COALESCE(p.event_end, p.event_start) >= NOW()");
      order = "p.event_start ASC";
    }
  }
  const clause = where.join(" AND ");
  const offset = (query.page - 1) * POSTS_PAGE_SIZE;
  const [items, [count], categories] = await Promise.all([
    rows<PostCard>(`SELECT ${CARD_COLUMNS} FROM posts p WHERE ${clause} ORDER BY ${order} LIMIT ? OFFSET ?`, [
      ...params,
      POSTS_PAGE_SIZE,
      offset,
    ]),
    rows<{ n: number }>(`SELECT COUNT(*) AS n FROM posts p WHERE ${clause}`, params),
    rows<{ category: string; n: number }>(
      `SELECT p.category, COUNT(*) AS n FROM posts p WHERE p.type = ? AND ${LIVE_POST} AND p.category IS NOT NULL
       GROUP BY p.category ORDER BY n DESC`,
      [query.type],
    ),
  ]);
  return {
    items,
    total: Number(count?.n ?? 0),
    pageSize: POSTS_PAGE_SIZE,
    categories: categories.map((c) => ({ name: c.category, count: Number(c.n) })),
  };
}

export async function getPost(type: PostType, slug: string) {
  const [post] = await rows<PostRow & { author_name: string | null }>(
    `SELECT p.*, a.full_name AS author_name FROM posts p LEFT JOIN admins a ON a.id = p.author_id
     WHERE p.type = ? AND p.slug = ? AND ${LIVE_POST}`,
    [type, slug],
  );
  if (!post) return null;
  void pool()
    .execute("UPDATE posts SET view_count = view_count + 1 WHERE id = ?", [post.id])
    .catch(() => undefined);
  const related = await rows<PostCard>(
    `SELECT ${CARD_COLUMNS} FROM posts p WHERE p.type = ? AND p.id <> ? AND ${LIVE_POST}
     ORDER BY (p.category <=> ?) DESC, p.published_at DESC LIMIT 3`,
    [type, post.id, post.category],
  );
  return {
    post: { ...post, body: toRichHtml(post.body), tags: post.tags ?? [], description: post.excerpt || plainText(post.body, 160) },
    related,
  };
}

// ---- Documents -----------------------------------------------------------

export const DOCUMENTS_PAGE_SIZE = 15;

export async function listDocuments(query: { page: number; category?: string; q?: string }) {
  const where = ["is_published = 1"];
  const params: Array<unknown> = [];
  if (query.category) {
    where.push("category = ?");
    params.push(query.category);
  }
  if (query.q) {
    where.push("(title LIKE ? OR description LIKE ?)");
    params.push(likePattern(query.q), likePattern(query.q));
  }
  const clause = where.join(" AND ");
  const [items, [count], categories] = await Promise.all([
    rows<DocumentRow>(`SELECT * FROM documents WHERE ${clause} ORDER BY published_on DESC, id DESC LIMIT ? OFFSET ?`, [
      ...params,
      DOCUMENTS_PAGE_SIZE,
      (query.page - 1) * DOCUMENTS_PAGE_SIZE,
    ]),
    rows<{ n: number }>(`SELECT COUNT(*) AS n FROM documents WHERE ${clause}`, params),
    rows<{ category: string; n: number }>(
      "SELECT category, COUNT(*) AS n FROM documents WHERE is_published = 1 GROUP BY category",
    ),
  ]);
  return {
    items,
    total: Number(count?.n ?? 0),
    pageSize: DOCUMENTS_PAGE_SIZE,
    categories: Object.fromEntries(categories.map((c) => [c.category, Number(c.n)])) as Record<string, number>,
  };
}

// ---- Departments ---------------------------------------------------------

export async function getDepartment(kind: DepartmentKind, slug: string) {
  const [department] = await rows<DepartmentRow>(
    "SELECT * FROM departments WHERE kind = ? AND slug = ? AND is_published = 1",
    [kind, slug],
  );
  if (!department) return null;
  const [people, siblings] = await Promise.all([
    rows<PersonRow>(
      "SELECT * FROM people WHERE department_id = ? AND is_active = 1 ORDER BY sort_order, name",
      [department.id],
    ),
    rows<Pick<DepartmentRow, "slug" | "name">>(
      "SELECT slug, name FROM departments WHERE kind = ? AND is_published = 1 ORDER BY sort_order, name",
      [kind],
    ),
  ]);
  return {
    department: { ...department, body: toRichHtml(department.body), programmes: department.programmes ?? [] },
    people,
    siblings,
  };
}

// ---- Search --------------------------------------------------------------

export interface SearchResult {
  kind: "Page" | "News" | "Event" | "Announcement" | "Department" | "Unit" | "Download";
  title: string;
  href: string;
  snippet: string;
  date: string | null;
}

export async function search(term: string): Promise<Array<SearchResult>> {
  const q = term.trim();
  if (q.length < 2) return [];
  const like = likePattern(q);
  const sectionPath = (key: string) => SECTIONS.find((s) => s.key === key)?.path ?? "/";
  const postPath = { news: "/news", event: "/events", announcement: "/announcements" } as const;
  const postKind = { news: "News", event: "Event", announcement: "Announcement" } as const;

  const [pages, posts, depts, docs] = await Promise.all([
    rows<Pick<PageRow, "section" | "slug" | "title" | "summary" | "body">>(
      `SELECT section, slug, title, summary, body FROM pages WHERE status = 'published'
         AND (title LIKE ? OR summary LIKE ? OR body LIKE ? OR CAST(blocks AS CHAR) LIKE ?)
       ORDER BY (title LIKE ?) DESC, title LIMIT 15`,
      [like, like, like, like, like],
    ),
    rows<PostRow>(
      `SELECT p.* FROM posts p WHERE ${LIVE_POST} AND (p.title LIKE ? OR p.excerpt LIKE ? OR p.body LIKE ?)
       ORDER BY (p.title LIKE ?) DESC, p.published_at DESC LIMIT 20`,
      [like, like, like, like],
    ),
    rows<DepartmentRow>(
      `SELECT * FROM departments WHERE is_published = 1 AND (name LIKE ? OR summary LIKE ? OR body LIKE ?)
       ORDER BY name LIMIT 10`,
      [like, like, like],
    ),
    rows<DocumentRow>(
      `SELECT * FROM documents WHERE is_published = 1 AND (title LIKE ? OR description LIKE ?)
       ORDER BY published_on DESC LIMIT 10`,
      [like, like],
    ),
  ]);

  return [
    ...pages.map((p) => ({
      kind: "Page" as const,
      title: p.title,
      href: `${sectionPath(p.section)}/${p.slug}`,
      snippet: p.summary ?? plainText(p.body, 180),
      date: null,
    })),
    ...depts.map((d) => ({
      kind: d.kind === "unit" ? ("Unit" as const) : ("Department" as const),
      title: d.name,
      href: `/academics/${d.kind === "unit" ? "units" : "departments"}/${d.slug}`,
      snippet: d.summary ?? plainText(d.body, 180),
      date: null,
    })),
    ...posts.map((p) => ({
      kind: postKind[p.type],
      title: p.title,
      href: `${postPath[p.type]}/${p.slug}`,
      snippet: p.excerpt ?? plainText(p.body, 180),
      date: p.type === "event" ? p.event_start : p.published_at,
    })),
    ...docs.map((d) => ({
      kind: "Download" as const,
      title: d.title,
      href: `/api/public/documents/${d.id}/download`,
      snippet: d.description ?? "",
      date: d.published_on,
    })),
  ];
}
