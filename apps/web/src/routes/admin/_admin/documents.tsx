import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Download, ExternalLink, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import type { DocumentRow } from "@aka/db";
import { api } from "#/lib/api-client";
import { DOCUMENT_CATEGORIES, documentCategoryLabel } from "#/lib/content";
import type { DocumentCategory } from "#/lib/content";
import { canManage } from "#/lib/permissions";
import { formatBytes, formatDate, todayIso } from "#/lib/format";
import {
  AdminPageHeader,
  ConfirmDialog,
  Field,
  SearchInput,
  StatusPill,
  Switch,
  TableMessage,
  errorToast,
} from "#/components/admin/ui";
import { FileField } from "#/components/admin/media-fields";
import { Pagination } from "#/components/admin/pagination";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "#/components/ui/table.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";

export const Route = createFileRoute("/admin/_admin/documents")({
  component: DocumentsPage,
});

const PAGE_SIZE = 20;

function DocumentsPage() {
  const { admin } = Route.useRouteContext();
  const canEdit = canManage(admin.role, "documents");
  const queryClient = useQueryClient();
  const [category, setCategory] = useState<DocumentCategory | "">("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<DocumentRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<DocumentRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["documents", { category, q, page }],
    queryFn: () =>
      api.get<{ items: Array<DocumentRow>; total: number }>("/documents", {
        category: category || undefined,
        q: q.trim() || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["documents"] });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/documents/${id}`),
    onSuccess: () => {
      toast.success("Deleted.");
      setDeleting(null);
      void invalidate();
    },
    onError: errorToast("Couldn't delete."),
  });

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Guides & Downloads"
        description="Forms, handbooks, policies and calendars listed on the Downloads page and in Downloads blocks."
        actions={
          <>
            <Button asChild variant="outline">
              <a href="/downloads" target="_blank" rel="noopener">
                <ExternalLink /> View page
              </a>
            </Button>
            {canEdit && (
              <Button onClick={() => setEditing("new")}>
                <Plus /> Add document
              </Button>
            )}
          </>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as DocumentCategory | "");
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          aria-label="Category"
        >
          <option value="">All categories</option>
          {DOCUMENT_CATEGORIES.map((c) => (
            <option key={c.key} value={c.key}>
              {c.label}
            </option>
          ))}
        </select>
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Search documents…"
        />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <Table className="min-w-[780px]">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Document</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Downloads</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data?.items ?? []).map((d) => (
              <TableRow key={d.id}>
                <TableCell className="max-w-md">
                  <div className="flex items-center gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
                      <FileText className="size-5" aria-hidden="true" />
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{d.title}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {d.file_name ?? d.file_url.split("/").pop()}{" "}
                        {d.size_bytes ? `· ${formatBytes(d.size_bytes)}` : ""}
                      </span>
                    </span>
                  </div>
                </TableCell>
                <TableCell className="text-sm">{documentCategoryLabel(d.category)}</TableCell>
                <TableCell className="text-sm whitespace-nowrap">
                  {formatDate(d.published_on)}
                </TableCell>
                <TableCell className="text-right text-sm tabular-nums">
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <Download className="size-3.5" aria-hidden="true" />
                    {d.download_count.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusPill
                    status={d.is_published ? "published" : "hidden"}
                    label={d.is_published ? "Published" : "Hidden"}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex justify-end gap-1">
                    <Button asChild variant="ghost" size="icon-sm" aria-label="Open file">
                      <a href={d.file_url} target="_blank" rel="noopener">
                        <ExternalLink />
                      </a>
                    </Button>
                    {canEdit && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setEditing(d)}
                          aria-label="Edit"
                        >
                          <Pencil />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="text-destructive"
                          onClick={() => setDeleting(d)}
                          aria-label="Delete"
                        >
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
        {!isLoading && data?.items.length === 0 && <TableMessage>No documents yet.</TableMessage>}
        <Pagination
          page={page}
          pageSize={PAGE_SIZE}
          total={data?.total ?? 0}
          onPageChange={setPage}
        />
      </div>
      <DocumentDialog editing={editing} onClose={() => setEditing(null)} onSaved={invalidate} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this document?"
        description={`“${deleting?.title}” will disappear from the website. The file itself stays in the media library.`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}

const blank = () => ({
  title: "",
  category: "guide" as DocumentCategory,
  description: "",
  fileUrl: "",
  fileName: "",
  mimeType: "",
  sizeBytes: null as number | null,
  isPublished: true,
  publishedOn: todayIso(),
});

function DocumentDialog({
  editing,
  onClose,
  onSaved,
}: {
  editing: DocumentRow | "new" | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState(blank());
  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  useEffect(() => {
    if (!editing) return;
    setForm(
      editing === "new"
        ? blank()
        : {
            title: editing.title,
            category: editing.category as DocumentCategory,
            description: editing.description ?? "",
            fileUrl: editing.file_url,
            fileName: editing.file_name ?? "",
            mimeType: editing.mime_type ?? "",
            sizeBytes: editing.size_bytes,
            isPublished: editing.is_published === 1,
            publishedOn: editing.published_on,
          },
    );
  }, [editing]);

  const save = useMutation({
    mutationFn: () =>
      editing === "new"
        ? api.post("/documents", form)
        : api.patch(`/documents/${(editing as DocumentRow).id}`, form),
    onSuccess: () => {
      toast.success("Saved.");
      onSaved();
      onClose();
    },
    onError: errorToast("Couldn't save."),
  });

  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{editing === "new" ? "Add document" : "Edit document"}</DialogTitle>
        </DialogHeader>
        <FileField
          label="File"
          value={form.fileUrl}
          fileName={form.fileName}
          onChange={(url, asset) =>
            set({
              fileUrl: url ?? "",
              fileName: asset?.filename ?? "",
              mimeType: asset?.mime_type ?? "",
              sizeBytes: asset?.size_bytes ?? null,
              ...(asset && !form.title
                ? { title: asset.filename.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") }
                : {}),
            })
          }
        />
        <Field label="Title">
          <Input value={form.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Category">
            <select
              value={form.category}
              onChange={(e) => set({ category: e.target.value as DocumentCategory })}
              className="h-9 rounded-md border border-input bg-white px-3 text-sm"
            >
              {DOCUMENT_CATEGORIES.map((c) => (
                <option key={c.key} value={c.key}>
                  {c.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <Input
              type="date"
              value={form.publishedOn}
              onChange={(e) => set({ publishedOn: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Description">
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => set({ description: e.target.value })}
            maxLength={500}
          />
        </Field>
        <Switch
          label="Published"
          checked={form.isPublished}
          onChange={(isPublished) => set({ isPublished })}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!form.fileUrl || form.title.trim().length < 3 || save.isPending}
            onClick={() => save.mutate()}
          >
            {save.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
