import bcrypt from "bcryptjs";
import { getPool } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import { deleteRow, findById, insertRow, updateRow } from "../../lib/columns.js";
import { logActivity } from "../../lib/activity.js";
import type { createUserSchema, updateUserSchema } from "./route.js";

const COLUMNS =
  "id, full_name, email, role, position, phone, photo_url, is_active, last_login_at, locked_until, created_at";

const FIELDS = {
  fullName: "full_name",
  email: "email",
  role: "role",
  position: "position",
  phone: "phone",
  isActive: "is_active",
};

export async function listUsers() {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT ${COLUMNS} FROM admins ORDER BY is_active DESC, FIELD(role, 'super_admin', 'admin', 'editor', 'author'), full_name`,
  );
  return rows;
}

async function getUser(id: number) {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    `SELECT ${COLUMNS} FROM admins WHERE id = ?`,
    [id],
  );
  if (!rows[0]) throw new AppError("User not found.", 404);
  return rows[0];
}

async function assertEmailFree(email: string, excludeId?: number) {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    "SELECT id FROM admins WHERE email = ? AND id <> ?",
    [email, excludeId ?? 0],
  );
  if (rows[0]) throw new AppError("Another account already uses that email.", 409);
}

export async function createUser(actorId: number, input: z.infer<typeof createUserSchema>) {
  await assertEmailFree(input.email);
  const id = await insertRow("admins", input, FIELDS, {
    password_hash: await bcrypt.hash(input.password, 12),
  });
  logActivity(
    actorId,
    "created",
    "user",
    id,
    `Created ${input.role.replace("_", " ")} account for ${input.fullName}`,
  );
  return getUser(id);
}

// The last active super admin can't be demoted, deactivated or deleted —
// otherwise nobody could manage accounts any more.
async function assertNotLastSuperAdmin(id: number) {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT COUNT(*) AS n FROM admins WHERE role = 'super_admin' AND is_active = 1 AND id <> ?",
    [id],
  );
  if (Number(rows[0]?.n ?? 0) === 0) {
    throw new AppError("There must always be at least one active super admin.", 409);
  }
}

export async function updateUser(
  actorId: number,
  id: number,
  input: z.infer<typeof updateUserSchema>,
) {
  const current = await findById<{ role: string; full_name: string }>("admins", id, "User");
  if (input.email) await assertEmailFree(input.email, id);
  const demoting =
    current.role === "super_admin" && input.role !== undefined && input.role !== "super_admin";
  if (demoting || (current.role === "super_admin" && input.isActive === false))
    await assertNotLastSuperAdmin(id);
  if (id === actorId && input.isActive === false)
    throw new AppError("You can't deactivate your own account.", 409);

  const extra: Record<string, string | number | null> = {};
  if (input.password) {
    extra.password_hash = await bcrypt.hash(input.password, 12);
    extra.failed_login_attempts = 0;
    extra.locked_until = null;
  }
  await updateRow("admins", id, input, FIELDS, extra);
  logActivity(
    actorId,
    "updated",
    "user",
    id,
    `Updated account for ${input.fullName ?? current.full_name}${input.password ? " (password reset)" : ""}`,
  );
  return getUser(id);
}

export async function deleteUser(actorId: number, id: number) {
  if (id === actorId) throw new AppError("You can't delete your own account.", 409);
  const current = await findById<{ role: string; full_name: string }>("admins", id, "User");
  if (current.role === "super_admin") await assertNotLastSuperAdmin(id);
  await deleteRow("admins", id, "User");
  logActivity(actorId, "deleted", "user", id, `Deleted account for ${current.full_name}`);
}
