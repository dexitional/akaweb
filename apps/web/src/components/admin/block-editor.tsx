import { useState } from "react";
import {
  AlignLeft,
  ArrowDown,
  ArrowUp,
  BarChart3,
  ChevronDown,
  CircleHelp,
  Contact,
  Copy,
  FileStack,
  GalleryHorizontal,
  Image as ImageIcon,
  LayoutGrid,
  ListOrdered,
  Megaphone,
  MessageSquareQuote,
  MousePointerClick,
  Network,
  Plus,
  Trash2,
  Users,
  Video,
  X,
} from "lucide-react";
import { BLOCK_CATALOG, blockLabel, createBlock, duplicateBlock, videoEmbedUrl } from "#/lib/blocks";
import type { Block, BlockOf, BlockType } from "#/lib/blocks";
import { DOCUMENT_CATEGORIES, PERSON_GROUPS } from "#/lib/content";
import type { MediaFolder } from "#/lib/upload";
import { cn } from "#/lib/utils";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx";
import { RichTextEditor } from "./rich-text-editor";
import { ImageField } from "./media-fields";
import { MediaPickerDialog } from "./media-library";
import { Field, Segmented, Switch } from "./ui";

const ICONS: Record<BlockType, typeof AlignLeft> = {
  richText: AlignLeft,
  imageText: ImageIcon,
  cards: LayoutGrid,
  stats: BarChart3,
  steps: ListOrdered,
  faq: CircleHelp,
  callout: Megaphone,
  quote: MessageSquareQuote,
  cta: MousePointerClick,
  gallery: GalleryHorizontal,
  video: Video,
  people: Users,
  departments: Network,
  documents: FileStack,
  contact: Contact,
};

function blockSummary(block: Block): string {
  if ("title" in block && block.title) return block.title;
  if (block.type === "richText") return block.html.replace(/<[^>]*>/g, " ").trim().slice(0, 80) || "Empty";
  if (block.type === "quote") return block.quote.slice(0, 80) || "Empty";
  if (block.type === "people") return PERSON_GROUPS.find((g) => g.key === block.group)?.label ?? "";
  return "";
}

export function BlockEditor({
  blocks,
  onChange,
  folder = "pages",
}: {
  blocks: Array<Block>;
  onChange: (blocks: Array<Block>) => void;
  folder?: MediaFolder;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [insertAt, setInsertAt] = useState<number | null>(null);

  const update = (id: string, patch: Partial<Block>) =>
    onChange(blocks.map((b) => (b.id === id ? ({ ...b, ...patch } as Block) : b)));
  const move = (index: number, delta: number) => {
    const next = [...blocks];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item!);
    onChange(next);
  };
  const insert = (type: BlockType) => {
    const at = insertAt ?? blocks.length;
    const next = [...blocks];
    next.splice(at, 0, createBlock(type));
    onChange(next);
    setInsertAt(null);
  };
  const toggle = (id: string) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <div className="flex flex-col gap-3">
      {blocks.length === 0 && (
        <div className="rounded-xl border-2 border-dashed border-border bg-secondary/30 px-6 py-10 text-center">
          <p className="font-medium">No blocks yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Build the page from sections — text, images, cards, FAQs, people, downloads and more.
          </p>
        </div>
      )}

      {blocks.map((block, index) => {
        const Icon = ICONS[block.type];
        const isCollapsed = collapsed.has(block.id);
        return (
          <div key={block.id}>
            <div className="group/block overflow-hidden rounded-xl border border-border bg-white shadow-xs">
              <div className="flex items-center gap-2 border-b border-border bg-secondary/50 px-3 py-2">
                <span className="flex size-7 items-center justify-center rounded-md bg-primary text-white">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <button type="button" onClick={() => toggle(block.id)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="text-sm font-semibold">{blockLabel(block.type)}</span>
                  <span className="truncate text-xs text-muted-foreground">{blockSummary(block)}</span>
                  <ChevronDown className={cn("ml-auto size-4 shrink-0 text-muted-foreground transition-transform", isCollapsed && "-rotate-90")} aria-hidden="true" />
                </button>
                <div className="flex items-center">
                  <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
                    <ArrowUp />
                  </Button>
                  <Button type="button" variant="ghost" size="icon-sm" disabled={index === blocks.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
                    <ArrowDown />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      const next = [...blocks];
                      next.splice(index + 1, 0, duplicateBlock(block));
                      onChange(next);
                    }}
                    aria-label="Duplicate block"
                  >
                    <Copy />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => {
                      if (window.confirm(`Remove this ${blockLabel(block.type).toLowerCase()} block?`)) {
                        onChange(blocks.filter((b) => b.id !== block.id));
                      }
                    }}
                    aria-label="Remove block"
                  >
                    <Trash2 />
                  </Button>
                </div>
              </div>
              {!isCollapsed && (
                <div className="p-4">
                  <BlockFields block={block} update={(patch) => update(block.id, patch)} folder={folder} />
                </div>
              )}
            </div>
            <div className="flex justify-center py-1 opacity-0 transition-opacity focus-within:opacity-100 hover:opacity-100">
              <button
                type="button"
                onClick={() => setInsertAt(index + 1)}
                className="flex items-center gap-1 rounded-full border border-dashed border-primary/40 bg-white px-3 py-0.5 text-xs font-medium text-primary hover:bg-primary hover:text-white"
              >
                <Plus className="size-3" aria-hidden="true" /> Insert here
              </button>
            </div>
          </div>
        );
      })}

      <Button type="button" variant="outline" className="h-11 border-dashed" onClick={() => setInsertAt(blocks.length)}>
        <Plus /> Add a block
      </Button>

      <Dialog open={insertAt !== null} onOpenChange={(open) => !open && setInsertAt(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Add a block</DialogTitle>
            <DialogDescription>Choose the kind of section to add to this page.</DialogDescription>
          </DialogHeader>
          <div className="grid max-h-[65vh] gap-5 overflow-y-auto pr-1">
            {(["Content", "Media", "Directory", "Engagement"] as const).map((group) => (
              <div key={group}>
                <p className="mb-2 text-xs font-bold tracking-wider text-muted-foreground uppercase">{group}</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {BLOCK_CATALOG.filter((b) => b.group === group).map((meta) => {
                    const Icon = ICONS[meta.type];
                    return (
                      <button
                        key={meta.type}
                        type="button"
                        onClick={() => insert(meta.type)}
                        className="flex items-start gap-3 rounded-xl border border-border p-3 text-left transition-colors hover:border-primary hover:bg-secondary/50"
                      >
                        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <Icon className="size-4" aria-hidden="true" />
                        </span>
                        <span>
                          <span className="block text-sm font-semibold">{meta.label}</span>
                          <span className="block text-xs text-muted-foreground">{meta.description}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type Update<T extends BlockType> = (patch: Partial<BlockOf<T>>) => void;

function BlockFields({ block, update, folder }: { block: Block; update: (patch: Partial<Block>) => void; folder: MediaFolder }) {
  switch (block.type) {
    case "richText":
      return <RichTextEditor value={block.html} onChange={(html) => update({ html })} folder={folder} />;
    case "imageText":
      return <ImageTextFields block={block} update={update} folder={folder} />;
    case "cards":
      return <CardsFields block={block} update={update} folder={folder} />;
    case "stats":
      return (
        <div className="grid gap-4">
          <TitleField value={block.title} onChange={(title) => update({ title })} />
          <ItemList
            items={block.items}
            onChange={(items) => update({ items })}
            newItem={() => ({ value: "", label: "" })}
            addLabel="Add figure"
            render={(item, set) => (
              <div className="grid gap-3 sm:grid-cols-[160px_1fr]">
                <Input placeholder="Value, e.g. 2,500+" value={item.value} onChange={(e) => set({ value: e.target.value })} />
                <Input placeholder="Label, e.g. Students" value={item.label} onChange={(e) => set({ label: e.target.value })} />
              </div>
            )}
          />
        </div>
      );
    case "steps":
      return (
        <div className="grid gap-4">
          <TitleField value={block.title} onChange={(title) => update({ title })} />
          <IntroField value={block.intro} onChange={(intro) => update({ intro })} />
          <ItemList
            items={block.items}
            onChange={(items) => update({ items })}
            newItem={() => ({ title: "", text: "" })}
            addLabel="Add step"
            numbered
            render={(item, set) => (
              <div className="grid gap-2">
                <Input placeholder="Step title" value={item.title} onChange={(e) => set({ title: e.target.value })} />
                <Textarea placeholder="Details" rows={2} value={item.text} onChange={(e) => set({ text: e.target.value })} />
              </div>
            )}
          />
        </div>
      );
    case "faq":
      return (
        <div className="grid gap-4">
          <TitleField value={block.title} onChange={(title) => update({ title })} />
          <ItemList
            items={block.items}
            onChange={(items) => update({ items })}
            newItem={() => ({ question: "", answer: "" })}
            addLabel="Add question"
            render={(item, set) => (
              <div className="grid gap-2">
                <Input placeholder="Question" value={item.question} onChange={(e) => set({ question: e.target.value })} />
                <Textarea placeholder="Answer" rows={3} value={item.answer} onChange={(e) => set({ answer: e.target.value })} />
              </div>
            )}
          />
        </div>
      );
    case "callout":
      return (
        <div className="grid gap-4">
          <Field label="Style">
            <Segmented
              value={block.tone}
              onChange={(tone) => update({ tone })}
              options={[
                { value: "info", label: "Information" },
                { value: "success", label: "Success" },
                { value: "warning", label: "Warning" },
              ]}
            />
          </Field>
          <TitleField value={block.title} onChange={(title) => update({ title })} />
          <Field label="Text">
            <Textarea rows={3} value={block.text} onChange={(e) => update({ text: e.target.value })} />
          </Field>
        </div>
      );
    case "quote":
      return (
        <div className="grid gap-4 md:grid-cols-[1fr_200px]">
          <div className="grid gap-4">
            <Field label="Quote">
              <Textarea rows={4} value={block.quote} onChange={(e) => update({ quote: e.target.value })} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Name">
                <Input value={block.author} onChange={(e) => update({ author: e.target.value })} />
              </Field>
              <Field label="Role">
                <Input value={block.role} onChange={(e) => update({ role: e.target.value })} />
              </Field>
            </div>
          </div>
          <ImageField label="Photo" aspect="square" folder={folder} value={block.imageUrl} onChange={(url) => update({ imageUrl: url ?? "" })} />
        </div>
      );
    case "cta":
      return (
        <div className="grid gap-4">
          <TitleField value={block.title} onChange={(title) => update({ title })} />
          <Field label="Text">
            <Textarea rows={2} value={block.text} onChange={(e) => update({ text: e.target.value })} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Button label">
              <Input value={block.buttonLabel} onChange={(e) => update({ buttonLabel: e.target.value })} />
            </Field>
            <LinkField value={block.buttonUrl} onChange={(buttonUrl) => update({ buttonUrl })} label="Button link" />
          </div>
          <Field label="Colour">
            <Segmented
              value={block.tone}
              onChange={(tone) => update({ tone })}
              options={[
                { value: "navy", label: "Navy" },
                { value: "green", label: "Green" },
                { value: "sky", label: "Sky" },
              ]}
            />
          </Field>
        </div>
      );
    case "gallery":
      return <GalleryFields block={block} update={update} folder={folder} />;
    case "video": {
      const valid = !block.url || videoEmbedUrl(block.url);
      return (
        <div className="grid gap-4">
          <TitleField value={block.title} onChange={(title) => update({ title })} />
          <Field label="YouTube or Vimeo link" error={valid ? undefined : "Paste a YouTube or Vimeo video link."}>
            <Input placeholder="https://www.youtube.com/watch?v=…" value={block.url} onChange={(e) => update({ url: e.target.value })} />
          </Field>
          <Field label="Caption">
            <Input value={block.caption} onChange={(e) => update({ caption: e.target.value })} />
          </Field>
        </div>
      );
    }
    case "people":
      return (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TitleField value={block.title} onChange={(title) => update({ title })} />
            <Field label="People group" hint="Manage the people themselves in Admin → People.">
              <select
                value={block.group}
                onChange={(e) => update({ group: e.target.value as BlockOf<"people">["group"] })}
                className="h-9 rounded-md border border-input bg-white px-3 text-sm"
              >
                {PERSON_GROUPS.map((g) => (
                  <option key={g.key} value={g.key}>
                    {g.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <IntroField value={block.intro} onChange={(intro) => update({ intro })} />
          <Field label="Layout">
            <Segmented
              value={block.layout}
              onChange={(layout) => update({ layout })}
              options={[
                { value: "grid", label: "Photo cards" },
                { value: "list", label: "Compact list" },
              ]}
            />
          </Field>
        </div>
      );
    case "departments":
      return (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <TitleField value={block.title} onChange={(title) => update({ title })} />
            <Field label="Show" hint="Manage them in Admin → Departments & Units.">
              <Segmented
                value={block.kind}
                onChange={(kind) => update({ kind })}
                options={[
                  { value: "department", label: "Departments" },
                  { value: "unit", label: "Units" },
                ]}
              />
            </Field>
          </div>
          <IntroField value={block.intro} onChange={(intro) => update({ intro })} />
        </div>
      );
    case "documents":
      return (
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_200px_120px]">
            <TitleField value={block.title} onChange={(title) => update({ title })} />
            <Field label="Category">
              <select
                value={block.category}
                onChange={(e) => update({ category: e.target.value as BlockOf<"documents">["category"] })}
                className="h-9 rounded-md border border-input bg-white px-3 text-sm"
              >
                <option value="">All categories</option>
                {DOCUMENT_CATEGORIES.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Show up to">
              <Input type="number" min={1} max={50} value={block.limit} onChange={(e) => update({ limit: Math.min(50, Math.max(1, Number(e.target.value) || 1)) })} />
            </Field>
          </div>
          <IntroField value={block.intro} onChange={(intro) => update({ intro })} />
        </div>
      );
    case "contact":
      return (
        <div className="grid gap-4">
          <TitleField value={block.title} onChange={(title) => update({ title })} />
          <IntroField value={block.intro} onChange={(intro) => update({ intro })} />
          <p className="text-xs text-muted-foreground">Address, phone and email come from Admin → Settings → Contact.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Switch label="Show enquiry form" description="Messages arrive in Admin → Messages." checked={block.showForm} onChange={(showForm) => update({ showForm })} />
            <Switch label="Show map" checked={block.showMap} onChange={(showMap) => update({ showMap })} />
          </div>
        </div>
      );
  }
}

function TitleField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Heading">
      <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder="Optional heading" />
    </Field>
  );
}

function IntroField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <Field label="Introduction">
      <Textarea rows={2} value={value} onChange={(e) => onChange(e.target.value)} placeholder="Optional" />
    </Field>
  );
}

export function LinkField({ value, onChange, label = "Link" }: { value: string; onChange: (v: string) => void; label?: string }) {
  const invalid = value !== "" && !/^(\/|#|https?:\/\/|mailto:|tel:)/i.test(value);
  return (
    <Field label={label} error={invalid ? "Use a path like /about/history or a full https:// address" : undefined}>
      <Input value={value} onChange={(e) => onChange(e.target.value.trim())} placeholder="/admissions/how-to-apply" aria-invalid={invalid} />
    </Field>
  );
}

function ImageTextFields({ block, update, folder }: { block: BlockOf<"imageText">; update: Update<"imageText">; folder: MediaFolder }) {
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_260px]">
      <div className="grid content-start gap-4">
        <TitleField value={block.title} onChange={(title) => update({ title })} />
        <RichTextEditor value={block.html} onChange={(html) => update({ html })} folder={folder} minHeight="min-h-40" />
      </div>
      <div className="grid content-start gap-4">
        <ImageField label="Image" aspect="video" folder={folder} value={block.imageUrl} onChange={(url, asset) => update({ imageUrl: url ?? "", imageAlt: asset?.alt_text ?? block.imageAlt })} />
        <Field label="Image description" hint="For screen readers.">
          <Input value={block.imageAlt} onChange={(e) => update({ imageAlt: e.target.value })} />
        </Field>
        <Field label="Image position">
          <Segmented
            value={block.imagePosition}
            onChange={(imagePosition) => update({ imagePosition })}
            options={[
              { value: "left", label: "Left" },
              { value: "right", label: "Right" },
            ]}
          />
        </Field>
      </div>
    </div>
  );
}

function CardsFields({ block, update, folder }: { block: BlockOf<"cards">; update: Update<"cards">; folder: MediaFolder }) {
  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
        <TitleField value={block.title} onChange={(title) => update({ title })} />
        <Field label="Columns">
          <Segmented
            value={String(block.columns) as "2" | "3" | "4"}
            onChange={(v) => update({ columns: Number(v) as 2 | 3 | 4 })}
            options={[
              { value: "2", label: "2" },
              { value: "3", label: "3" },
              { value: "4", label: "4" },
            ]}
          />
        </Field>
      </div>
      <IntroField value={block.intro} onChange={(intro) => update({ intro })} />
      <ItemList
        items={block.items}
        onChange={(items) => update({ items })}
        newItem={() => ({ title: "", text: "", imageUrl: "", url: "" })}
        addLabel="Add card"
        render={(item, set) => (
          <div className="grid gap-3 sm:grid-cols-[140px_1fr]">
            <ImageField aspect="video" folder={folder} value={item.imageUrl} onChange={(url) => set({ imageUrl: url ?? "" })} />
            <div className="grid content-start gap-2">
              <Input placeholder="Card title" value={item.title} onChange={(e) => set({ title: e.target.value })} />
              <Textarea placeholder="Short description" rows={2} value={item.text} onChange={(e) => set({ text: e.target.value })} />
              <Input placeholder="Link (optional), e.g. /academics/departments" value={item.url} onChange={(e) => set({ url: e.target.value.trim() })} />
            </div>
          </div>
        )}
      />
    </div>
  );
}

function GalleryFields({ block, update, folder }: { block: BlockOf<"gallery">; update: Update<"gallery">; folder: MediaFolder }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="grid gap-4">
      <TitleField value={block.title} onChange={(title) => update({ title })} />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {block.images.map((img, i) => (
          <li key={`${img.url}-${i}`} className="overflow-hidden rounded-lg border border-border">
            <div className="relative aspect-video bg-secondary">
              <img src={img.url} alt="" className="size-full object-cover" />
              <div className="absolute top-1 right-1 flex gap-1">
                <button
                  type="button"
                  disabled={i === 0}
                  onClick={() => {
                    const next = [...block.images];
                    [next[i - 1], next[i]] = [next[i]!, next[i - 1]!];
                    update({ images: next });
                  }}
                  className="rounded bg-white/90 p-1 text-slate-700 disabled:opacity-40"
                  aria-label="Move earlier"
                >
                  <ArrowUp className="size-3 -rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => update({ images: block.images.filter((_, j) => j !== i) })}
                  className="rounded bg-white/90 p-1 text-destructive"
                  aria-label="Remove photo"
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
            <input
              value={img.caption}
              onChange={(e) => update({ images: block.images.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)) })}
              placeholder="Caption"
              className="w-full border-t border-border px-2 py-1.5 text-xs outline-none"
            />
          </li>
        ))}
        <li>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="flex aspect-video w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input text-sm text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Plus className="size-5" aria-hidden="true" /> Add photo
          </button>
        </li>
      </ul>
      <MediaPickerDialog
        open={open}
        onOpenChange={setOpen}
        kind="image"
        folder={folder}
        onSelect={(asset) => update({ images: [...block.images, { url: asset.url, caption: asset.alt_text ?? "" }] })}
      />
    </div>
  );
}

// An editable, reorderable list of sub-items (cards, FAQs, steps, ...).
export function ItemList<T>({
  items,
  onChange,
  newItem,
  render,
  addLabel = "Add item",
  numbered = false,
}: {
  items: Array<T>;
  onChange: (items: Array<T>) => void;
  newItem: () => T;
  render: (item: T, set: (patch: Partial<T>) => void, index: number) => React.ReactNode;
  addLabel?: string;
  numbered?: boolean;
}) {
  const set = (index: number) => (patch: Partial<T>) => onChange(items.map((it, i) => (i === index ? { ...it, ...patch } : it)));
  const move = (index: number, delta: number) => {
    const next = [...items];
    const [item] = next.splice(index, 1);
    next.splice(index + delta, 0, item as T);
    onChange(next);
  };
  return (
    <div className="grid gap-2">
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 rounded-lg border border-border bg-secondary/30 p-3">
          {numbered && <span className="mt-1.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">{index + 1}</span>}
          <div className="min-w-0 flex-1">{render(item, set(index), index)}</div>
          <div className="flex flex-col">
            <Button type="button" variant="ghost" size="icon-xs" disabled={index === 0} onClick={() => move(index, -1)} aria-label="Move up">
              <ArrowUp />
            </Button>
            <Button type="button" variant="ghost" size="icon-xs" disabled={index === items.length - 1} onClick={() => move(index, 1)} aria-label="Move down">
              <ArrowDown />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              className="text-destructive"
              onClick={() => onChange(items.filter((_, i) => i !== index))}
              aria-label="Remove"
            >
              <X />
            </Button>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" className="w-fit" onClick={() => onChange([...items, newItem()])}>
        <Plus /> {addLabel}
      </Button>
    </div>
  );
}
