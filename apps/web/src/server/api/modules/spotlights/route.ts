import { Hono } from "hono";
import { z } from "zod";
import { getPool } from "@aka/db";
import type { SpotlightRow } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { requirePermission } from "../../middleware/require-auth.js";
import { optionalDate, optionalLink, optionalText, reorderSchema, urlSchema } from "../../lib/fields.js";
import { deleteRow, findById, insertRow, reorderRows, updateRow } from "../../lib/columns.js";
import { idParam } from "../../lib/query.js";
import { logActivity } from "../../lib/activity.js";
import { validate } from "../../lib/validate.js";

// Slides of the home page hero carousel.
const fields = z.object({
  eyebrow: optionalText(60),
  title: z.string().trim().min(3).max(200),
  caption: optionalText(500),
  imageUrl: urlSchema,
  ctaLabel: optionalText(60),
  ctaUrl: optionalLink,
  showText: z.boolean().optional(),
  startsOn: optionalDate,
  endsOn: optionalDate,
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

const FIELDS = {
  eyebrow: "eyebrow",
  title: "title",
  caption: "caption",
  imageUrl: "image_url",
  ctaLabel: "cta_label",
  ctaUrl: "cta_url",
  showText: "show_text",
  startsOn: "starts_on",
  endsOn: "ends_on",
  isActive: "is_active",
  sortOrder: "sort_order",
};

const get = (id: number) => findById<SpotlightRow>("spotlights", id, "Spotlight");

export const spotlightsRoute = new Hono()
  .get("/", requirePermission("spotlights", "view"), async (c) => {
    const [rows] = await getPool().query<RowDataPacket[]>("SELECT * FROM spotlights ORDER BY sort_order, id DESC");
    return c.json({ spotlights: rows });
  })
  .use("*", requirePermission("spotlights", "manage"))
  .post("/", validate("json", fields), async (c) => {
    const input = c.req.valid("json");
    const [rows] = await getPool().query<RowDataPacket[]>("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM spotlights");
    const id = await insertRow("spotlights", { sortOrder: Number(rows[0]?.next ?? 0), ...input }, FIELDS, {
      created_by: c.get("admin").id,
    });
    logActivity(c.get("admin").id, "created", "spotlight", id, `Created spotlight “${input.title}”`);
    return c.json({ spotlight: await get(id) }, 201);
  })
  .post("/reorder", validate("json", reorderSchema), async (c) => {
    await reorderRows("spotlights", c.req.valid("json").ids);
    logActivity(c.get("admin").id, "reordered", "spotlight", null, "Reordered spotlights");
    return c.json({ ok: true });
  })
  .patch("/:id", validate("json", fields.partial()), async (c) => {
    const id = idParam(c.req.param("id"));
    const current = await get(id);
    await updateRow("spotlights", id, c.req.valid("json"), FIELDS);
    logActivity(c.get("admin").id, "updated", "spotlight", id, `Updated spotlight “${c.req.valid("json").title ?? current.title}”`);
    return c.json({ spotlight: await get(id) });
  })
  .delete("/:id", async (c) => {
    const id = idParam(c.req.param("id"));
    const current = await get(id);
    await deleteRow("spotlights", id, "Spotlight");
    logActivity(c.get("admin").id, "deleted", "spotlight", id, `Deleted spotlight “${current.title}”`);
    return c.body(null, 204);
  });
