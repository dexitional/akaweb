import { useCallback, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronLeft, ChevronRight, FileText, ImageIcon, Loader2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { api } from "#/lib/api-client";
import { cn } from "#/lib/utils";
import { formatBytes } from "#/lib/format";
import { DOCUMENT_ACCEPT, IMAGE_ACCEPT, MEDIA_FOLDERS, isImage, uploadToLibrary } from "#/lib/upload";
import type { MediaAsset, MediaFolder } from "#/lib/upload";
import { Button } from "#/components/ui/button.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx";
import { SearchInput } from "./ui";

export type MediaKind = "image" | "document" | "any";

interface UploadJob {
  id: string;
  name: string;
  progress: number;
  error?: string;
}

// Upload queue with per-file progress. Uploaded files land in `folder`.
export function useUploader(folder: MediaFolder, onUploaded?: (asset: MediaAsset) => void) {
  const queryClient = useQueryClient();
  const [jobs, setJobs] = useState<Array<UploadJob>>([]);

  const upload = useCallback(
    async (files: Array<File>) => {
      const results: Array<MediaAsset> = [];
      await Promise.all(
        files.map(async (file) => {
          const id = `${file.name}-${file.size}-${Math.random()}`;
          setJobs((j) => [...j, { id, name: file.name, progress: 0 }]);
          try {
            const asset = await uploadToLibrary(file, folder, (p) =>
              setJobs((j) => j.map((job) => (job.id === id ? { ...job, progress: p } : job))),
            );
            results.push(asset);
            onUploaded?.(asset);
            setJobs((j) => j.filter((job) => job.id !== id));
          } catch (err) {
            const message = err instanceof Error ? err.message : "Upload failed.";
            setJobs((j) => j.map((job) => (job.id === id ? { ...job, error: message } : job)));
            toast.error(`${file.name}: ${message}`);
            setTimeout(() => setJobs((j) => j.filter((job) => job.id !== id)), 6000);
          }
        }),
      );
      if (results.length) {
        void queryClient.invalidateQueries({ queryKey: ["media"] });
        toast.success(results.length === 1 ? "File uploaded." : `${results.length} files uploaded.`);
      }
      return results;
    },
    [folder, onUploaded, queryClient],
  );

  return { jobs, upload };
}

export function UploadDropzone({
  kind,
  folder,
  onUploaded,
  compact = false,
}: {
  kind: MediaKind;
  folder: MediaFolder;
  onUploaded?: (asset: MediaAsset) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const { jobs, upload } = useUploader(folder, onUploaded);
  const accept = kind === "image" ? IMAGE_ACCEPT : kind === "document" ? DOCUMENT_ACCEPT : `${IMAGE_ACCEPT},${DOCUMENT_ACCEPT}`;

  const handleFiles = (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (files.length) void upload(files);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed text-center transition-colors",
          compact ? "px-4 py-5" : "px-6 py-10",
          dragging ? "border-primary bg-primary/5" : "border-input bg-secondary/40 hover:border-primary/50 hover:bg-secondary",
        )}
      >
        <UploadCloud className={cn("text-primary", compact ? "size-6" : "size-9")} aria-hidden="true" />
        <span className="mt-2 text-sm font-semibold">Drop files here or click to upload</span>
        <span className="mt-0.5 text-xs text-muted-foreground">
          {kind === "image" ? "JPG, PNG, WebP, GIF or AVIF up to 12 MB" : kind === "document" ? "PDF, Word, Excel or PowerPoint up to 40 MB" : "Images, PDFs and Office documents"}
        </span>
      </button>
      <input ref={inputRef} type="file" accept={accept} multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      {jobs.length > 0 && (
        <ul className="mt-3 space-y-2">
          {jobs.map((job) => (
            <li key={job.id} className="rounded-lg border border-border bg-white px-3 py-2 text-xs">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate font-medium">{job.name}</span>
                <span className={job.error ? "text-destructive" : "text-muted-foreground"}>
                  {job.error ? "Failed" : `${Math.round(job.progress * 100)}%`}
                </span>
              </div>
              {!job.error && (
                <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-secondary">
                  <div className="h-full bg-primary transition-all" style={{ width: `${job.progress * 100}%` }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MediaThumb({ asset, className }: { asset: Pick<MediaAsset, "url" | "mime_type" | "alt_text" | "filename">; className?: string }) {
  return isImage(asset) ? (
    <img src={asset.url} alt={asset.alt_text ?? ""} loading="lazy" className={cn("size-full object-cover", className)} />
  ) : (
    <div className={cn("flex size-full flex-col items-center justify-center gap-1 bg-secondary p-2 text-primary", className)}>
      <FileText className="size-8" aria-hidden="true" />
      <span className="max-w-full truncate text-[10px] font-bold uppercase">{asset.filename.split(".").pop()}</span>
    </div>
  );
}

const PAGE_SIZE = 24;

// Searchable, filterable grid of the media library. In "select" mode a click
// picks the file; otherwise it opens it (onOpen).
export function MediaBrowser({
  kind = "any",
  defaultFolder,
  selectedUrl,
  onSelect,
  onOpen,
}: {
  kind?: MediaKind;
  defaultFolder?: MediaFolder;
  selectedUrl?: string | null;
  onSelect?: (asset: MediaAsset) => void;
  onOpen?: (asset: MediaAsset) => void;
}) {
  const [q, setQ] = useState("");
  const [folder, setFolder] = useState<MediaFolder | "">("");
  const [typeFilter, setTypeFilter] = useState<"image" | "document" | "">(kind === "any" ? "" : kind);
  const [page, setPage] = useState(1);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["media", { q, folder, typeFilter, page }],
    queryFn: () =>
      api.get<{ items: Array<MediaAsset>; total: number }>("/media", {
        q: q.trim() || undefined,
        folder: folder || undefined,
        kind: typeFilter || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
    placeholderData: keepPreviousData,
  });
  const items = data?.items ?? [];
  const pages = Math.max(1, Math.ceil((data?.total ?? 0) / PAGE_SIZE));

  return (
    <div className="flex flex-col gap-4">
      {/* In picker mode a fresh upload is selected straight away. */}
      <UploadDropzone kind={kind} folder={defaultFolder ?? "general"} onUploaded={onSelect} compact={Boolean(onSelect)} />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={q}
          onChange={(v) => {
            setQ(v);
            setPage(1);
          }}
          placeholder="Search files…"
        />
        <select
          value={folder}
          onChange={(e) => {
            setFolder(e.target.value as MediaFolder | "");
            setPage(1);
          }}
          className="h-9 rounded-md border border-input bg-white px-3 text-sm"
          aria-label="Folder"
        >
          <option value="">All folders</option>
          {MEDIA_FOLDERS.map((f) => (
            <option key={f.key} value={f.key}>
              {f.label}
            </option>
          ))}
        </select>
        {kind === "any" && (
          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value as "image" | "document" | "");
              setPage(1);
            }}
            className="h-9 rounded-md border border-input bg-white px-3 text-sm"
            aria-label="File type"
          >
            <option value="">All types</option>
            <option value="image">Images</option>
            <option value="document">Documents</option>
          </select>
        )}
        {isFetching && <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Loading" />}
        <span className="ml-auto text-xs text-muted-foreground">
          {data?.total ?? 0} {data?.total === 1 ? "file" : "files"}
        </span>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="aspect-square animate-pulse rounded-lg bg-secondary" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="flex flex-col items-center rounded-xl border border-dashed border-border py-14 text-center">
          <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
          <p className="mt-2 text-sm font-medium">No files yet</p>
          <p className="text-xs text-muted-foreground">Upload something above to get started.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
          {items.map((asset) => {
            const selected = selectedUrl === asset.url;
            return (
              <li key={asset.id}>
                <button
                  type="button"
                  onClick={() => (onSelect ? onSelect(asset) : onOpen?.(asset))}
                  title={asset.filename}
                  className={cn(
                    "group relative block w-full overflow-hidden rounded-lg border bg-white text-left transition-all hover:shadow-md",
                    selected ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/40",
                  )}
                >
                  <div className="aspect-square overflow-hidden">
                    <MediaThumb asset={asset} className="transition-transform group-hover:scale-105" />
                  </div>
                  <div className="border-t border-border px-2 py-1.5">
                    <p className="truncate text-xs font-medium">{asset.filename}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {asset.width && asset.height ? `${asset.width}×${asset.height} · ` : ""}
                      {formatBytes(asset.size_bytes)}
                    </p>
                  </div>
                  {selected && <CheckCircle2 className="absolute top-1.5 right-1.5 size-5 rounded-full bg-white text-primary" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => setPage(page - 1)} aria-label="Previous page">
            <ChevronLeft />
          </Button>
          <span className="text-sm tabular-nums">
            {page} / {pages}
          </span>
          <Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => setPage(page + 1)} aria-label="Next page">
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}

export function MediaPickerDialog({
  open,
  onOpenChange,
  kind = "image",
  folder,
  selectedUrl,
  onSelect,
  title,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  kind?: MediaKind;
  folder?: MediaFolder;
  selectedUrl?: string | null;
  onSelect: (asset: MediaAsset) => void;
  title?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle>{title ?? (kind === "document" ? "Choose a file" : "Choose an image")}</DialogTitle>
          <DialogDescription>Pick from the media library or upload something new — new uploads appear first.</DialogDescription>
        </DialogHeader>
        {open && (
          <MediaBrowser
            kind={kind}
            defaultFolder={folder}
            selectedUrl={selectedUrl}
            onSelect={(asset) => {
              onSelect(asset);
              onOpenChange(false);
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
