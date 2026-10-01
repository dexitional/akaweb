import { getPool } from "@aka/db";
import type { RowDataPacket } from "mysql2";

export function slugify(input: string) {
  return (
    input
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 150) || "item"
  );
}

// First free slug in a table's scope: "orientation", "orientation-2", ...
// `table`/`scopeColumn` come only from fixed call sites, never user input.
export async function uniqueSlug(
  table: "pages" | "posts" | "departments",
  base: string,
  scope: { column: "section" | "type" | "kind"; value: string },
  excludeId?: number,
) {
  const root = slugify(base);
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT slug FROM ${table} WHERE ${scope.column} = ? AND (slug = ? OR slug LIKE ?) ${excludeId ? "AND id <> ?" : ""}`,
    excludeId ? [scope.value, root, `${root}-%`, excludeId] : [scope.value, root, `${root}-%`],
  );
  const taken = new Set(rows.map((r) => r.slug as string));
  if (!taken.has(root)) return root;
  for (let n = 2; ; n++) {
    if (!taken.has(`${root}-${n}`)) return `${root}-${n}`;
  }
}
