import { getPool } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { DEFAULT_SETTINGS, SETTINGS_KEYS, mergeSetting } from "#/lib/settings";
import type { SettingsKey, SiteSettings } from "#/lib/settings";
import { logActivity } from "../../lib/activity.js";

export async function getAllSettings(): Promise<SiteSettings> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    "SELECT setting_key, value FROM site_settings",
  );
  const stored = new Map(rows.map((r) => [r.setting_key as string, r.value as unknown]));
  const result = { ...DEFAULT_SETTINGS } as Record<SettingsKey, unknown>;
  for (const key of SETTINGS_KEYS) result[key] = mergeSetting(key, stored.get(key));
  return result as SiteSettings;
}

export async function saveSetting<TKey extends SettingsKey>(
  adminId: number,
  key: TKey,
  value: SiteSettings[TKey],
) {
  await getPool().execute(
    `INSERT INTO site_settings (setting_key, value, updated_by) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE value = VALUES(value), updated_by = VALUES(updated_by)`,
    [key, JSON.stringify(value), adminId],
  );
  logActivity(adminId, "updated", "settings", null, `Updated ${key} settings`);
  return value;
}
