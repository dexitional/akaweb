import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../../middleware/require-auth.js";
import { optionalText } from "../../lib/fields.js";
import { idParam, pageQuerySchema } from "../../lib/query.js";
import * as service from "./service.js";
import { MEDIA_FOLDERS } from "./service.js";
import { validate } from "../../lib/validate.js";

const folder = z.enum(MEDIA_FOLDERS);

export const presignSchema = z.object({
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().min(1).max(120),
  size: z.number().int().positive(),
  folder,
});

export const registerSchema = z.object({
  key: z.string().min(1).max(500),
  filename: z.string().trim().min(1).max(255),
  contentType: z.string().min(1).max(120),
  size: z.number().int().positive(),
  width: z.number().int().positive().max(100_000).nullable().optional(),
  height: z.number().int().positive().max(100_000).nullable().optional(),
  altText: optionalText(255),
  folder,
});

export const updateMediaSchema = z.object({
  altText: optionalText(255),
  filename: z.string().trim().min(1).max(255).optional(),
  folder: folder.optional(),
});

const listQuerySchema = pageQuerySchema.extend({
  kind: z.enum(["image", "document"]).optional().catch(undefined),
  folder: folder.optional().catch(undefined),
});

export const mediaRoute = new Hono()
  .use("*", requirePermission("media", "manage"))
  .get("/", async (c) => c.json(await service.listMedia(listQuerySchema.parse(c.req.query()))))
  .post("/presign", validate("json", presignSchema), async (c) => c.json(await service.presign(c.req.valid("json"))))
  .post("/", validate("json", registerSchema), async (c) =>
    c.json({ asset: await service.registerAsset(c.get("admin").id, c.req.valid("json")) }, 201),
  )
  .get("/:id/usage", async (c) => c.json({ usage: await service.findUsage(idParam(c.req.param("id"))) }))
  .patch("/:id", validate("json", updateMediaSchema), async (c) =>
    c.json({ asset: await service.updateAsset(idParam(c.req.param("id")), c.req.valid("json")) }),
  )
  .delete("/:id", async (c) => {
    await service.deleteAsset(c.get("admin").id, idParam(c.req.param("id")));
    return c.body(null, 204);
  });
