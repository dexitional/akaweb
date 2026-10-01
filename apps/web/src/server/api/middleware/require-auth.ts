import type { Context, Next } from "hono";
import { getCookie } from "hono/cookie";
import type { AdminRole } from "@aka/db";
import { rolesWith } from "#/lib/permissions";
import type { Access, AdminModule } from "#/lib/permissions";
import { ADMIN_SESSION_COOKIE } from "#/server/session";
import { getAdminSessionUser, readAdminIdFromToken } from "#/server/session-core";
import type { AdminSessionUser } from "#/server/session-core";
import { AppError } from "./error-handler.js";

declare module "hono" {
  interface ContextVariableMap {
    admin: AdminSessionUser;
  }
}

export function requireAdminRole(allowed: Array<AdminRole>) {
  return async (c: Context, next: Next) => {
    const id = await readAdminIdFromToken(getCookie(c, ADMIN_SESSION_COOKIE));
    if (!id) throw new AppError("Not authenticated.", 401);
    const admin = await getAdminSessionUser(id);
    if (!admin) throw new AppError("Not authenticated.", 401);
    if (!allowed.includes(admin.role)) throw new AppError("Forbidden.", 403);
    c.set("admin", admin);
    await next();
  };
}

export const ANY_ADMIN: Array<AdminRole> = ["super_admin", "admin", "editor", "author"];

// Guards a route by the role matrix in lib/permissions.ts: "view" for reads,
// "manage" for anything that changes data.
export function requirePermission(module: AdminModule, level: Access) {
  return requireAdminRole(rolesWith(module, level));
}
