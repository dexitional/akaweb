import { useState } from "react";
import { FileText, ImagePlus, Paperclip, RefreshCw, X } from "lucide-react";
import { cn } from "#/lib/utils";
import { formatBytes } from "#/lib/format";
import type { MediaAsset, MediaFolder } from "#/lib/upload";
import { Button } from "#/components/ui/button.tsx";
import { Label } from "#/components/ui/label.tsx";
import { MediaPickerDialog } from "./media-library";

// An image chosen from (or uploaded to) the media library. Stores the URL.
export function ImageField({
  label,
  value,
  onChange,
  folder = "general",
  hint,
  aspect = "video",
  className,
}: {
  label?: string;
  value: string | null | undefined;
  onChange: (url: string | null, asset?: MediaAsset) => void;
  folder?: MediaFolder;
  hint?: string;
  aspect?: "video" | "square" | "portrait" | "wide";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const aspectClass = { video: "aspect-video", square: "aspect-square", portrait: "aspect-[4/5]", wide: "aspect-[21/9]" }[aspect];

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && <Label>{label}</Label>}
      {value ? (
        <div className={cn("group relative overflow-hidden rounded-lg border border-border bg-secondary", aspectClass)}>
          <img src={value} alt="" className="size-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/50 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
            <Button type="button" size="sm" variant="secondary" onClick={() => setOpen(true)}>
              <RefreshCw /> Replace
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => onChange(null)}>
              <X /> Remove
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className={cn(
            "flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-input bg-secondary/40 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:bg-secondary hover:text-primary",
            aspectClass,
          )}
        >
          <ImagePlus className="size-6" aria-hidden="true" />
          <span className="font-medium">Choose image</span>
        </button>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        kind="image"
        folder={folder}
        selectedUrl={value}
        onSelect={(asset) => onChange(asset.url, asset)}
      />
    </div>
  );
}

// A document (PDF, Word, ...) from the media library.
export function FileField({
  label,
  value,
  onChange,
  folder = "documents",
  hint,
  fileName,
}: {
  label?: string;
  value: string | null | undefined;
  onChange: (url: string | null, asset?: MediaAsset) => void;
  folder?: MediaFolder;
  hint?: string;
  fileName?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<MediaAsset | null>(null);
  const name = picked && picked.url === value ? picked.filename : (fileName ?? value?.split("/").pop());

  return (
    <div className="flex flex-col gap-1.5">
      {label && <Label>{label}</Label>}
      {value ? (
        <div className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
          <FileText className="size-5 shrink-0 text-primary" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <a href={value} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium hover:text-primary hover:underline">
              {name}
            </a>
            {picked && picked.url === value && <p className="text-xs text-muted-foreground">{formatBytes(picked.size_bytes)}</p>}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(true)}>
            Replace
          </Button>
          <Button type="button" size="icon-sm" variant="ghost" onClick={() => onChange(null)} aria-label="Remove file">
            <X />
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" className="w-fit" onClick={() => setOpen(true)}>
          <Paperclip /> Choose file
        </Button>
      )}
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        kind="document"
        folder={folder}
        selectedUrl={value}
        onSelect={(asset) => {
          setPicked(asset);
          onChange(asset.url, asset);
        }}
      />
    </div>
  );
}
