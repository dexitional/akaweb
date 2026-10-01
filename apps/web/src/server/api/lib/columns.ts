import { getPool } from "@aka/db";
import type { ResultSetHeader, RowDataPacket } from "mysql2";
import { AppError } from "../middleware/error-handler.js";

type Param = string | number | null;

// Maps validated camelCase input onto DB columns for INSERT/UPDATE builders.
// Keys left undefined are skipped (so PATCH only touches sent fields),
// booleans become TINYINT 0/1, and arrays/objects are stored as JSON.
// Column and table names come only from callers' fixed maps — never from
// user input.
export function toColumns(input: object, fields: Record<string, string>) {
  const columns: Array<string> = [];
  const params: Array<Param> = [];
  for (const [key, column] of Object.entries(fields)) {
    const value = (input as Record<string, unknown>)[key];
    if (value === undefined) continue;
    columns.push(column);
    if (typeof value === "boolean") params.push(value ? 1 : 0);
    else if (value !== null && typeof value === "object") params.push(JSON.stringify(value));
    else params.push(value as Param);
  }
  return { columns, params };
}

export function insertSql(table: string, columns: Array<string>) {
  return `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${columns.map(() => "?").join(", ")})`;
}

export function updateSql(table: string, columns: Array<string>) {
  return `UPDATE ${table} SET ${columns.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`;
}

export type Table =
  | "pages"
  | "posts"
  | "spotlights"
  | "departments"
  | "people"
  | "documents"
  | "media_assets"
  | "admins"
  | "contact_messages";

export async function findById<T>(table: Table, id: number, label = "Record"): Promise<T> {
  const [rows] = await getPool().execute<RowDataPacket[]>(`SELECT * FROM ${table} WHERE id = ?`, [
    id,
  ]);
  if (!rows[0]) throw new AppError(`${label} not found.`, 404);
  return { ...rows[0] } as T;
}

export async function insertRow(
  table: Table,
  input: object,
  fields: Record<string, string>,
  extra: Record<string, Param> = {},
) {
  const { columns, params } = toColumns(input, fields);
  const extraCols = Object.keys(extra);
  const [result] = await getPool().execute<ResultSetHeader>(
    insertSql(table, [...columns, ...extraCols]),
    [...params, ...Object.values(extra)],
  );
  return result.insertId;
}

export async function updateRow(
  table: Table,
  id: number,
  input: object,
  fields: Record<string, string>,
  extra: Record<string, Param> = {},
) {
  const { columns, params } = toColumns(input, fields);
  const extraCols = Object.keys(extra);
  if (columns.length + extraCols.length === 0) return;
  await getPool().execute(updateSql(table, [...columns, ...extraCols]), [
    ...params,
    ...Object.values(extra),
    id,
  ]);
}

export async function deleteRow(table: Table, id: number, label = "Record") {
  const [result] = await getPool().execute<ResultSetHeader>(`DELETE FROM ${table} WHERE id = ?`, [
    id,
  ]);
  if (result.affectedRows === 0) throw new AppError(`${label} not found.`, 404);
}

// Persists a drag-and-drop order: each id gets its position as sort_order.
export async function reorderRows(table: Table, ids: Array<number>) {
  const conn = await getPool().getConnection();
  try {
    await conn.beginTransaction();
    for (const [index, id] of ids.entries()) {
      await conn.execute(`UPDATE ${table} SET sort_order = ? WHERE id = ?`, [index, id]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
