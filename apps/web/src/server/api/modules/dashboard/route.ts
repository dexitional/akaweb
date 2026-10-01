import { Hono } from "hono";
import { getPool } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { canPublishPosts, canView } from "#/lib/permissions";
import { requirePermission } from "../../middleware/require-auth.js";

export const dashboardRoute = new Hono().get(
  "/",
  requirePermission("dashboard", "view"),
  async (c) => {
    const admin = c.get("admin");
    const pool = getPool();
    const one = (sql: string, params: Array<string | number> = []) =>
      pool.query<RowDataPacket[]>(sql, params).then(([rows]) => Number(rows[0]?.n ?? 0));
    const many = (sql: string, params: Array<string | number> = []) =>
      pool.query<RowDataPacket[]>(sql, params).then(([rows]) => rows);
    const own = canPublishPosts(admin.role) ? "" : "AND author_id = ?";
    const ownParams = canPublishPosts(admin.role) ? [] : [admin.id];

    const [
      pages,
      publishedPosts,
      draftPosts,
      upcomingEvents,
      documents,
      media,
      newMessages,
      totalDownloads,
      recentPosts,
      drafts,
      messages,
      activity,
      topPosts,
    ] = await Promise.all([
      one("SELECT COUNT(*) AS n FROM pages WHERE status = 'published'"),
      one(`SELECT COUNT(*) AS n FROM posts WHERE status = 'published' ${own}`, ownParams),
      one(`SELECT COUNT(*) AS n FROM posts WHERE status = 'draft' ${own}`, ownParams),
      one(
        "SELECT COUNT(*) AS n FROM posts WHERE type = 'event' AND status = 'published' AND event_start >= NOW()",
      ),
      one("SELECT COUNT(*) AS n FROM documents WHERE is_published = 1"),
      one("SELECT COUNT(*) AS n FROM media_assets"),
      canView(admin.role, "messages")
        ? one("SELECT COUNT(*) AS n FROM contact_messages WHERE status = 'new'")
        : 0,
      one("SELECT COALESCE(SUM(download_count), 0) AS n FROM documents"),
      many(
        `SELECT id, type, title, status, published_at, updated_at FROM posts WHERE 1 = 1 ${own}
       ORDER BY updated_at DESC LIMIT 6`,
        ownParams,
      ),
      many(
        `SELECT p.id, p.type, p.title, p.updated_at, a.full_name AS author_name FROM posts p
       LEFT JOIN admins a ON a.id = p.author_id WHERE p.status = 'draft' ${own.replace("author_id", "p.author_id")}
       ORDER BY p.updated_at DESC LIMIT 5`,
        ownParams,
      ),
      canView(admin.role, "messages")
        ? many(
            "SELECT id, name, subject, created_at FROM contact_messages WHERE status = 'new' ORDER BY created_at DESC LIMIT 5",
          )
        : Promise.resolve([]),
      canView(admin.role, "activity")
        ? many(
            `SELECT l.id, l.action, l.entity, l.summary, l.created_at, a.full_name AS admin_name
           FROM activity_log l LEFT JOIN admins a ON a.id = l.admin_id ORDER BY l.created_at DESC LIMIT 8`,
          )
        : Promise.resolve([]),
      many(
        "SELECT id, type, title, view_count FROM posts WHERE status = 'published' ORDER BY view_count DESC LIMIT 5",
      ),
    ]);

    return c.json({
      counts: {
        pages,
        publishedPosts,
        draftPosts,
        upcomingEvents,
        documents,
        media,
        newMessages,
        totalDownloads,
      },
      recentPosts,
      drafts,
      messages,
      activity,
      topPosts,
    });
  },
);
