import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../../middleware/require-auth.js";
import { optionalField, optionalText, optionalUrl, reorderSchema, slugSchema } from "../../lib/fields.js";
import { cleanRichText, sanitizeRichText } from "../../lib/rich-text.js";
import { idParam } from "../../lib/query.js";
import { SECTION_KEYS } from "#/lib/content";
import { blocksSchema } from "#/lib/blocks";
import type { Block } from "#/lib/blocks";
import * as service from "./service.js";
import { validate } from "../../lib/validate.js";

// The HTML inside blocks gets the same allowlist as page bodies.
function sanitizeBlocks(blocks: Array<Block>): Array<Block> {
  return blocks.map((b) => (b.type === "richText" || b.type === "imageText" ? { ...b, html: sanitizeRichText(b.html) } : b));
}

const pageFields = z.object({
  section: z.enum(SECTION_KEYS),
  title: z.string().trim().min(2, "Give the page a title").max(200),
  slug: z.union([slugSchema, z.literal("")]).optional(),
  summary: optionalText(500),
  heroImageUrl: optionalUrl,
  body: optionalField(z.string().max(1_000_000)).transform(cleanRichText),
  blocks: blocksSchema.transform(sanitizeBlocks).optional(),
  status: z.enum(["draft", "published"]).optional(),
  showInNav: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  seoTitle: optionalText(200),
  seoDescription: optionalText(300),
});

export const createPageSchema = pageFields;
export const updatePageSchema = pageFields.partial();

export const pagesRoute = new Hono()
  .get("/", requirePermission("pages", "view"), async (c) => c.json({ pages: await service.listPages() }))
  .get("/:id", requirePermission("pages", "view"), async (c) =>
    c.json({ page: await service.getPage(idParam(c.req.param("id"))) }),
  )
  .use("*", requirePermission("pages", "manage"))
  .post("/", validate("json", createPageSchema), async (c) =>
    c.json({ page: await service.createPage(c.get("admin").id, c.req.valid("json")) }, 201),
  )
  .post("/reorder", validate("json", reorderSchema), async (c) => {
    await service.reorderPages(c.get("admin").id, c.req.valid("json").ids);
    return c.json({ ok: true });
  })
  .post("/:id/duplicate", async (c) =>
    c.json({ page: await service.duplicatePage(c.get("admin").id, idParam(c.req.param("id"))) }, 201),
  )
  .patch("/:id", validate("json", updatePageSchema), async (c) =>
    c.json({ page: await service.updatePage(c.get("admin").id, idParam(c.req.param("id")), c.req.valid("json")) }),
  )
  .delete("/:id", async (c) => {
    await service.deletePage(c.get("admin").id, idParam(c.req.param("id")));
    return c.body(null, 204);
  });
