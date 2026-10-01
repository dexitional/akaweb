import { Hono } from "hono";
import { z } from "zod";
import { getPool } from "@aka/db";
import type { PersonRow } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { requirePermission } from "../../middleware/require-auth.js";
import {
  optionalField,
  optionalText,
  optionalUrl,
  reorderSchema,
  slugSchema,
} from "../../lib/fields.js";
import { deleteRow, findById, insertRow, reorderRows, updateRow } from "../../lib/columns.js";
import { idParam } from "../../lib/query.js";
import { logActivity } from "../../lib/activity.js";
import { PERSON_GROUP_KEYS } from "#/lib/content";
import { DIRECTORY_GROUPS, personSlug } from "#/lib/directory";
import { validate } from "../../lib/validate.js";

const fields = z.object({
  groupKey: z.enum(PERSON_GROUP_KEYS),
  name: z.string().trim().min(2).max(150),
  title: z.string().trim().min(2).max(150),
  departmentId: z.number().int().positive().nullable().optional(),
  photoUrl: optionalUrl,
  bio: optionalText(4000),
  email: optionalField(z.string().trim().email().max(150)),
  phone: optionalText(30),
  profileSlug: optionalField(slugSchema),
  unitRole: optionalText(120),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).max(9999).optional(),
});

const FIELDS = {
  groupKey: "group_key",
  name: "name",
  title: "title",
  departmentId: "department_id",
  photoUrl: "photo_url",
  bio: "bio",
  email: "email",
  phone: "phone",
  profileSlug: "profile_slug",
  unitRole: "unit_role",
  isActive: "is_active",
  sortOrder: "sort_order",
};

// Staff get a directory profile: link the row to one (same slug = same person
// across groups and units) and make sure the profile exists.
async function linkDirectoryProfile(id: number) {
  const person = await get(id);
  if (!DIRECTORY_GROUPS.includes(person.group_key)) return;
  const slug = person.profile_slug ?? personSlug(person.name);
  if (!person.profile_slug)
    await getPool().execute("UPDATE people SET profile_slug = ? WHERE id = ?", [slug, id]);
  await getPool().execute("INSERT IGNORE INTO staff_profiles (slug) VALUES (?)", [slug]);
}

const get = (id: number) => findById<PersonRow>("people", id, "Person");

export const peopleRoute = new Hono()
  .get("/", requirePermission("people", "view"), async (c) => {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT p.*, d.name AS department_name FROM people p LEFT JOIN departments d ON d.id = p.department_id
       ORDER BY p.group_key, p.sort_order, p.name`,
    );
    return c.json({ people: rows });
  })
  .use("*", requirePermission("people", "manage"))
  .post("/", validate("json", fields), async (c) => {
    const input = c.req.valid("json");
    const [rows] = await getPool().execute<RowDataPacket[]>(
      "SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM people WHERE group_key = ?",
      [input.groupKey],
    );
    const id = await insertRow(
      "people",
      { sortOrder: Number(rows[0]?.next ?? 0), ...input },
      FIELDS,
    );
    await linkDirectoryProfile(id);
    logActivity(c.get("admin").id, "created", "person", id, `Added ${input.name}`);
    return c.json({ person: await get(id) }, 201);
  })
  .post("/reorder", validate("json", reorderSchema), async (c) => {
    await reorderRows("people", c.req.valid("json").ids);
    return c.json({ ok: true });
  })
  .patch("/:id", validate("json", fields.partial()), async (c) => {
    const id = idParam(c.req.param("id"));
    const current = await get(id);
    await updateRow("people", id, c.req.valid("json"), FIELDS);
    await linkDirectoryProfile(id);
    logActivity(
      c.get("admin").id,
      "updated",
      "person",
      id,
      `Updated ${c.req.valid("json").name ?? current.name}`,
    );
    return c.json({ person: await get(id) });
  })
  .delete("/:id", async (c) => {
    const id = idParam(c.req.param("id"));
    const current = await get(id);
    await deleteRow("people", id, "Person");
    logActivity(c.get("admin").id, "deleted", "person", id, `Removed ${current.name}`);
    return c.body(null, 204);
  });
