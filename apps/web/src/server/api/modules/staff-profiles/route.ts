import { Hono } from "hono";
import { z } from "zod";
import { getPool } from "@aka/db";
import type { StaffProfileRow } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { requirePermission } from "../../middleware/require-auth.js";
import { AppError } from "../../middleware/error-handler.js";
import { optionalDate, optionalText, optionalUrl, slugSchema } from "../../lib/fields.js";
import { toColumns } from "../../lib/columns.js";
import { logActivity } from "../../lib/activity.js";
import { validate } from "../../lib/validate.js";
import { parseProfileDetails, profileDetailsSchema } from "#/lib/directory";

// Staff directory profiles. A profile is keyed by slug and gathers every
// `people` row (affiliation) sharing that profile_slug; names, titles and
// units are edited on those rows in Admin → People.
const fields = z.object({
  staffType: z.enum(["teaching", "non-teaching"]).nullable().optional(),
  staffStatus: z
    .enum(["active", "post-retirement", "on-secondment", "in-memoriam", "exited"])
    .optional(),
  photoUrl: optionalUrl,
  about: optionalText(6000),
  details: profileDetailsSchema.optional(),
  isNewFace: z.boolean().optional(),
  joinedOn: optionalDate,
  isAppointedHead: z.boolean().optional(),
  appointedOn: optionalDate,
});

const FIELDS = {
  staffType: "staff_type",
  staffStatus: "staff_status",
  photoUrl: "photo_url",
  about: "about",
  details: "details",
  isNewFace: "is_new_face",
  joinedOn: "joined_on",
  isAppointedHead: "is_appointed_head",
  appointedOn: "appointed_on",
};

const slugParam = (value: string | undefined) => {
  const parsed = slugSchema.safeParse(value);
  if (!parsed.success) throw new AppError("Profile not found.", 404);
  return parsed.data;
};

async function affiliations(slug: string) {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    `SELECT p.id, p.name, p.title, p.group_key, p.unit_role, p.photo_url, p.email, p.phone, p.bio, p.is_active,
            d.name AS department_name, d.kind AS department_kind
     FROM people p LEFT JOIN departments d ON d.id = p.department_id
     WHERE p.profile_slug = ? ORDER BY d.kind = 'department' DESC, d.kind = 'unit' DESC, p.id`,
    [slug],
  );
  return rows;
}

async function get(slug: string) {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    "SELECT * FROM staff_profiles WHERE slug = ?",
    [slug],
  );
  const row = rows[0] as StaffProfileRow | undefined;
  if (!row) throw new AppError("Profile not found.", 404);
  return {
    ...row,
    details: parseProfileDetails(row.details),
    affiliations: await affiliations(slug),
  };
}

export const staffProfilesRoute = new Hono()
  .get("/", requirePermission("directory", "view"), async (c) => {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT s.id, s.slug, s.staff_type, s.staff_status, s.is_new_face, s.is_appointed_head, s.profile_views,
              s.shares, s.updated_at, COALESCE(s.photo_url, MAX(p.photo_url)) AS photo_url,
              (s.about IS NOT NULL OR JSON_LENGTH(s.details) > 0) AS has_profile,
              SUBSTRING_INDEX(GROUP_CONCAT(p.name ORDER BY d.kind = 'department' DESC, p.id SEPARATOR '\\n'), '\\n', 1) AS name,
              SUBSTRING_INDEX(GROUP_CONCAT(p.title ORDER BY d.kind = 'department' DESC, p.id SEPARATOR '\\n'), '\\n', 1) AS title,
              GROUP_CONCAT(DISTINCT d.name ORDER BY d.name SEPARATOR ', ') AS units
       FROM staff_profiles s
       LEFT JOIN people p ON p.profile_slug = s.slug
       LEFT JOIN departments d ON d.id = p.department_id
       GROUP BY s.id ORDER BY name`,
    );
    return c.json({ profiles: rows });
  })
  .get("/:slug", requirePermission("directory", "view"), async (c) =>
    c.json({ profile: await get(slugParam(c.req.param("slug"))) }),
  )
  .patch(
    "/:slug",
    requirePermission("directory", "manage"),
    validate("json", fields.partial()),
    async (c) => {
      const slug = slugParam(c.req.param("slug"));
      const current = await get(slug);
      const { columns, params } = toColumns(c.req.valid("json"), FIELDS);
      if (columns.length > 0) {
        await getPool().execute(
          `UPDATE staff_profiles SET ${columns.map((col) => `${col} = ?`).join(", ")} WHERE slug = ?`,
          [...params, slug],
        );
      }
      const name = (current.affiliations[0]?.name as string | undefined) ?? slug;
      logActivity(
        c.get("admin").id,
        "updated",
        "staff_profile",
        current.id,
        `Updated the directory profile of ${name}`,
      );
      return c.json({ profile: await get(slug) });
    },
  );
