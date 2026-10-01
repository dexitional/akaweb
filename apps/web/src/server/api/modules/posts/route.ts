import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../../middleware/require-auth.js";
import {
  dateTimeSchema,
  optionalDate,
  optionalDateTime,
  optionalField,
  optionalLink,
  optionalText,
  optionalUrl,
  slugSchema,
} from "../../lib/fields.js";
import { cleanRichText } from "../../lib/rich-text.js";
import { idParam, pageQuerySchema } from "../../lib/query.js";
import * as service from "./service.js";
import { validate } from "../../lib/validate.js";

export const postTypeSchema = z.enum(["news", "event", "announcement"]);
export const postStatusSchema = z.enum(["draft", "published", "archived"]);

const postFields = z.object({
  type: postTypeSchema,
  title: z.string().trim().min(3, "Give it a title").max(255),
  slug: z.union([slugSchema, z.literal("")]).optional(),
  excerpt: optionalText(600),
  body: optionalField(z.string().max(1_000_000)).transform(cleanRichText),
  coverImageUrl: optionalUrl,
  category: optionalText(80),
  tags: z.array(z.string().trim().min(1).max(40)).max(12).optional(),
  isFeatured: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  status: postStatusSchema.optional(),
  publishedAt: dateTimeSchema.optional(),
  eventStart: optionalDateTime,
  eventEnd: optionalDateTime,
  venue: optionalText(255),
  registrationUrl: optionalLink,
  attachmentUrl: optionalUrl,
  expiresOn: optionalDate,
});

type PostInput = Partial<z.infer<typeof postFields>>;

// What each type needs to render. Applied to the merged post on PATCH too.
export function postProblems(p: PostInput): Array<{ path: string; message: string }> {
  const problems: Array<{ path: string; message: string }> = [];
  if (p.type === "event" && !p.eventStart) problems.push({ path: "eventStart", message: "Events need a start date and time." });
  if (p.eventStart && p.eventEnd && p.eventEnd < p.eventStart) {
    problems.push({ path: "eventEnd", message: "The event can't end before it starts." });
  }
  return problems;
}

export const createPostSchema = postFields.superRefine((p, ctx) => {
  for (const { path, message } of postProblems(p)) ctx.addIssue({ code: "custom", path: [path], message });
});
export const updatePostSchema = postFields.omit({ type: true }).partial();

const listQuerySchema = pageQuerySchema.extend({
  type: postTypeSchema.optional().catch(undefined),
  status: postStatusSchema.optional().catch(undefined),
  mine: z.literal("1").optional().catch(undefined),
});

export const postsRoute = new Hono()
  .use("*", requirePermission("posts", "manage"))
  .get("/", async (c) => c.json(await service.listPosts(c.get("admin"), listQuerySchema.parse(c.req.query()))))
  .get("/:id", async (c) => c.json({ post: await service.getPost(idParam(c.req.param("id"))) }))
  .post("/", validate("json", createPostSchema), async (c) =>
    c.json({ post: await service.createPost(c.get("admin"), c.req.valid("json")) }, 201),
  )
  .patch("/:id", validate("json", updatePostSchema), async (c) =>
    c.json({ post: await service.updatePost(c.get("admin"), idParam(c.req.param("id")), c.req.valid("json")) }),
  )
  .delete("/:id", async (c) => {
    await service.deletePost(c.get("admin"), idParam(c.req.param("id")));
    return c.body(null, 204);
  });
