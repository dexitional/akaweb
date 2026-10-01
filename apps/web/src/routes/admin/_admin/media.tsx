import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ExternalLink, Loader2, Trash2, TriangleAlert } from "lucide-react";
import { api } from "#/lib/api-client";
import { formatBytes, formatDateTime } from "#/lib/format";
import { MEDIA_FOLDERS, isImage } from "#/lib/upload";
import type { MediaAsset, MediaFolder } from "#/lib/upload";
import { AdminPageHeader, Field, errorToast } from "#/components/admin/ui";
import { MediaBrowser, MediaThumb } from "#/components/admin/media-library";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";

export const Route = createFileRoute("/admin/_admin/media")({
  component: MediaPage,
});

function MediaPage() {
  const [open, setOpen] = useState<MediaAsset | null>(null);
  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Media library"
        description="Every image and document used on the website, stored in Cloudflare R2. Upload once, reuse anywhere."
      />
      <div className="rounded-xl border border-border bg-white p-5">
        <MediaBrowser kind="any" onOpen={setOpen} />
      </div>
      <AssetDialog asset={open} onClose={() => setOpen(null)} />
    </div>
  );
}

function AssetDialog({ asset, onClose }: { asset: MediaAsset | null; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [altText, setAltText] = useState("");
  const [folder, setFolder] = useState<MediaFolder>("general");
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    setAltText(asset?.alt_text ?? "");
    setFolder((asset?.folder as MediaFolder | undefined) ?? "general");
    setConfirming(false);
  }, [asset]);

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: ["media", "usage", asset?.id],
    queryFn: () =>
      api
        .get<{ usage: Array<{ kind: string; id: number | string; label: string }> }>(
          `/media/${asset!.id}/usage`,
        )
        .then((r) => r.usage),
    enabled: asset !== null,
  });

  const save = useMutation({
    mutationFn: () => api.patch(`/media/${asset!.id}`, { altText, folder }),
    onSuccess: () => {
      toast.success("Saved.");
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      onClose();
    },
    onError: errorToast("Couldn't save."),
  });
  const remove = useMutation({
    mutationFn: () => api.delete(`/media/${asset!.id}`),
    onSuccess: () => {
      toast.success("File deleted.");
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      onClose();
    },
    onError: errorToast("Couldn't delete the file."),
  });

  const inUse = (usage?.length ?? 0) > 0;

  return (
    <Dialog open={asset !== null} onOpenChange={(o) => !o && onClose()}>
      {asset && (
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="truncate pr-8">{asset.filename}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-[1fr_280px]">
            <div className="flex items-center justify-center overflow-hidden rounded-lg border border-border bg-[repeating-conic-gradient(#f1f4fb_0_25%,#fff_0_50%)] bg-[length:20px_20px]">
              {isImage(asset) ? (
                <img
                  src={asset.url}
                  alt={asset.alt_text ?? ""}
                  className="max-h-[50vh] w-auto object-contain"
                />
              ) : (
                <div className="aspect-square w-40">
                  <MediaThumb asset={asset} />
                </div>
              )}
            </div>
            <div className="grid content-start gap-4 text-sm">
              <dl className="grid grid-cols-[90px_1fr] gap-x-3 gap-y-1.5">
                <dt className="text-muted-foreground">Type</dt>
                <dd>{asset.mime_type}</dd>
                <dt className="text-muted-foreground">Size</dt>
                <dd>{formatBytes(asset.size_bytes)}</dd>
                {asset.width && (
                  <>
                    <dt className="text-muted-foreground">Dimensions</dt>
                    <dd>
                      {asset.width} × {asset.height}
                    </dd>
                  </>
                )}
                <dt className="text-muted-foreground">Uploaded</dt>
                <dd>
                  {formatDateTime(asset.created_at)}
                  {asset.uploaded_by_name && (
                    <span className="block text-xs text-muted-foreground">
                      by {asset.uploaded_by_name}
                    </span>
                  )}
                </dd>
              </dl>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(asset.url);
                    toast.success("Link copied.");
                  }}
                >
                  <Copy /> Copy link
                </Button>
                <Button asChild variant="outline" size="sm">
                  <a href={asset.url} target="_blank" rel="noopener">
                    <ExternalLink /> Open
                  </a>
                </Button>
              </div>
              {isImage(asset) && (
                <Field
                  label="Alternative text"
                  hint="Describes the image for screen readers and search engines."
                >
                  <Input
                    value={altText}
                    onChange={(e) => setAltText(e.target.value)}
                    maxLength={255}
                  />
                </Field>
              )}
              <Field label="Folder">
                <select
                  value={folder}
                  onChange={(e) => setFolder(e.target.value as MediaFolder)}
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                >
                  {MEDIA_FOLDERS.map((f) => (
                    <option key={f.key} value={f.key}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </Field>
              <div>
                <p className="mb-1.5 font-medium">Used in</p>
                {usageLoading ? (
                  <p className="text-xs text-muted-foreground">Checking…</p>
                ) : inUse ? (
                  <ul className="space-y-1 text-xs">
                    {usage!.map((u) => (
                      <li key={`${u.kind}-${u.id}`} className="rounded bg-secondary px-2 py-1">
                        <span className="font-semibold">{u.kind}:</span> {u.label}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs text-muted-foreground">Not used anywhere on the site.</p>
                )}
              </div>
            </div>
          </div>
          {confirming && (
            <div className="flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm">
              <TriangleAlert
                className="mt-0.5 size-4 shrink-0 text-destructive"
                aria-hidden="true"
              />
              <p>
                {inUse
                  ? `This file is still used in ${usage!.length} place${usage!.length === 1 ? "" : "s"} — those spots will show a broken image or link. Delete anyway?`
                  : "The file will be permanently deleted from storage."}
              </p>
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            {confirming ? (
              <Button
                variant="destructive"
                disabled={remove.isPending}
                onClick={() => remove.mutate()}
              >
                {remove.isPending && <Loader2 className="animate-spin" />} Yes, delete permanently
              </Button>
            ) : (
              <Button
                variant="ghost"
                className="text-destructive"
                onClick={() => setConfirming(true)}
              >
                <Trash2 /> Delete file
              </Button>
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button disabled={save.isPending} onClick={() => save.mutate()}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      )}
    </Dialog>
  );
}
