import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowDown, ArrowUp, CalendarRange, ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import type { SpotlightRow } from "@aka/db";
import { api } from "#/lib/api-client";
import { canManage } from "#/lib/permissions";
import { formatDate, todayIso } from "#/lib/format";
import { cn } from "#/lib/utils";
import { AdminPageHeader, ConfirmDialog, Field, StatusPill, Switch, errorToast } from "#/components/admin/ui";
import { ImageField } from "#/components/admin/media-fields";
import { LinkField } from "#/components/admin/block-editor";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "#/components/ui/dialog.tsx";

export const Route = createFileRoute("/admin/_admin/spotlights")({
  component: SpotlightsPage,
});

interface Form {
  eyebrow: string;
  title: string;
  caption: string;
  imageUrl: string;
  ctaLabel: string;
  ctaUrl: string;
  startsOn: string;
  endsOn: string;
  isActive: boolean;
  showText: boolean;
}

const empty: Form = { eyebrow: "", title: "", caption: "", imageUrl: "", ctaLabel: "", ctaUrl: "", startsOn: "", endsOn: "", isActive: true, showText: true };

function liveState(s: SpotlightRow) {
  const today = todayIso();
  if (!s.is_active) return { status: "hidden", label: "Hidden" };
  if (s.starts_on && s.starts_on > today) return { status: "scheduled", label: `From ${formatDate(s.starts_on)}` };
  if (s.ends_on && s.ends_on < today) return { status: "archived", label: "Ended" };
  return { status: "published", label: "Live" };
}

function SpotlightsPage() {
  const { admin } = Route.useRouteContext();
  const canEdit = canManage(admin.role, "spotlights");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<SpotlightRow | "new" | null>(null);
  const [deleting, setDeleting] = useState<SpotlightRow | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["spotlights"],
    queryFn: () => api.get<{ spotlights: Array<SpotlightRow> }>("/spotlights").then((r) => r.spotlights),
  });
  const slides = data ?? [];
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["spotlights"] });

  const patch = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => api.patch(`/spotlights/${id}`, body),
    onSuccess: invalidate,
    onError: errorToast("Couldn't update the spotlight."),
  });
  const reorder = useMutation({
    mutationFn: (ids: Array<number>) => api.post("/spotlights/reorder", { ids }),
    onSuccess: invalidate,
    onError: errorToast("Couldn't reorder."),
  });
  const remove = useMutation({
    mutationFn: (id: number) => api.delete(`/spotlights/${id}`),
    onSuccess: () => {
      toast.success("Spotlight deleted.");
      setDeleting(null);
      void invalidate();
    },
    onError: errorToast("Couldn't delete."),
  });

  const move = (index: number, delta: number) => {
    const ids = slides.map((s) => s.id);
    const [id] = ids.splice(index, 1);
    ids.splice(index + delta, 0, id!);
    queryClient.setQueryData(["spotlights"], ids.map((i) => slides.find((s) => s.id === i)!));
    reorder.mutate(ids);
  };

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        title="Spotlights"
        description="Slides in the hero carousel at the top of the home page. Drag order with the arrows; schedule slides with start and end dates."
        actions={
          <>
            <Button asChild variant="outline">
              <a href="/" target="_blank" rel="noopener">
                <ExternalLink /> View home page
              </a>
            </Button>
            {canEdit && (
              <Button onClick={() => setEditing("new")}>
                <Plus /> Add spotlight
              </Button>
            )}
          </>
        }
      />

      {isLoading ? (
        <p className="text-muted-foreground">Loading…</p>
      ) : slides.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-border bg-white px-6 py-16 text-center">
          <p className="font-semibold">No spotlights yet</p>
          <p className="mt-1 text-sm text-muted-foreground">The home page shows a branded welcome banner until you add one.</p>
        </div>
      ) : (
        <ul className="grid gap-4">
          {slides.map((s, i) => {
            const state = liveState(s);
            return (
              <li key={s.id} className={cn("flex flex-col overflow-hidden rounded-xl border border-border bg-white sm:flex-row", !s.is_active && "opacity-70")}>
                <div className="relative aspect-video shrink-0 bg-secondary sm:w-72">
                  <img src={s.image_url} alt="" className="size-full object-cover" />
                  <span className="absolute top-2 left-2 flex size-7 items-center justify-center rounded-full bg-white text-xs font-bold text-primary shadow">{i + 1}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill status={state.status} label={state.label} />
                    {s.eyebrow && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-primary">{s.eyebrow}</span>}
                    {!s.show_text && <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">Image only</span>}
                    {(s.starts_on || s.ends_on) && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarRange className="size-3.5" aria-hidden="true" />
                        {s.starts_on ? formatDate(s.starts_on) : "Now"} – {s.ends_on ? formatDate(s.ends_on) : "no end"}
                      </span>
                    )}
                  </div>
                  <p className="text-lg font-bold">{s.title}</p>
                  {s.caption && <p className="line-clamp-2 text-sm text-muted-foreground">{s.caption}</p>}
                  {s.cta_label && (
                    <p className="text-xs text-muted-foreground">
                      Button: <span className="font-medium text-foreground">{s.cta_label}</span> → {s.cta_url}
                    </p>
                  )}
                  {canEdit && (
                    <div className="mt-auto flex flex-wrap items-center gap-1 pt-2">
                      <Button variant="ghost" size="icon-sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
                        <ArrowUp />
                      </Button>
                      <Button variant="ghost" size="icon-sm" disabled={i === slides.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
                        <ArrowDown />
                      </Button>
                      <div className="mx-2 w-36">
                        <Switch label="Visible" checked={s.is_active === 1} onChange={(v) => patch.mutate({ id: s.id, body: { isActive: v } })} />
                      </div>
                      <Button variant="outline" size="sm" className="ml-auto" onClick={() => setEditing(s)}>
                        <Pencil /> Edit
                      </Button>
                      <Button variant="ghost" size="icon-sm" className="text-destructive" onClick={() => setDeleting(s)} aria-label="Delete">
                        <Trash2 />
                      </Button>
                    </div>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <SpotlightDialog editing={editing} onClose={() => setEditing(null)} onSaved={invalidate} />
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete this spotlight?"
        description={`“${deleting?.title}” will be removed from the home page. The image stays in the media library.`}
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
      />
    </div>
  );
}

function SpotlightDialog({ editing, onClose, onSaved }: { editing: SpotlightRow | "new" | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Form>(empty);
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));

  useEffect(() => {
    if (!editing) return;
    setForm(
      editing === "new"
        ? empty
        : {
            eyebrow: editing.eyebrow ?? "",
            title: editing.title,
            caption: editing.caption ?? "",
            imageUrl: editing.image_url,
            ctaLabel: editing.cta_label ?? "",
            ctaUrl: editing.cta_url ?? "",
            startsOn: editing.starts_on ?? "",
            endsOn: editing.ends_on ?? "",
            isActive: editing.is_active === 1,
            showText: editing.show_text === 1,
          },
    );
  }, [editing]);

  const save = useMutation({
    mutationFn: () => (editing === "new" ? api.post("/spotlights", form) : api.patch(`/spotlights/${(editing as SpotlightRow).id}`, form)),
    onSuccess: () => {
      toast.success("Spotlight saved.");
      onSaved();
      onClose();
    },
    onError: errorToast("Couldn't save the spotlight."),
  });

  const valid = form.title.trim().length >= 3 && form.imageUrl;

  return (
    <Dialog open={editing !== null} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{editing === "new" ? "New spotlight" : "Edit spotlight"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-5 md:grid-cols-[1fr_1fr]">
          <ImageField label="Slide image" hint="Landscape, at least 1920×1080 for a crisp full-width hero." folder="spotlights" value={form.imageUrl} onChange={(url) => set({ imageUrl: url ?? "" })} />
          <div className="grid content-start gap-4">
            <Field label="Label" hint="A short tag above the title, e.g. Admissions 2026.">
              <Input value={form.eyebrow} onChange={(e) => set({ eyebrow: e.target.value })} maxLength={60} />
            </Field>
            <Field label="Title">
              <Input value={form.title} onChange={(e) => set({ title: e.target.value })} maxLength={200} />
            </Field>
          </div>
        </div>
        <Field label="Caption">
          <Textarea rows={2} value={form.caption} onChange={(e) => set({ caption: e.target.value })} maxLength={500} />
        </Field>
        <Switch
          label="Show the title and caption over the image"
          description="Turn off for posters and banners that already contain their own text — only the button is shown."
          checked={form.showText}
          onChange={(showText) => set({ showText })}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Button label">
            <Input value={form.ctaLabel} onChange={(e) => set({ ctaLabel: e.target.value })} placeholder="e.g. Apply now" />
          </Field>
          <LinkField label="Button link" value={form.ctaUrl} onChange={(ctaUrl) => set({ ctaUrl })} />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Show from" hint="Optional">
            <Input type="date" value={form.startsOn} onChange={(e) => set({ startsOn: e.target.value })} />
          </Field>
          <Field label="Show until" hint="Optional">
            <Input type="date" value={form.endsOn} onChange={(e) => set({ endsOn: e.target.value })} />
          </Field>
          <div className="flex items-end pb-2">
            <Switch label="Visible" checked={form.isActive} onChange={(isActive) => set({ isActive })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button disabled={!valid || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving…" : "Save spotlight"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
