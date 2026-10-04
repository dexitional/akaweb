import { getPool } from "@aka/db";
import type { PostRow } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import type { z } from "zod";
import { canPublishPosts } from "#/lib/permissions";
import type { AdminSessionUser } from "#/server/session-core";
import { AppError } from "../../middleware/error-handler.js";
import { deleteRow, findById, insertRow, updateRow } from "../../lib/columns.js";
import { slugify, uniqueSlug } from "../../lib/slug.js";
import { logActivity } from "../../lib/activity.js";
import { notifyPostPublished } from "../../lib/push.js";
import { likePattern, paging } from "../../lib/query.js";
import { toRichHtml } from "../../lib/rich-text.js";
import { postProblems } from "./route.js";
import type { createPostSchema, updatePostSchema } from "./route.js";

const FIELDS = {
  type: "type",
  slug: "slug",
  title: "title",
  excerpt: "excerpt",
  body: "body",
  coverImageUrl: "cover_image_url",
  category: "category",
  tags: "tags",
  isFeatured: "is_featured",
  isPinned: "is_pinned",
  status: "status",
  publishedAt: "published_at",
  eventStart: "event_start",
  eventEnd: "event_end",
  venue: "venue",
  registrationUrl: "registration_url",
  attachmentUrl: "attachment_url",
  expiresOn: "expires_on",
};

const LABELS = { news: "news story", event: "event", announcement: "announcement" } as const;

export async function listPosts(
  admin: AdminSessionUser,
  q: { page: number; pageSize: number; q?: string; type?: string; status?: string; mine?: "1" },
) {
  const where: Array<string> = [];
  const params: Array<string | number> = [];
  if (q.type) {
    where.push("p.type = ?");
    params.push(q.type);
  }
  if (q.status) {
    where.push("p.status = ?");
    params.push(q.status);
  }
  if (q.mine || !canPublishPosts(admin.role)) {
    where.push("p.author_id = ?");
    params.push(admin.id);
  }
  if (q.q) {
    where.push("(p.title LIKE ? OR p.category LIKE ? OR p.venue LIKE ?)");
    params.push(likePattern(q.q), likePattern(q.q), likePattern(q.q));
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { limit, offset } = paging(q.page, q.pageSize);
  const pool = getPool();
  const [[rows], [countRows], [statusRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT p.id, p.type, p.slug, p.title, p.excerpt, p.cover_image_url, p.category, p.is_featured, p.is_pinned,
              p.status, p.published_at, p.event_start, p.event_end, p.venue, p.view_count, p.updated_at,
              p.author_id, a.full_name AS author_name
       FROM posts p LEFT JOIN admins a ON a.id = p.author_id
       ${clause}
       ORDER BY (p.type = 'event' AND p.event_start >= NOW()) DESC,
                CASE WHEN p.type = 'event' AND p.event_start >= NOW() THEN p.event_start END ASC,
                p.published_at DESC, p.id DESC
       LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ),
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM posts p ${clause}`, params),
    pool.query<RowDataPacket[]>(
      `SELECT type, status, COUNT(*) AS n FROM posts ${canPublishPosts(admin.role) ? "" : "WHERE author_id = ?"} GROUP BY type, status`,
      canPublishPosts(admin.role) ? [] : [admin.id],
    ),
  ]);
  return {
    items: rows,
    total: Number(countRows[0]?.n ?? 0),
    counts: statusRows.map((r) => ({
      type: r.type as string,
      status: r.status as string,
      n: Number(r.n),
    })),
  };
}

export async function getPost(id: number) {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    `SELECT p.*, a.full_name AS author_name FROM posts p LEFT JOIN admins a ON a.id = p.author_id WHERE p.id = ?`,
    [id],
  );
  if (!rows[0]) throw new AppError("Post not found.", 404);
  const post = { ...rows[0] } as PostRow & { author_name: string | null };
  return { ...post, body: toRichHtml(post.body), tags: post.tags ?? [] };
}

// Authors only ever save drafts of their own posts; an editor publishes.
function assertCanEdit(admin: AdminSessionUser, post: Pick<PostRow, "author_id" | "status">) {
  if (canPublishPosts(admin.role)) return;
  if (post.author_id !== admin.id) throw new AppError("You can only edit your own posts.", 403);
  if (post.status !== "draft")
    throw new AppError("This post has been published — ask an editor to change it.", 403);
}

async function resolveSlug(
  type: string,
  title: string,
  slug: string | undefined,
  excludeId?: number,
) {
  if (!slug) return uniqueSlug("posts", title, { column: "type", value: type }, excludeId);
  const free = await uniqueSlug("posts", slug, { column: "type", value: type }, excludeId);
  if (free !== slugify(slug))
    throw new AppError(`Another ${type} already uses the address “${slug}”.`, 409);
  return free;
}

export async function createPost(admin: AdminSessionUser, input: z.infer<typeof createPostSchema>) {
  const publisher = canPublishPosts(admin.role);
  const status = publisher ? (input.status ?? "draft") : "draft";
  const slug = await resolveSlug(input.type, input.title, input.slug);
  // Featuring and pinning are editorial decisions, like publishing.
  const flags = publisher ? {} : { isFeatured: false, isPinned: false };
  const id = await insertRow("posts", { ...input, ...flags, slug, status }, FIELDS, {
    author_id: admin.id,
    updated_by: admin.id,
  });
  logActivity(
    admin.id,
    status === "published" ? "published" : "created",
    "post",
    id,
    `Created ${LABELS[input.type]} “${input.title}”`,
  );
  // Notify app users once it's live (scheduled posts are picked up by the
  // push sweeper when their published_at arrives). Never blocks the save.
  if (status === "published") void notifyPostPublished(id).catch((err) => console.error("push:", err));
  return getPost(id);
}

export async function updatePost(
  admin: AdminSessionUser,
  id: number,
  input: z.infer<typeof updatePostSchema>,
) {
  const current = await findById<PostRow>("posts", id, "Post");
  assertCanEdit(admin, current);

  const problem = postProblems({
    type: current.type,
    eventStart: input.eventStart === undefined ? current.event_start : input.eventStart,
    eventEnd: input.eventEnd === undefined ? current.event_end : input.eventEnd,
  })[0];
  if (problem) throw new AppError(problem.message, 422);

  const patch = { ...input };
  if (!canPublishPosts(admin.role)) {
    patch.status = "draft";
    delete patch.isFeatured;
    delete patch.isPinned;
  }
  if (input.slug !== undefined)
    patch.slug = await resolveSlug(current.type, input.title ?? current.title, input.slug, id);

  await updateRow("posts", id, patch, FIELDS, { updated_by: admin.id });
  const publishing = patch.status === "published" && current.status !== "published";
  logActivity(
    admin.id,
    publishing ? "published" : "updated",
    "post",
    id,
    `${publishing ? "Published" : "Updated"} ${LABELS[current.type]} “${input.title ?? current.title}”`,
  );
  if (publishing) void notifyPostPublished(id).catch((err) => console.error("push:", err));
  return getPost(id);
}

export async function deletePost(admin: AdminSessionUser, id: number) {
  const current = await findById<PostRow>("posts", id, "Post");
  assertCanEdit(admin, current);
  await deleteRow("posts", id, "Post");
  logActivity(
    admin.id,
    "deleted",
    "post",
    id,
    `Deleted ${LABELS[current.type]} “${current.title}”`,
  );
}
