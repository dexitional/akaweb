import { Hono } from "hono";
import { z } from "zod";
import { getPool } from "@aka/db";
import type { DepartmentRow } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { requirePermission } from "../../middleware/require-auth.js";
import { AppError } from "../../middleware/error-handler.js";
import {
  optionalField,
  optionalText,
  optionalUrl,
  reorderSchema,
  slugSchema,
} from "../../lib/fields.js";
import { deleteRow, findById, insertRow, reorderRows, updateRow } from "../../lib/columns.js";
import { cleanRichText, toRichHtml } from "../../lib/rich-text.js";
import { slugify, uniqueSlug } from "../../lib/slug.js";
import { idParam } from "../../lib/query.js";
import { logActivity } from "../../lib/activity.js";
import { validate } from "../../lib/validate.js";
import { UNIT_CATEGORY_VALUES } from "#/lib/directory";

// Academic departments and the college's units (Academic Affairs, Library,
// ICT, Quality Assurance, ...). Same shape, different listing.
const kind = z.enum(["department", "unit"]);
const fields = z.object({
  kind,
  name: z.string().trim().min(2).max(200),
  slug: z.union([slugSchema, z.literal("")]).optional(),
  summary: optionalText(500),
  body: optionalField(z.string().max(1_000_000)).transform(cleanRichText),
  imageUrl: optionalUrl,
  headName: optionalText(150),
  headTitle: optionalText(150),
  headPhotoUrl: optionalUrl,
  email: optionalField(z.string().trim().email().max(150)),
  phone: optionalText(30),
  location: optionalText(255),
  programmes: z.array(z.string().trim().min(1).max(200)).max(40).optional(),
  isPublished: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
  // Staff directory
  directoryCategory: z.enum(UNIT_CATEGORY_VALUES).nullable().optional(),
  code: optionalText(20),
  websiteUrl: optionalUrl,
  isFeaturedDirectory: z.boolean().optional(),
  relatedIds: z.array(z.number().int().positive()).max(20).optional(),
});

const FIELDS = {
  kind: "kind",
  slug: "slug",
  name: "name",
  summary: "summary",
  body: "body",
  imageUrl: "image_url",
  headName: "head_name",
  headTitle: "head_title",
  headPhotoUrl: "head_photo_url",
  email: "email",
  phone: "phone",
  location: "location",
  programmes: "programmes",
  isPublished: "is_published",
  sortOrder: "sort_order",
  directoryCategory: "directory_category",
  code: "code",
  websiteUrl: "website_url",
  isFeaturedDirectory: "is_featured_directory",
  relatedIds: "related_ids",
};

async function get(id: number) {
  const row = await findById<DepartmentRow>("departments", id, "Department");
  return {
    ...row,
    body: toRichHtml(row.body),
    programmes: row.programmes ?? [],
    related_ids: row.related_ids ?? [],
  };
}

// Unique across departments and units alike: the staff directory addresses
// both as /directory/d/<slug>.
async function resolveSlug(name: string, slug: string | undefined, excludeId?: number) {
  if (!slug) return uniqueSlug("departments", name, null, excludeId);
  const free = await uniqueSlug("departments", slug, null, excludeId);
  if (free !== slugify(slug)) throw new AppError(`The address “${slug}” is already in use.`, 409);
  return free;
}

export const departmentsRoute = new Hono()
  .get("/", requirePermission("departments", "view"), async (c) => {
    const k = kind.safeParse(c.req.query("kind"));
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT d.id, d.kind, d.slug, d.name, d.summary, d.image_url, d.head_name, d.head_title, d.is_published,
              d.sort_order, d.updated_at, COALESCE(JSON_LENGTH(d.programmes), 0) AS programme_count,
              (SELECT COUNT(*) FROM people p WHERE p.department_id = d.id) AS people_count
       FROM departments d ${k.success ? "WHERE d.kind = ?" : ""} ORDER BY d.kind, d.sort_order, d.name`,
      k.success ? [k.data] : [],
    );
    return c.json({ departments: rows });
  })
  .get("/:id", requirePermission("departments", "view"), async (c) =>
    c.json({ department: await get(idParam(c.req.param("id"))) }),
  )
  .use("*", requirePermission("departments", "manage"))
  .post("/", validate("json", fields), async (c) => {
    const input = c.req.valid("json");
    const slug = await resolveSlug(input.name, input.slug);
    const id = await insertRow(
      "departments",
      { directoryCategory: input.kind, ...input, slug },
      FIELDS,
    );
    logActivity(
      c.get("admin").id,
      "created",
      "department",
      id,
      `Created ${input.kind} “${input.name}”`,
    );
    return c.json({ department: await get(id) }, 201);
  })
  .post("/reorder", validate("json", reorderSchema), async (c) => {
    await reorderRows("departments", c.req.valid("json").ids);
    return c.json({ ok: true });
  })
  .patch("/:id", validate("json", fields.partial()), async (c) => {
    const id = idParam(c.req.param("id"));
    const current = await get(id);
    const input = { ...c.req.valid("json") };
    const k = input.kind ?? current.kind;
    if (input.slug !== undefined || input.kind !== undefined) {
      input.slug = await resolveSlug(input.name ?? current.name, input.slug || current.slug, id);
    }
    await updateRow("departments", id, input, FIELDS);
    logActivity(
      c.get("admin").id,
      "updated",
      "department",
      id,
      `Updated ${k} “${input.name ?? current.name}”`,
    );
    return c.json({ department: await get(id) });
  })
  .delete("/:id", async (c) => {
    const id = idParam(c.req.param("id"));
    const current = await get(id);
    await deleteRow("departments", id, "Department");
    logActivity(
      c.get("admin").id,
      "deleted",
      "department",
      id,
      `Deleted ${current.kind} “${current.name}”`,
    );
    return c.body(null, 204);
  });
