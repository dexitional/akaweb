// The DB/JWT-touching session implementation. Kept out of session.ts (which
// route guards import) so mysql2 never reaches the browser bundle — see the
// note in routes/api/$.ts. Safe to import statically from server-only code
// (Hono middleware and modules).
import { sign, verify } from "hono/jwt";
import { getPool } from "@aka/db";
import type { AdminRole } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { ADMIN_SESSION_TTL_SECONDS } from "./session.js";

function adminSessionSecret(): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("ADMIN_SESSION_SECRET must be set to at least 32 characters.");
  }
  return secret;
}

export async function signAdminToken(adminId: number, role: AdminRole): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: adminId, role, iat: now, exp: now + ADMIN_SESSION_TTL_SECONDS }, adminSessionSecret(), "HS256");
}

export async function readAdminIdFromToken(token: string | undefined): Promise<number | null> {
  if (!token) return null;
  try {
    const payload = await verify(token, adminSessionSecret(), "HS256");
    const id = Number(payload.sub);
    return Number.isFinite(id) ? id : null;
  } catch {
    return null;
  }
}

export interface AdminSessionUser {
  id: number;
  fullName: string;
  email: string;
  role: AdminRole;
  photoUrl: string | null;
}

export async function getAdminSessionUser(id: number): Promise<AdminSessionUser | null> {
  const [rows] = await getPool().execute<RowDataPacket[]>(
    "SELECT id, full_name, email, role, photo_url FROM admins WHERE id = ? AND is_active = 1",
    [id],
  );
  const row = rows[0];
  if (!row) return null;
  return { id: row.id, fullName: row.full_name, email: row.email, role: row.role, photoUrl: row.photo_url };
}
