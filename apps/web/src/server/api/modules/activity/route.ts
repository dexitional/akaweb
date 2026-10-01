import { Hono } from "hono";
import { z } from "zod";
import { getPool } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { requirePermission } from "../../middleware/require-auth.js";
import { pageQuerySchema, paging } from "../../lib/query.js";

const listQuerySchema = pageQuerySchema.extend({
  entity: z.string().max(40).optional().catch(undefined),
});

export const activityRoute = new Hono().get(
  "/",
  requirePermission("activity", "view"),
  async (c) => {
    const q = listQuerySchema.parse(c.req.query());
    const clause = q.entity ? "WHERE l.entity = ?" : "";
    const params = q.entity ? [q.entity] : [];
    const { limit, offset } = paging(q.page, q.pageSize);
    const pool = getPool();
    const [[rows], [count]] = await Promise.all([
      pool.query<RowDataPacket[]>(
        `SELECT l.*, a.full_name AS admin_name FROM activity_log l LEFT JOIN admins a ON a.id = l.admin_id
       ${clause} ORDER BY l.created_at DESC, l.id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM activity_log l ${clause}`, params),
    ]);
    return c.json({ items: rows, total: Number(count[0]?.n ?? 0) });
  },
);
