import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Archive, ArchiveRestore, Inbox, Mail, Phone, Reply, Trash2 } from "lucide-react";
import type { ContactMessageRow } from "@aka/db";
import { api } from "#/lib/api-client";
import { canManage } from "#/lib/permissions";
import { formatDateTime, timeAgo } from "#/lib/format";
import { cn } from "#/lib/utils";
import { AdminPageHeader, ConfirmDialog, SearchInput, Segmented, errorToast } from "#/components/admin/ui";
import { Pagination } from "#/components/admin/pagination";
import { Button } from "#/components/ui/button.tsx";

export const Route = createFileRoute("/admin/_admin/messages")({
  component: MessagesPage,
});

type Filter = "inbox" | "new" | "archived";
const PAGE_SIZE = 25;

function MessagesPage() {
  const { admin } = Route.useRouteContext();
  const canDelete = canManage(admin.role, "messages");
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<Filter>("inbox");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  // Held as a copy so it stays open after being marked read (and leaving "Unread").
  const [selected, setSelected] = useState<ContactMessageRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { data } = useQuery({
    queryKey: ["messages", { filter, q, page }],
    queryFn: () =>
      api.get<{ items: Array<ContactMessageRow>; total: number; counts: Record<string, number> }>("/messages", {
        status: filter === "inbox" ? undefined : filter,
        q: q.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["messages"] });

  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: number; status: ContactMessageRow["status"] }) => api.patch(`/messages/${id}`, { status }),
    onSuccess: invalidate,
    onError: errorToast("Couldn't update the message."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/messages/${id}`),
    onSuccess: () => {
      toast.success("Message deleted.");
      setDeleting(false);
      setSelected(null);
      void invalidate();
    },
    onError: errorToast("Couldn't delete."),
  });

  // Opening a new message marks it read.
  useEffect(() => {
    if (selected?.status === "new") {
      setStatus.mutate({ id: selected.id, status: "read" });
      setSelected({ ...selected, status: "read" });
    }
  }, [selected?.id]);

  const counts = data?.counts ?? {};

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader title="Messages" description="Enquiries sent through the Contact Us form." />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={filter}
          onChange={(f) => {
            setFilter(f);
            setPage(1);
            setSelected(null);
          }}
          options={[
            { value: "inbox", label: "Inbox", count: (counts.new ?? 0) + (counts.read ?? 0) },
            { value: "new", label: "Unread", count: counts.new ?? 0 },
            { value: "archived", label: "Archived", count: counts.archived ?? 0 },
          ]}
        />
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Search messages…"
        />
      </div>

      <div className="grid min-h-[60vh] overflow-hidden rounded-xl border border-border bg-white lg:grid-cols-[380px_1fr]">
        <div className="border-b border-border lg:border-r lg:border-b-0">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center p-10 text-center text-sm text-muted-foreground">
              <Inbox className="mb-2 size-8" aria-hidden="true" />
              No messages here.
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {items.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    onClick={() => setSelected(m)}
                    className={cn("block w-full px-4 py-3 text-left transition-colors hover:bg-secondary/60", selected?.id === m.id && "bg-secondary")}
                  >
                    <div className="flex items-center gap-2">
                      {m.status === "new" && <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Unread" />}
                      <span className={cn("min-w-0 flex-1 truncate text-sm", m.status === "new" ? "font-bold" : "font-medium")}>{m.name}</span>
                      <span className="shrink-0 text-xs text-muted-foreground">{timeAgo(m.created_at)}</span>
                    </div>
                    <p className={cn("mt-0.5 truncate text-sm", m.status === "new" ? "font-semibold" : "text-foreground/80")}>{m.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">{m.message}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
        </div>

        <div className="p-6">
          {selected ? (
            <article>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{selected.subject}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{formatDateTime(selected.created_at)}</p>
                </div>
                <div className="flex gap-1">
                  <Button asChild size="sm">
                    <a href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: ${selected.subject}`)}`}>
                      <Reply /> Reply
                    </a>
                  </Button>
                  {selected.status === "archived" ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatus.mutate({ id: selected.id, status: "read" });
                        setSelected(null);
                        toast.success("Restored to the inbox.");
                      }}
                    >
                      <ArchiveRestore /> Restore
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setStatus.mutate({ id: selected.id, status: "archived" });
                        setSelected(null);
                        toast.success("Archived.");
                      }}
                    >
                      <Archive /> Archive
                    </Button>
                  )}
                  {canDelete && (
                    <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleting(true)} aria-label="Delete">
                      <Trash2 />
                    </Button>
                  )}
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 rounded-lg bg-secondary/60 px-4 py-3 text-sm">
                <span className="font-semibold">{selected.name}</span>
                <a href={`mailto:${selected.email}`} className="flex items-center gap-1.5 text-primary hover:underline">
                  <Mail className="size-3.5" aria-hidden="true" /> {selected.email}
                </a>
                {selected.phone && (
                  <a href={`tel:${selected.phone}`} className="flex items-center gap-1.5 text-primary hover:underline">
                    <Phone className="size-3.5" aria-hidden="true" /> {selected.phone}
                  </a>
                )}
              </div>
              <p className="mt-6 leading-relaxed whitespace-pre-line">{selected.message}</p>
            </article>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">Select a message to read it.</div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title="Delete this message?"
        description="It will be permanently removed."
        pending={remove.isPending}
        onConfirm={() => selected && remove.mutate(selected.id)}
      />
    </div>
  );
}
