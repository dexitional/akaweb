import bcrypt from "bcryptjs";
import { getPool } from "@aka/db";
import type { AdminRow } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import type { z } from "zod";
import { signAdminToken } from "#/server/session-core";
import { AppError } from "../../middleware/error-handler.js";
import {
  DUMMY_BCRYPT_HASH,
  computeLockoutUntil,
  formatLockedUntil,
  isLockedOut,
} from "../../lib/lockout.js";
import { logActivity } from "../../lib/activity.js";
import { findById, updateRow } from "../../lib/columns.js";
import type { changePasswordSchema, loginSchema, profileSchema } from "./route.js";

export async function login(input: z.infer<typeof loginSchema>) {
  const pool = getPool();
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id, full_name, role, password_hash, failed_login_attempts, locked_until FROM admins WHERE email = ? AND is_active = 1",
    [input.email],
  );
  const admin = rows[0];

  if (!admin) {
    // Same bcrypt cost as a real check, so timing can't enumerate emails.
    await bcrypt.compare(input.password, DUMMY_BCRYPT_HASH);
    throw new AppError("Invalid email or password.", 401);
  }

  if (isLockedOut(admin.locked_until)) {
    throw new AppError(
      `This account is temporarily locked. Try again after ${formatLockedUntil(admin.locked_until)}.`,
      429,
    );
  }

  if (!(await bcrypt.compare(input.password, admin.password_hash))) {
    const failed = admin.failed_login_attempts + 1;
    await pool.execute(
      "UPDATE admins SET failed_login_attempts = ?, locked_until = ? WHERE id = ?",
      [failed, computeLockoutUntil(failed), admin.id],
    );
    throw new AppError("Invalid email or password.", 401);
  }

  await pool.execute(
    "UPDATE admins SET failed_login_attempts = 0, locked_until = NULL, last_login_at = NOW() WHERE id = ?",
    [admin.id],
  );
  logActivity(admin.id, "signed_in", "session", null, `${admin.full_name} signed in`);
  return { adminId: admin.id as number, token: await signAdminToken(admin.id, admin.role) };
}

function publicAdmin(row: AdminRow) {
  const { password_hash: _hash, failed_login_attempts: _f, locked_until: _l, ...rest } = row;
  return rest;
}

export async function getProfile(id: number) {
  return publicAdmin(await findById<AdminRow>("admins", id, "Account"));
}

export async function updateProfile(id: number, input: z.infer<typeof profileSchema>) {
  await updateRow("admins", id, input, {
    fullName: "full_name",
    position: "position",
    phone: "phone",
    photoUrl: "photo_url",
  });
  return getProfile(id);
}

export async function changePassword(id: number, input: z.infer<typeof changePasswordSchema>) {
  const admin = await findById<AdminRow>("admins", id, "Account");
  if (!(await bcrypt.compare(input.currentPassword, admin.password_hash))) {
    throw new AppError("Current password is incorrect.", 401);
  }
  await getPool().execute("UPDATE admins SET password_hash = ? WHERE id = ?", [
    await bcrypt.hash(input.newPassword, 12),
    id,
  ]);
  logActivity(id, "updated", "account", id, "Changed own password");
}
