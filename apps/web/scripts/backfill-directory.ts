// Prepares existing people/department data for the staff directory:
//   - gives every staff affiliation a profile slug (same name → same profile),
//   - marks department/unit heads with their leadership role,
//   - creates a staff_profiles row per person, typed teaching/non-teaching
//     from where they work,
//   - files each department/unit under its directory category.
// Idempotent: only fills values that are still empty.
//
//   npm run directory:backfill -w apps/web
import mysql from "mysql2/promise";
import type { RowDataPacket } from "mysql2/promise";
import { DIRECTORY_GROUPS, personSlug } from "../src/lib/directory";

const url = process.env.DATABASE_URL?.replace(/"/g, "");
if (!url) throw new Error("DATABASE_URL is not set.");
const db = mysql.createPool({ uri: url });

const norm = (name: string | null) => (name ? personSlug(name) : "");

async function main() {
  const [people] = await db.query<RowDataPacket[]>(
    `SELECT p.id, p.name, p.title, p.group_key, p.profile_slug, p.unit_role, p.department_id,
            d.kind, d.head_name, d.head_title
     FROM people p LEFT JOIN departments d ON d.id = p.department_id`,
  );

  let slugs = 0;
  let roles = 0;
  for (const p of people) {
    if (!DIRECTORY_GROUPS.includes(p.group_key)) continue;
    const slug = p.profile_slug ?? personSlug(p.name);
    let role: string | null = p.unit_role;
    if (!role && p.department_id) {
      if (p.head_name && norm(p.head_name) === slug) {
        role = p.head_title || (p.kind === "unit" ? "Head of Unit" : "Head of Department");
      } else if (/^head\b/i.test(p.title ?? "")) {
        role = p.title;
      }
    }
    if (slug !== p.profile_slug || role !== p.unit_role) {
      await db.execute("UPDATE people SET profile_slug = ?, unit_role = ? WHERE id = ?", [slug, role, p.id]);
      if (slug !== p.profile_slug) slugs++;
      if (role !== p.unit_role) roles++;
    }
  }

  // One profile per person; teaching if any affiliation is an academic department.
  const [rows] = await db.query<RowDataPacket[]>(
    `SELECT p.profile_slug AS slug,
            MAX(d.kind = 'department') AS teaching, MAX(d.kind = 'unit') AS non_teaching
     FROM people p LEFT JOIN departments d ON d.id = p.department_id
     WHERE p.profile_slug IS NOT NULL GROUP BY p.profile_slug`,
  );
  let profiles = 0;
  for (const r of rows) {
    const type = Number(r.teaching) ? "teaching" : Number(r.non_teaching) ? "non-teaching" : null;
    const [result] = await db.execute<mysql.ResultSetHeader>(
      "INSERT IGNORE INTO staff_profiles (slug, staff_type) VALUES (?, ?)",
      [r.slug, type],
    );
    profiles += result.affectedRows;
  }

  const [categorised] = await db.execute<mysql.ResultSetHeader>(
    "UPDATE departments SET directory_category = kind WHERE directory_category IS NULL",
  );

  console.log(
    `Directory backfill: ${slugs} profile links, ${roles} leadership roles, ${profiles} new profiles, ${categorised.affectedRows} units categorised.`,
  );
  await db.end();
}

main().catch(async (err: unknown) => {
  console.error(err);
  await db.end();
  process.exit(1);
});
