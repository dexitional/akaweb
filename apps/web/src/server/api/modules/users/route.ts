import { Hono } from "hono";
import { z } from "zod";
import { requirePermission } from "../../middleware/require-auth.js";
import { optionalText } from "../../lib/fields.js";
import { idParam } from "../../lib/query.js";
import * as service from "./service.js";
import { validate } from "../../lib/validate.js";

const role = z.enum(["super_admin", "admin", "editor", "author"]);
const password = z.string().min(8, "Password must be at least 8 characters").max(200);

export const createUserSchema = z.object({
  fullName: z.string().trim().min(2).max(150),
  email: z.string().trim().toLowerCase().email().max(150),
  role,
  position: optionalText(120),
  phone: optionalText(30),
  password,
});

export const updateUserSchema = z.object({
  fullName: z.string().trim().min(2).max(150).optional(),
  email: z.string().trim().toLowerCase().email().max(150).optional(),
  role: role.optional(),
  position: optionalText(120),
  phone: optionalText(30),
  isActive: z.boolean().optional(),
  password: password.optional(),
});

export const usersRoute = new Hono()
  .use("*", requirePermission("users", "manage"))
  .get("/", async (c) => c.json({ users: await service.listUsers() }))
  .post("/", validate("json", createUserSchema), async (c) =>
    c.json({ user: await service.createUser(c.get("admin").id, c.req.valid("json")) }, 201),
  )
  .patch("/:id", validate("json", updateUserSchema), async (c) =>
    c.json({ user: await service.updateUser(c.get("admin").id, idParam(c.req.param("id")), c.req.valid("json")) }),
  )
  .delete("/:id", async (c) => {
    await service.deleteUser(c.get("admin").id, idParam(c.req.param("id")));
    return c.body(null, 204);
  });
