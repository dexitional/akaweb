import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { api } from "#/lib/api-client";
import { formatDateTime, timeAgo } from "#/lib/format";
import { AdminPageHeader, TableMessage } from "#/components/admin/ui";
import { Pagination } from "#/components/admin/pagination";

export const Route = createFileRoute("/admin/_admin/activity")({
  component: ActivityPage,
});

interface Entry {
  id: number;
  action: string;
  entity: string;
  summary: string;
  created_at: string;
  admin_name: string | null;
}

const ENTITIES = ["page", "post", "spotlight", "department", "person", "document", "media", "settings", "user", "session"];
const ACTION_STYLES: Record<string, string> = {
  created: "bg-emerald-50 text-emerald-700",
  published: "bg-sky-50 text-sky-700",
  updated: "bg-amber-50 text-amber-800",
  deleted: "bg-rose-50 text-rose-700",
  uploaded: "bg-indigo-50 text-indigo-700",
  signed_in: "bg-slate-100 text-slate-600",
  reordered: "bg-slate-100 text-slate-600",
};
const PAGE_SIZE = 40;

function ActivityPage() {
  const [entity, setEntity] = useState("");
  const [page, setPage] = useState(1);
  const { data, isLoading } = useQuery({
    queryKey: ["activity", { entity, page }],
    queryFn: () => api.get<{ items: Array<Entry>; total: number }>("/activity", { entity: entity || undefined, page, pageSize: PAGE_SIZE }),
    placeholderData: keepPreviousData,
  });
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Activity log"
        description="An audit trail of every change made in the CMS."
        actions={
          <select
            value={entity}
            onChange={(e) => {
              setEntity(e.target.value);
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm capitalize"
            aria-label="Filter"
          >
            <option value="">Everything</option>
            {ENTITIES.map((e) => (
              <option key={e} value={e}>
                {e === "session" ? "Sign-ins" : `${e}s`}
              </option>
            ))}
          </select>
        }
      />
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <ul className="divide-y divide-border">
          {(data?.items ?? []).map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-6 py-3 text-sm">
              <span className={`w-24 shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-semibold capitalize ${ACTION_STYLES[e.action] ?? ""}`}>{e.action.replace("_", " ")}</span>
              <span className="min-w-0 flex-1">
                <span className="font-semibold">{e.admin_name ?? "Deleted user"}</span> <span className="text-muted-foreground">— {e.summary}</span>
              </span>
              <span className="text-xs text-muted-foreground" title={formatDateTime(e.created_at)}>
                {timeAgo(e.created_at)}
              </span>
            </li>
          ))}
        </ul>
        {isLoading && <TableMessage>Loading…</TableMessage>}
        {!isLoading && data?.items.length === 0 && <TableMessage>No activity recorded.</TableMessage>}
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
      </div>
    </div>
  );
}
