import { Hono } from "hono";
import { requirePermission } from "../../middleware/require-auth.js";
import { AppError } from "../../middleware/error-handler.js";
import { SETTINGS_KEYS, settingsSchemas } from "#/lib/settings";
import type { SettingsKey } from "#/lib/settings";
import * as service from "./service.js";

export const settingsRoute = new Hono()
  .get("/", requirePermission("settings", "view"), async (c) =>
    c.json({ settings: await service.getAllSettings() }),
  )
  .put("/:key", requirePermission("settings", "manage"), async (c) => {
    const key = c.req.param("key") as SettingsKey;
    if (!SETTINGS_KEYS.includes(key)) throw new AppError("Unknown settings group.", 404);
    const parsed = settingsSchemas[key].safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) {
      throw new AppError(parsed.error.issues[0]?.message ?? "Invalid settings.", 422);
    }
    return c.json({ value: await service.saveSetting(c.get("admin").id, key, parsed.data) });
  });
