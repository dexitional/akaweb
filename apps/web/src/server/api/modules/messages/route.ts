import { Hono } from "hono";
import { z } from "zod";
import { getPool } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { requirePermission } from "../../middleware/require-auth.js";
import { AppError } from "../../middleware/error-handler.js";
import { optionalText } from "../../lib/fields.js";
import { deleteRow, findById, updateRow } from "../../lib/columns.js";
import { idParam, likePattern, pageQuerySchema, paging } from "../../lib/query.js";
import { validate } from "../../lib/validate.js";

export const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(150),
  email: z.string().trim().email("Please enter a valid email").max(150),
  phone: optionalText(30),
  subject: z.string().trim().min(3, "Please add a subject").max(200),
  message: z.string().trim().min(10, "Please write a little more").max(5000),
  // Honeypot: real visitors never see or fill this field.
  website: z.string().max(0).optional().catch("bot"),
});

const status = z.enum(["new", "read", "archived"]);
const listQuerySchema = pageQuerySchema.extend({ status: status.optional().catch(undefined) });

const MAX_PER_HOUR = 5;

function clientIp(headers: Headers) {
  return (
    (
      headers.get("cf-connecting-ip") ??
      headers.get("x-forwarded-for")?.split(",")[0] ??
      ""
    ).trim() || null
  );
}

export const messagesRoute = new Hono()
  // Public: the Contact Us form.
  .post("/contact", validate("json", contactSchema), async (c) => {
    const input = c.req.valid("json");
    if (input.website) return c.json({ ok: true }); // silently drop bots
    const ip = clientIp(c.req.raw.headers);
    const pool = getPool();
    if (ip) {
      const [rows] = await pool.execute<RowDataPacket[]>(
        "SELECT COUNT(*) AS n FROM contact_messages WHERE ip_address = ? AND created_at > NOW() - INTERVAL 1 HOUR",
        [ip],
      );
      if (Number(rows[0]?.n ?? 0) >= MAX_PER_HOUR) {
        throw new AppError("You've sent several messages already — please try again later.", 429);
      }
    }
    await pool.execute(
      "INSERT INTO contact_messages (name, email, phone, subject, message, ip_address) VALUES (?, ?, ?, ?, ?, ?)",
      [input.name, input.email, input.phone ?? null, input.subject, input.message, ip],
    );
    return c.json({ ok: true }, 201);
  })
  .get("/", requirePermission("messages", "view"), async (c) => {
    const q = listQuerySchema.parse(c.req.query());
    const where: Array<string> = [];
    const params: Array<string | number> = [];
    if (q.status) {
      where.push("status = ?");
      params.push(q.status);
    } else {
      where.push("status <> 'archived'");
    }
    if (q.q) {
      where.push("(name LIKE ? OR email LIKE ? OR subject LIKE ? OR message LIKE ?)");
      params.push(...Array(4).fill(likePattern(q.q)));
    }
    const clause = `WHERE ${where.join(" AND ")}`;
    const { limit, offset } = paging(q.page, q.pageSize);
    const pool = getPool();
    const [[rows], [count], [counts]] = await Promise.all([
      pool.query<RowDataPacket[]>(
        `SELECT * FROM contact_messages ${clause} ORDER BY created_at DESC, id DESC LIMIT ? OFFSET ?`,
        [...params, limit, offset],
      ),
      pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM contact_messages ${clause}`, params),
      pool.query<RowDataPacket[]>(
        "SELECT status, COUNT(*) AS n FROM contact_messages GROUP BY status",
      ),
    ]);
    return c.json({
      items: rows,
      total: Number(count[0]?.n ?? 0),
      counts: Object.fromEntries(counts.map((r) => [r.status, Number(r.n)])),
    });
  })
  .patch(
    "/:id",
    requirePermission("messages", "view"),
    validate("json", z.object({ status })),
    async (c) => {
      const id = idParam(c.req.param("id"));
      await findById("contact_messages", id, "Message");
      await updateRow("contact_messages", id, c.req.valid("json"), { status: "status" });
      return c.json({ ok: true });
    },
  )
  .delete("/:id", requirePermission("messages", "manage"), async (c) => {
    await deleteRow("contact_messages", idParam(c.req.param("id")), "Message");
    return c.body(null, 204);
  });
