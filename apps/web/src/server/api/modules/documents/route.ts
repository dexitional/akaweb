import { Hono } from "hono";
import { z } from "zod";
import { getPool } from "@aka/db";
import type { DocumentRow } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { requirePermission } from "../../middleware/require-auth.js";
import { dateSchema, optionalText, urlSchema } from "../../lib/fields.js";
import { deleteRow, findById, insertRow, updateRow } from "../../lib/columns.js";
import { idParam, likePattern, pageQuerySchema, paging } from "../../lib/query.js";
import { logActivity } from "../../lib/activity.js";
import { DOCUMENT_CATEGORY_KEYS } from "#/lib/content";
import { validate } from "../../lib/validate.js";

// Guides, forms, handbooks and other downloads (News & Media → Downloads).
const category = z.enum(DOCUMENT_CATEGORY_KEYS);
const fields = z.object({
  title: z.string().trim().min(3).max(255),
  category,
  description: optionalText(500),
  fileUrl: urlSchema,
  fileName: optionalText(255),
  mimeType: optionalText(120),
  sizeBytes: z.number().int().min(0).nullable().optional(),
  isPublished: z.boolean().optional(),
  publishedOn: dateSchema,
});

const FIELDS = {
  title: "title",
  category: "category",
  description: "description",
  fileUrl: "file_url",
  fileName: "file_name",
  mimeType: "mime_type",
  sizeBytes: "size_bytes",
  isPublished: "is_published",
  publishedOn: "published_on",
};

const listQuerySchema = pageQuerySchema.extend({ category: category.optional().catch(undefined) });
const get = (id: number) => findById<DocumentRow>("documents", id, "Document");

export const documentsRoute = new Hono()
  .get("/", requirePermission("documents", "view"), async (c) => {
    const q = listQuerySchema.parse(c.req.query());
    const where: Array<string> = [];
    const params: Array<string | number> = [];
    if (q.category) {
      where.push("category = ?");
      params.push(q.category);
    }
    if (q.q) {
      where.push("(title LIKE ? OR description LIKE ? OR file_name LIKE ?)");
      params.push(likePattern(q.q), likePattern(q.q), likePattern(q.q));
    }
    const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const { limit, offset } = paging(q.page, q.pageSize);
    const pool = getPool();
    const [[rows], [count]] = await Promise.all([
      pool.query<RowDataPacket[]>(
        `SELECT * FROM documents ${clause} ORDER BY published_on DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM documents ${clause}`, params),
    ]);
    return c.json({ items: rows, total: Number(count[0]?.n ?? 0) });
  })
  .use("*", requirePermission("documents", "manage"))
  .post("/", validate("json", fields), async (c) => {
    const input = c.req.valid("json");
    const id = await insertRow("documents", input, FIELDS, { created_by: c.get("admin").id });
    logActivity(c.get("admin").id, "created", "document", id, `Added document “${input.title}”`);
    return c.json({ document: await get(id) }, 201);
  })
  .patch("/:id", validate("json", fields.partial()), async (c) => {
    const id = idParam(c.req.param("id"));
    const current = await get(id);
    await updateRow("documents", id, c.req.valid("json"), FIELDS);
    logActivity(
      c.get("admin").id,
      "updated",
      "document",
      id,
      `Updated document “${c.req.valid("json").title ?? current.title}”`,
    );
    return c.json({ document: await get(id) });
  })
  .delete("/:id", async (c) => {
    const id = idParam(c.req.param("id"));
    const current = await get(id);
    await deleteRow("documents", id, "Document");
    logActivity(
      c.get("admin").id,
      "deleted",
      "document",
      id,
      `Deleted document “${current.title}”`,
    );
    return c.body(null, 204);
  });
