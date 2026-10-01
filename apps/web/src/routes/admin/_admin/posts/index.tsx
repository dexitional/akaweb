import { useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CalendarDays, ExternalLink, Eye, MapPin, Pencil, Pin, Plus, Star, Trash2 } from "lucide-react";
import type { PostType } from "@aka/db";
import { api } from "#/lib/api-client";
import { POST_TYPES, postTypeDef } from "#/lib/content";
import { canPublishPosts } from "#/lib/permissions";
import { formatDate, formatEventRange } from "#/lib/format";
import { AdminPageHeader, ConfirmDialog, SearchInput, Segmented, StatusPill, TableMessage, errorToast } from "#/components/admin/ui";
import { Button } from "#/components/ui/button.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table.tsx";
import { Pagination } from "#/components/admin/pagination";

const searchSchema = z.object({
  type: z.enum(["news", "event", "announcement"]).catch("news"),
  status: z.enum(["draft", "published", "archived"]).optional().catch(undefined),
});

export const Route = createFileRoute("/admin/_admin/posts/")({
  validateSearch: searchSchema,
  component: PostsList,
});

interface PostListItem {
  id: number;
  type: PostType;
  slug: string;
  title: string;
  cover_image_url: string | null;
  category: string | null;
  is_featured: 0 | 1;
  is_pinned: 0 | 1;
  status: "draft" | "published" | "archived";
  published_at: string;
  event_start: string | null;
  event_end: string | null;
  venue: string | null;
  view_count: number;
  author_id: number | null;
  author_name: string | null;
}

const PAGE_SIZE = 20;

function PostsList() {
  const { admin } = Route.useRouteContext();
  const { type, status } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [deleting, setDeleting] = useState<PostListItem | null>(null);
  const publisher = canPublishPosts(admin.role);
  const def = postTypeDef(type);

  const { data, isLoading } = useQuery({
    queryKey: ["posts", { type, status, q, page }],
    queryFn: () =>
      api.get<{ items: Array<PostListItem>; total: number; counts: Array<{ type: string; status: string; n: number }> }>("/posts", {
        type,
        status,
        q: q.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
  const count = (t: string, s?: string) => (data?.counts ?? []).filter((c) => c.type === t && (!s || c.status === s)).reduce((a, c) => a + c.n, 0);

  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/posts/${id}`),
    onSuccess: () => {
      toast.success("Deleted.");
      setDeleting(null);
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: errorToast("Couldn't delete."),
  });

  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="News & Events"
        description={publisher ? "News stories, events and official announcements." : "Your drafts. An editor reviews and publishes them."}
        actions={
          <Button asChild>
            <Link to="/admin/posts/$postId" params={{ postId: "new" }} search={{ type }}>
              <Plus /> New {def.singular.toLowerCase()}
            </Link>
          </Button>
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={type}
          onChange={(t) => {
            setPage(1);
            void navigate({ search: { type: t, status } });
          }}
          options={POST_TYPES.map((t) => ({ value: t.type, label: t.label, count: count(t.type) }))}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={status ?? ""}
            onChange={(e) => {
              setPage(1);
              void navigate({ search: { type, status: (e.target.value || undefined) as "draft" | undefined } });
            }}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
            aria-label="Status"
          >
            <option value="">All statuses</option>
            <option value="published">Published ({count(type, "published")})</option>
            <option value="draft">Drafts ({count(type, "draft")})</option>
            <option value="archived">Archived ({count(type, "archived")})</option>
          </select>
          <SearchInput
            value={q}
            onChange={(v) => {
              setQ(v);
              setPage(1);
            }}
            placeholder={`Search ${def.label.toLowerCase()}…`}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <Table className="min-w-[900px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Title</TableHead>
              <TableHead>{type === "event" ? "When" : "Category"}</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Author</TableHead>
              <TableHead className="text-right">Views</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((p) => {
              const scheduled = p.status === "published" && p.published_at > now;
              const editable = publisher || (p.author_id === admin.id && p.status === "draft");
              return (
                <TableRow key={p.id}>
                  <TableCell className="max-w-md">
                    <Link to="/admin/posts/$postId" params={{ postId: String(p.id) }} className="flex items-center gap-3 hover:text-primary">
                      {p.cover_image_url ? (
                        <img src={p.cover_image_url} alt="" className="size-11 shrink-0 rounded-md object-cover" />
                      ) : (
                        <span className="size-11 shrink-0 rounded-md bg-gradient-to-br from-primary to-brand-green" />
                      )}
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          {p.is_pinned === 1 && <Pin className="size-3.5 shrink-0 text-brand-flame" aria-label="Pinned" />}
                          {p.is_featured === 1 && <Star className="size-3.5 shrink-0 fill-amber-400 text-amber-400" aria-label="Featured" />}
                          <span className="truncate font-semibold">{p.title}</span>
                        </span>
                        <span className="block text-xs text-muted-foreground">{formatDate(p.published_at)}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {type === "event" && p.event_start ? (
                      <span>
                        <span className="flex items-center gap-1 whitespace-nowrap">
                          <CalendarDays className="size-3.5 text-muted-foreground" aria-hidden="true" />
                          {formatEventRange(p.event_start, p.event_end)}
                        </span>
                        {p.venue && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="size-3" aria-hidden="true" />
                            {p.venue}
                          </span>
                        )}
                      </span>
                    ) : (
                      (p.category ?? <span className="text-muted-foreground italic">None</span>)
                    )}
                  </TableCell>
                  <TableCell>
                    <StatusPill status={scheduled ? "scheduled" : p.status} label={scheduled ? `Scheduled · ${formatDate(p.published_at)}` : undefined} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.author_name ?? "—"}</TableCell>
                  <TableCell className="text-right text-sm tabular-nums">
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Eye className="size-3.5" aria-hidden="true" />
                      {p.view_count.toLocaleString()}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {p.status === "published" && !scheduled && (
                        <Button asChild variant="ghost" size="icon-sm" aria-label="View on site">
                          <a href={`${def.path}/${p.slug}`} target="_blank" rel="noopener">
                            <ExternalLink />
                          </a>
                        </Button>
                      )}
                      {editable && (
                        <>
                          <Button asChild variant="ghost" size="icon-sm" aria-label="Edit">
                            <Link to="/admin/posts/$postId" params={{ postId: String(p.id) }}>
                              <Pencil />
                            </Link>
                          </Button>
                          <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleting(p)} aria-label="Delete">
                            <Trash2 />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
        {isLoading && <TableMessage>Loading…</TableMessage>}
        {!isLoading && data?.items.length === 0 && <TableMessage>Nothing here yet.</TableMessage>}
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete this ${def.singular.toLowerCase()}?`}
        description={`“${deleting?.title}” will be permanently removed.`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
