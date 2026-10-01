import { getPool } from "@aka/db";

export type ActivityAction = "created" | "updated" | "deleted" | "published" | "uploaded" | "signed_in" | "reordered";

// Audit trail for Admin → Activity. Never allowed to fail the request.
export function logActivity(
  adminId: number | null,
  action: ActivityAction,
  entity: string,
  entityId: number | null,
  summary: string,
) {
  getPool()
    .execute("INSERT INTO activity_log (admin_id, action, entity, entity_id, summary) VALUES (?, ?, ?, ?, ?)", [
      adminId,
      action,
      entity,
      entityId,
      summary.slice(0, 300),
    ])
    .catch((err: unknown) => console.error("Failed to write activity log:", err));
}
