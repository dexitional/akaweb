// Client-safe session surface, imported by the admin route's `beforeLoad`
// guard — which routeTree.gen.ts statically imports for BOTH the client and
// server bundles. This file must stay free of DB/JWT imports; the real
// implementation lives in session-core.ts and is loaded dynamically, so the
// bundler code-splits it into a chunk the browser never fetches.
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";

export const ADMIN_SESSION_COOKIE = "aka_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 hours

export type { AdminSessionUser } from "./session-core.js";

export const getAdminSession = createServerFn({ method: "GET" }).handler(async () => {
  const { readAdminIdFromToken, getAdminSessionUser } = await import("./session-core.js");
  const id = await readAdminIdFromToken(getCookie(ADMIN_SESSION_COOKIE));
  if (!id) return null;
  return getAdminSessionUser(id);
});
