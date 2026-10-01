import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useBlocker, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Eye, Loader2, Save } from "lucide-react";
import type { PageRow, PageSection } from "@aka/db";
import { api } from "#/lib/api-client";
import { SECTIONS, SECTION_KEYS, sectionDef } from "#/lib/content";
import type { Block } from "#/lib/blocks";
import { canManage } from "#/lib/permissions";
import { formatDateTime } from "#/lib/format";
import { AdminPageHeader, Field, Panel, StatusPill, Switch, errorToast } from "#/components/admin/ui";
import { RichTextEditor } from "#/components/admin/rich-text-editor";
import { BlockEditor } from "#/components/admin/block-editor";
import { ImageField } from "#/components/admin/media-fields";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";

export const Route = createFileRoute("/admin/_admin/pages/$pageId")({
  validateSearch: z.object({ section: z.enum(SECTION_KEYS).optional().catch(undefined) }),
  component: PageEditorRoute,
});

type FullPage = PageRow & { blocks: Array<Block> };

interface Form {
  section: PageSection;
  title: string;
  slug: string;
  summary: string;
  heroImageUrl: string;
  body: string;
  blocks: Array<Block>;
  status: "draft" | "published";
  showInNav: boolean;
  seoTitle: string;
  seoDescription: string;
}

function toForm(p: FullPage): Form {
  return {
    section: p.section,
    title: p.title,
    slug: p.slug,
    summary: p.summary ?? "",
    heroImageUrl: p.hero_image_url ?? "",
    body: p.body ?? "",
    blocks: p.blocks,
    status: p.status,
    showInNav: p.show_in_nav === 1,
    seoTitle: p.seo_title ?? "",
    seoDescription: p.seo_description ?? "",
  };
}

function PageEditorRoute() {
  const { pageId } = Route.useParams();
  const { section } = Route.useSearch();
  const isNew = pageId === "new";
  const { data, isLoading } = useQuery({
    queryKey: ["pages", pageId],
    queryFn: () => api.get<{ page: FullPage }>(`/pages/${pageId}`).then((r) => r.page),
    enabled: !isNew,
  });

  if (!isNew && (isLoading || !data)) {
    return <p className="text-muted-foreground">Loading page…</p>;
  }
  const initial: Form = data
    ? toForm(data)
    : {
        section: section ?? "about",
        title: "",
        slug: "",
        summary: "",
        heroImageUrl: "",
        body: "",
        blocks: [],
        status: "draft",
        showInNav: true,
        seoTitle: "",
        seoDescription: "",
      };
  return <PageEditor key={pageId} page={data ?? null} initial={initial} />;
}

function PageEditor({ page, initial }: { page: FullPage | null; initial: Form }) {
  const { admin } = Route.useRouteContext();
  const canEdit = canManage(admin.role, "pages");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(initial);
  const [saved, setSaved] = useState<string>(JSON.stringify(initial));
  const dirty = JSON.stringify(form) !== saved;
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const def = sectionDef(form.section)!;

  // Set just before navigating away after a save, when `dirty` is stale.
  const bypassBlock = useRef(false);
  useBlocker({
    shouldBlockFn: () => !bypassBlock.current && dirty && !window.confirm("You have unsaved changes. Leave without saving?"),
    enableBeforeUnload: () => dirty,
  });

  const save = useMutation({
    mutationFn: (status: "draft" | "published") => {
      const body = { ...form, status, slug: form.slug.replace(/^-+|-+$/g, "") };
      return page ? api.patch<{ page: FullPage }>(`/pages/${page.id}`, body) : api.post<{ page: FullPage }>("/pages", body);
    },
    onSuccess: ({ page: savedPage }, status) => {
      const next = toForm(savedPage);
      setForm(next);
      setSaved(JSON.stringify(next));
      void queryClient.invalidateQueries({ queryKey: ["pages"] });
      toast.success(status === "published" ? "Page published." : "Draft saved.");
      if (!page) {
        bypassBlock.current = true;
        void navigate({ to: "/admin/pages/$pageId", params: { pageId: String(savedPage.id) }, replace: true });
      }
    },
    onError: errorToast("Couldn't save the page."),
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (canEdit && form.title.trim().length >= 2 && !save.isPending) save.mutate(form.status);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [canEdit, form, save]);

  const publicUrl = page ? `${sectionDef(page.section)?.path}/${page.slug}` : null;
  const valid = form.title.trim().length >= 2;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow={
          <Link to="/admin/pages" className="inline-flex items-center gap-1 hover:text-primary">
            <ArrowLeft className="size-3.5" /> Pages
          </Link>
        }
        title={page ? form.title || "Untitled page" : "New page"}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {page && <StatusPill status={page.status} />}
            {dirty ? <span className="text-amber-700">Unsaved changes</span> : page && <span>Saved {formatDateTime(page.updated_at)}</span>}
          </span>
        }
        actions={
          <>
            {page && (
              <Button asChild variant="outline">
                <a href={`${publicUrl}?preview=1`} target="_blank" rel="noopener">
                  <Eye /> Preview
                </a>
              </Button>
            )}
            {canEdit && (
              <>
                <Button variant="outline" disabled={!valid || save.isPending} onClick={() => save.mutate("draft")}>
                  {save.isPending && save.variables === "draft" ? <Loader2 className="animate-spin" /> : <Save />}
                  {form.status === "published" ? "Save as draft" : "Save draft"}
                </Button>
                <Button disabled={!valid || save.isPending} onClick={() => save.mutate("published")}>
                  {save.isPending && save.variables === "published" && <Loader2 className="animate-spin" />}
                  {page?.status === "published" ? "Update" : "Publish"}
                </Button>
              </>
            )}
          </>
        }
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <div className="grid gap-4">
              <Field label="Title">
                <Input value={form.title} onChange={(e) => set({ title: e.target.value })} className="h-11 text-lg font-semibold" placeholder="e.g. History of the College" />
              </Field>
              <Field label="Page address" hint={form.slug ? undefined : "Leave blank to create it from the title."}>
                <div className="flex items-center rounded-md border border-input bg-secondary/40 pl-3 text-sm">
                  <span className="shrink-0 text-muted-foreground">{def.path}/</span>
                  <input
                    value={form.slug}
                    onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-") })}
                    placeholder="history"
                    className="h-9 min-w-0 flex-1 rounded-r-md bg-white px-2 font-mono outline-none"
                  />
                </div>
              </Field>
              <Field label="Summary" hint="Shown under the title and on section cards. Also used for search engines if no SEO description is set.">
                <Textarea rows={2} value={form.summary} onChange={(e) => set({ summary: e.target.value })} maxLength={500} />
              </Field>
            </div>
          </Panel>

          <Panel title="Main content" description="Optional rich text shown before the blocks.">
            <RichTextEditor value={form.body} onChange={(body) => set({ body })} folder="pages" placeholder="Write the page's introduction or full content…" />
          </Panel>

          <Panel title="Page blocks" description="Build the rest of the page from reusable sections. They appear in this order.">
            <BlockEditor blocks={form.blocks} onChange={(blocks) => set({ blocks })} folder="pages" />
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Publishing">
            <div className="grid gap-4">
              <Field label="Section">
                <select
                  value={form.section}
                  onChange={(e) => set({ section: e.target.value as PageSection })}
                  className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                >
                  {SECTIONS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Switch label="Show in menu" description="List this page in the section's dropdown and sidebar." checked={form.showInNav} onChange={(showInNav) => set({ showInNav })} />
              {page?.published_at && <p className="text-xs text-muted-foreground">First published {formatDateTime(page.published_at)}</p>}
              {page?.status === "published" && publicUrl && (
                <a href={publicUrl} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline">
                  View live page <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </Panel>

          <Panel title="Banner image" description="Washed behind the title band and used on cards.">
            <ImageField folder="pages" value={form.heroImageUrl} onChange={(url) => set({ heroImageUrl: url ?? "" })} />
          </Panel>

          <Panel title="Search engines" description="How this page appears on Google and when shared.">
            <div className="grid gap-4">
              <Field label="SEO title" hint={`${(form.seoTitle || form.title).length}/60 characters`}>
                <Input value={form.seoTitle} onChange={(e) => set({ seoTitle: e.target.value })} placeholder={form.title} maxLength={200} />
              </Field>
              <Field label="SEO description" hint={`${(form.seoDescription || form.summary).length}/160 characters`}>
                <Textarea rows={3} value={form.seoDescription} onChange={(e) => set({ seoDescription: e.target.value })} placeholder={form.summary} maxLength={300} />
              </Field>
              <div className="rounded-lg border border-border bg-secondary/40 p-3">
                <p className="truncate text-xs text-emerald-700">akatsicoe.edu.gh{def.path}/{form.slug || "…"}</p>
                <p className="truncate text-[15px] font-medium text-blue-800">{form.seoTitle || form.title || "Page title"} | Akatsi College of Education</p>
                <p className="line-clamp-2 text-xs text-muted-foreground">{form.seoDescription || form.summary || "Add a summary to describe this page."}</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
