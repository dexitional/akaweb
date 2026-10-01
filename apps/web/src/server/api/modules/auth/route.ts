import { Hono } from "hono";
import { z } from "zod";
import { deleteCookie, setCookie } from "hono/cookie";
import { ADMIN_SESSION_COOKIE, ADMIN_SESSION_TTL_SECONDS } from "#/server/session";
import { ANY_ADMIN, requireAdminRole } from "../../middleware/require-auth.js";
import { optionalText, optionalUrl } from "../../lib/fields.js";
import * as service from "./service.js";
import { validate } from "../../lib/validate.js";

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1, "Password is required"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8, "New password must be at least 8 characters").max(200),
});

export const profileSchema = z.object({
  fullName: z.string().trim().min(2).max(150).optional(),
  position: optionalText(120),
  phone: optionalText(30),
  photoUrl: optionalUrl,
});

export const authRoute = new Hono()
  .post("/login", validate("json", loginSchema), async (c) => {
    const { adminId, token } = await service.login(c.req.valid("json"));
    setCookie(c, ADMIN_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    });
    return c.json({ adminId });
  })
  .post("/logout", (c) => {
    deleteCookie(c, ADMIN_SESSION_COOKIE, { path: "/" });
    return c.json({ ok: true });
  })
  .get("/me", requireAdminRole(ANY_ADMIN), async (c) =>
    c.json({ admin: await service.getProfile(c.get("admin").id) }),
  )
  .patch("/me", requireAdminRole(ANY_ADMIN), validate("json", profileSchema), async (c) =>
    c.json({ admin: await service.updateProfile(c.get("admin").id, c.req.valid("json")) }),
  )
  .post(
    "/me/password",
    requireAdminRole(ANY_ADMIN),
    validate("json", changePasswordSchema),
    async (c) => {
      await service.changePassword(c.get("admin").id, c.req.valid("json"));
      return c.json({ ok: true });
    },
  );
