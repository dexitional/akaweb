import { Hono } from "hono";
import { getPool } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { AppError } from "../../middleware/error-handler.js";
import { idParam } from "../../lib/query.js";

// Public endpoints that need a real HTTP response (redirects), rather than
// a server function.
export const publicRoute = new Hono().get("/documents/:id/download", async (c) => {
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
});
