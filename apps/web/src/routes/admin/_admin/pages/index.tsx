import { useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, Copy, ExternalLink, EyeOff, Layers, Pencil, Plus, Trash2 } from "lucide-react";
import type { PageSection } from "@aka/db";
import { api } from "#/lib/api-client";
import { SECTIONS, sectionDef } from "#/lib/content";
import { canManage } from "#/lib/permissions";
import { timeAgo } from "#/lib/format";
import { AdminPageHeader, ConfirmDialog, SearchInput, Segmented, StatusPill, TableMessage, errorToast } from "#/components/admin/ui";
import { Button } from "#/components/ui/button.tsx";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "#/components/ui/table.tsx";

export const Route = createFileRoute("/admin/_admin/pages/")({
  component: PagesList,
});

interface PageListItem {
  id: number;
  section: PageSection;
  slug: string;
  title: string;
  summary: string | null;
  hero_image_url: string | null;
  status: "draft" | "published";
  show_in_nav: 0 | 1;
  sort_order: number;
  updated_at: string;
  block_count: number;
  updated_by_name: string | null;
}

function PagesList() {
  const { admin } = Route.useRouteContext();
  const canEdit = canManage(admin.role, "pages");
  const queryClient = useQueryClient();
  const [section, setSection] = useState<PageSection>("about");
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<PageListItem | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["pages"],
    queryFn: () => api.get<{ pages: Array<PageListItem> }>("/pages").then((r) => r.pages),
  });
  const pages = data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["pages"] });

  const query = q.trim().toLowerCase();
  const visible = query
    ? pages.filter((p) => p.title.toLowerCase().includes(query) || p.slug.includes(query))
    : pages.filter((p) => p.section === section);

  const reorder = useMutation({
    mutationFn: (ids: Array<number>) => api.post("/pages/reorder", { ids }),
    onSuccess: invalidate,
    onError: errorToast("Couldn't reorder pages."),
  });
  const duplicate = useMutation({
    mutationFn: (id: number) => api.post<{ page: { id: number } }>(`/pages/${id}/duplicate`),
    onSuccess: () => {
      toast.success("Page duplicated as a draft.");
      void invalidate();
    },
    onError: errorToast("Couldn't duplicate the page."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/pages/${id}`),
    onSuccess: () => {
      toast.success("Page deleted.");
      setDeleting(null);
      void invalidate();
    },
    onError: errorToast("Couldn't delete the page."),
  });

  const move = (index: number, delta: number) => {
    const ids = visible.map((p) => p.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id!);
    queryClient.setQueryData<Array<PageListItem>>(["pages"], (old) =>
      old?.map((p) => (ids.includes(p.id) ? { ...p, sort_order: ids.indexOf(p.id) } : p)).sort((a, b) => a.sort_order - b.sort_order),
    );
    reorder.mutate(ids);
  };

  const def = sectionDef(section)!;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Pages"
        description="Every page under About Us, Academics, Admissions, Student Life and Alumni. Order here is the order in the menu."
        actions={
          canEdit && (
            <Button asChild>
              <Link to="/admin/pages/$pageId" params={{ pageId: "new" }} search={{ section }}>
                <Plus /> New page
              </Link>
            </Button>
          )
        }
      />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented
          value={section}
          onChange={(v) => {
            setSection(v);
            setQ("");
          }}
          options={SECTIONS.map((s) => ({ value: s.key, label: s.label, count: pages.filter((p) => p.section === s.key).length }))}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Search all pages…" />
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        {!query && (
          <div className="flex items-center justify-between gap-3 border-b border-border bg-secondary/40 px-6 py-3 text-sm">
            <span className="text-muted-foreground">
              Public address: <span className="font-mono text-foreground">{def.path}/…</span>
            </span>
            <a href={def.path} target="_blank" rel="noopener" className="inline-flex items-center gap-1 font-medium text-primary hover:underline">
              View section <ExternalLink className="size-3.5" />
            </a>
          </div>
        )}
        <Table className="min-w-[820px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {!query && canEdit && <TableHead className="w-20">Order</TableHead>}
              <TableHead>Page</TableHead>
              {query && <TableHead>Section</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead>Blocks</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.map((p, i) => (
              <TableRow key={p.id}>
                {!query && canEdit && (
                  <TableCell>
                    <div className="flex">
                      <Button variant="ghost" size="icon-xs" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                        <ArrowUp />
                      </Button>
                      <Button variant="ghost" size="icon-xs" disabled={i === visible.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                        <ArrowDown />
                      </Button>
                    </div>
                  </TableCell>
                )}
                <TableCell className="max-w-md">
                  <Link to="/admin/pages/$pageId" params={{ pageId: String(p.id) }} className="flex items-center gap-3 hover:text-primary">
                    {p.hero_image_url ? (
                      <img src={p.hero_image_url} alt="" className="size-10 shrink-0 rounded-md object-cover" />
                    ) : (
                      <span className="size-10 shrink-0 rounded-md bg-gradient-to-br from-primary to-brand-green" />
                    )}
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{p.title}</span>
                      <span className="block truncate font-mono text-xs text-muted-foreground">/{p.slug}</span>
                    </span>
                  </Link>
                </TableCell>
                {query && <TableCell className="text-sm">{sectionDef(p.section)?.label}</TableCell>}
                <TableCell>
                  <div className="flex items-center gap-2">
                    <StatusPill status={p.status} />
                    {!p.show_in_nav && (
                      <span title="Hidden from the menu" className="text-muted-foreground">
                        <EyeOff className="size-4" aria-label="Hidden from the menu" />
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center gap-1 text-sm text-muted-foreground">
                    <Layers className="size-3.5" aria-hidden="true" />
                    {p.block_count}
                  </span>
                </TableCell>
                <TableCell className="text-sm whitespace-nowrap text-muted-foreground">
                  {timeAgo(p.updated_at)}
                  {p.updated_by_name && <span className="block text-xs">by {p.updated_by_name}</span>}
                </TableCell>
                <TableCell>
                  <div className="flex items-center justify-end gap-1">
                    {p.status === "published" && (
                      <Button asChild variant="ghost" size="icon-sm" aria-label="View on site">
                        <a href={`${sectionDef(p.section)?.path}/${p.slug}`} target="_blank" rel="noopener">
                          <ExternalLink />
                        </a>
                      </Button>
                    )}
                    {canEdit && (
                      <>
                        <Button asChild variant="ghost" size="icon-sm" aria-label="Edit">
                          <Link to="/admin/pages/$pageId" params={{ pageId: String(p.id) }}>
                            <Pencil />
                          </Link>
                        </Button>
                        <Button variant="ghost" size="icon-sm" onClick={() => duplicate.mutate(p.id)} aria-label="Duplicate">
                          <Copy />
                        </Button>
                        <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleting(p)} aria-label="Delete">
                          <Trash2 />
                        </Button>
                      </>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {isLoading && <TableMessage>Loading…</TableMessage>}
        {!isLoading && visible.length === 0 && <TableMessage>{query ? "No pages match your search." : `No pages in ${def.label} yet.`}</TableMessage>}
      </div>

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this page?"
        description={`“${deleting?.title}” will be removed from the website and its menu. This can't be undone.`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}
