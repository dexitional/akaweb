import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { z } from "zod";
import { getPool } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { AppError } from "../../middleware/error-handler.js";
import { idParam } from "../../lib/query.js";
import { validate } from "../../lib/validate.js";
import { AUDIENCES, PUSH_TOPICS, devicesFor, sendPush, startPushSweeper } from "../../lib/push.js";

// Public endpoints that need a real HTTP response (redirects, JSON for the
// AKATSICO student mobile app), rather than a server function.

startPushSweeper();

const postType = z.enum(["news", "event", "announcement"]);
const topicEnum = z.enum(PUSH_TOPICS as [string, ...Array<string>]);

const feedQuery = z.object({
  type: z.union([postType, z.literal("all")]).catch("all"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
  q: z.string().max(100).optional().catch(undefined),
  category: z.string().max(80).optional().catch(undefined),
});

const deviceSchema = z.object({
  token: z.string().regex(/^(Exponent|Expo)PushToken\[[A-Za-z0-9_-]{10,200}\]$/, "Invalid Expo push token"),
  platform: z.enum(["ios", "android", "web"]).optional(),
  studentId: z.string().max(64).nullable().optional(),
  audiences: z.array(z.enum(AUDIENCES)).max(AUDIENCES.length).optional(),
  topics: z.array(topicEnum).max(PUSH_TOPICS.length).optional(),
  appVersion: z.string().max(32).optional(),
});

const broadcastSchema = z.object({
  topic: topicEnum.default("circular"),
  audience: z.enum(AUDIENCES).optional(),
  title: z.string().min(1).max(120),
  body: z.string().max(400).default(""),
  data: z.record(z.string(), z.unknown()).default({}),
});

const secretOk = (given: string | undefined) => {
  const expected = process.env.PUSH_BROADCAST_SECRET;
  if (!expected || !given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export const publicRoute = new Hono()
  .get("/documents/:id/download", async (c) => {
    const id = idParam(c.req.param("id"));
    const pool = getPool();
    const [rows] = await pool.execute<RowDataPacket[]>(
      "SELECT file_url FROM documents WHERE id = ? AND is_published = 1",
      [id],
    );
    const doc = rows[0];
    if (!doc) throw new AppError("Document not found.", 404);
    void pool
      .execute("UPDATE documents SET download_count = download_count + 1 WHERE id = ?", [id])
      .catch((err: unknown) => console.error("Failed to count download:", err));
    return c.redirect(doc.file_url as string, 302);
  })

  // ---- Student app feed ---------------------------------------------------
  // Same live posts as the public site (content.ts). type=all merges the three
  // post types newest-first for the app's home/news feed.
  .get("/feed", async (c) => {
    const q = feedQuery.parse(c.req.query());
    const { listPosts, POSTS_PAGE_SIZE } = await import("../../../content.js");
    if (q.type !== "all") {
      const res = await listPosts({ type: q.type, page: q.page, q: q.q, category: q.category });
      return c.json({ ...res, page: q.page });
    }
    const pool = getPool();
    const offset = (q.page - 1) * POSTS_PAGE_SIZE;
    const live = "p.status = 'published' AND p.published_at <= NOW()";
    const search = q.q ? " AND (p.title LIKE ? OR p.excerpt LIKE ?)" : "";
    const params = q.q ? [`%${q.q}%`, `%${q.q}%`] : [];
    const [items] = await pool.query<RowDataPacket[]>(
      `SELECT p.id, p.type, p.slug, p.title, COALESCE(p.excerpt, '') AS excerpt, p.cover_image_url, p.category,
              p.is_featured, p.is_pinned, p.published_at, p.event_start, p.event_end, p.venue
         FROM posts p WHERE ${live}${search} ORDER BY p.published_at DESC, p.id DESC LIMIT ? OFFSET ?`,
      [...params, POSTS_PAGE_SIZE, offset],
    );
    const [countRows] = await pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM posts p WHERE ${live}${search}`, params);
    return c.json({ items, total: Number(countRows[0]?.n ?? 0), pageSize: POSTS_PAGE_SIZE, page: q.page, categories: [] });
  })
  .get("/feed/:type/:slug", async (c) => {
    const type = postType.safeParse(c.req.param("type"));
    if (!type.success) throw new AppError("Unknown post type.", 404);
    const { getPost } = await import("../../../content.js");
    const result = await getPost(type.data, c.req.param("slug").slice(0, 200));
    if (!result) throw new AppError("Post not found.", 404);
    return c.json(result);
  })

  // ---- Push notification devices -----------------------------------------
  .post("/devices", validate("json", deviceSchema), async (c) => {
    const d = c.req.valid("json");
    await getPool().execute(
      `INSERT INTO push_devices (token, platform, student_id, audiences, topics, app_version, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW())
       ON DUPLICATE KEY UPDATE platform = VALUES(platform), student_id = VALUES(student_id),
         audiences = VALUES(audiences), topics = VALUES(topics), app_version = VALUES(app_version), last_seen_at = NOW()`,
      [
        d.token,
        d.platform ?? null,
        d.studentId ?? null,
        JSON.stringify(d.audiences ?? []),
        JSON.stringify(d.topics ?? PUSH_TOPICS),
        d.appVersion ?? null,
      ],
    );
    return c.json({ ok: true });
  })
  .delete("/devices/:token", async (c) => {
    await getPool().execute("DELETE FROM push_devices WHERE token = ?", [c.req.param("token").slice(0, 255)]);
    return c.json({ ok: true });
  })

  // ---- Broadcast (umsk circulars) ------------------------------------------
  // Server-to-server only: requires the shared PUSH_BROADCAST_SECRET.
  .post("/push/broadcast", validate("json", broadcastSchema), async (c) => {
    if (!secretOk(c.req.header("x-push-secret"))) throw new AppError("Forbidden.", 403);
    const b = c.req.valid("json");
    const tokens = await devicesFor(b.topic as (typeof PUSH_TOPICS)[number], b.audience);
    const result = await sendPush(tokens, { title: b.title, body: b.body, data: { kind: b.topic, ...b.data } });
    return c.json(result);
  });
