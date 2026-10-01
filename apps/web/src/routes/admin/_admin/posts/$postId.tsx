import { useEffect, useRef, useState } from "react";
import { Link, createFileRoute, useBlocker, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { ArrowLeft, ExternalLink, Info, Loader2, Save, X } from "lucide-react";
import type { PostRow, PostType } from "@aka/db";
import { api } from "#/lib/api-client";
import { postTypeDef } from "#/lib/content";
import { canPublishPosts } from "#/lib/permissions";
import { formatDateTime, fromInputDateTime, nowInputDateTime, toInputDateTime } from "#/lib/format";
import {
  AdminPageHeader,
  Field,
  Panel,
  StatusPill,
  Switch,
  errorToast,
} from "#/components/admin/ui";
import { RichTextEditor } from "#/components/admin/rich-text-editor";
import { FileField, ImageField } from "#/components/admin/media-fields";
import { LinkField } from "#/components/admin/block-editor";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Textarea } from "#/components/ui/textarea.tsx";

export const Route = createFileRoute("/admin/_admin/posts/$postId")({
  validateSearch: z.object({
    type: z.enum(["news", "event", "announcement"]).optional().catch(undefined),
  }),
  component: PostEditorRoute,
});

type FullPost = PostRow & { author_name: string | null; tags: Array<string> };

interface Form {
  title: string;
  slug: string;
  excerpt: string;
  body: string;
  coverImageUrl: string;
  category: string;
  tags: Array<string>;
  isFeatured: boolean;
  isPinned: boolean;
  status: "draft" | "published" | "archived";
  publishedAt: string; // datetime-local
  eventStart: string;
  eventEnd: string;
  venue: string;
  registrationUrl: string;
  attachmentUrl: string;
  expiresOn: string;
}

function toForm(p: FullPost): Form {
  return {
    title: p.title,
    slug: p.slug,
    excerpt: p.excerpt ?? "",
    body: p.body ?? "",
    coverImageUrl: p.cover_image_url ?? "",
    category: p.category ?? "",
    tags: p.tags,
    isFeatured: p.is_featured === 1,
    isPinned: p.is_pinned === 1,
    status: p.status,
    publishedAt: toInputDateTime(p.published_at),
    eventStart: toInputDateTime(p.event_start),
    eventEnd: toInputDateTime(p.event_end),
    venue: p.venue ?? "",
    registrationUrl: p.registration_url ?? "",
    attachmentUrl: p.attachment_url ?? "",
    expiresOn: p.expires_on ?? "",
  };
}

function PostEditorRoute() {
  const { postId } = Route.useParams();
  const search = Route.useSearch();
  const isNew = postId === "new";
  const { data, isLoading } = useQuery({
    queryKey: ["posts", postId],
    queryFn: () => api.get<{ post: FullPost }>(`/posts/${postId}`).then((r) => r.post),
    enabled: !isNew,
  });
  if (!isNew && (isLoading || !data)) return <p className="text-muted-foreground">Loading…</p>;

  const type: PostType = data?.type ?? search.type ?? "news";
  const initial: Form = data
    ? toForm(data)
    : {
        title: "",
        slug: "",
        excerpt: "",
        body: "",
        coverImageUrl: "",
        category: postTypeDef(type).categories[0] ?? "",
        tags: [],
        isFeatured: false,
        isPinned: false,
        status: "draft",
        publishedAt: nowInputDateTime(),
        eventStart: "",
        eventEnd: "",
        venue: "",
        registrationUrl: "",
        attachmentUrl: "",
        expiresOn: "",
      };
  return <PostEditor key={postId} type={type} post={data ?? null} initial={initial} />;
}

function PostEditor({
  type,
  post,
  initial,
}: {
  type: PostType;
  post: FullPost | null;
  initial: Form;
}) {
  const { admin } = Route.useRouteContext();
  const publisher = canPublishPosts(admin.role);
  const locked =
    !publisher && post !== null && (post.author_id !== admin.id || post.status !== "draft");
  const def = postTypeDef(type);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<Form>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [tagInput, setTagInput] = useState("");
  const dirty = JSON.stringify(form) !== saved;
  const set = (patch: Partial<Form>) => setForm((f) => ({ ...f, ...patch }));
  const bypassBlock = useRef(false);

  useBlocker({
    shouldBlockFn: () =>
      !bypassBlock.current &&
      dirty &&
      !window.confirm("You have unsaved changes. Leave without saving?"),
    enableBeforeUnload: () => dirty,
  });

  const save = useMutation({
    mutationFn: (status: Form["status"]) => {
      const body = {
        title: form.title,
        slug: form.slug.replace(/^-+|-+$/g, ""),
        excerpt: form.excerpt,
        body: form.body,
        coverImageUrl: form.coverImageUrl,
        category: form.category,
        tags: form.tags,
        ...(publisher ? { isFeatured: form.isFeatured, isPinned: form.isPinned } : {}),
        status,
        publishedAt: fromInputDateTime(form.publishedAt || nowInputDateTime()),
        eventStart: fromInputDateTime(form.eventStart),
        eventEnd: fromInputDateTime(form.eventEnd),
        venue: form.venue,
        registrationUrl: form.registrationUrl,
        attachmentUrl: form.attachmentUrl,
        expiresOn: form.expiresOn,
      };
      return post
        ? api.patch<{ post: FullPost }>(`/posts/${post.id}`, body)
        : api.post<{ post: FullPost }>("/posts", { ...body, type });
    },
    onSuccess: ({ post: savedPost }) => {
      const next = toForm(savedPost);
      setForm(next);
      setSaved(JSON.stringify(next));
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(savedPost.status === "published" ? "Published." : "Saved.");
      if (!post) {
        bypassBlock.current = true;
        void navigate({
          to: "/admin/posts/$postId",
          params: { postId: String(savedPost.id) },
          replace: true,
        });
      }
    },
    onError: errorToast("Couldn't save."),
  });

  const valid = form.title.trim().length >= 3 && (type !== "event" || form.eventStart);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!locked && valid && !save.isPending) save.mutate(publisher ? form.status : "draft");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [locked, valid, save, publisher, form.status]);

  const addTag = () => {
    const tag = tagInput.trim().replace(/^#/, "");
    if (tag && !form.tags.includes(tag) && form.tags.length < 12)
      set({ tags: [...form.tags, tag] });
    setTagInput("");
  };

  const scheduled = form.publishedAt > nowInputDateTime();
  const publicUrl = post ? `${def.path}/${post.slug}` : null;

  return (
    <div className="flex flex-col gap-6">
      <AdminPageHeader
        eyebrow={
          <Link
            to="/admin/posts"
            search={{ type }}
            className="inline-flex items-center gap-1 hover:text-primary"
          >
            <ArrowLeft className="size-3.5" /> {def.label}
          </Link>
        }
        title={post ? form.title || "Untitled" : `New ${def.singular.toLowerCase()}`}
        description={
          <span className="flex flex-wrap items-center gap-2">
            {post && <StatusPill status={post.status} />}
            {dirty ? (
              <span className="text-amber-700">Unsaved changes</span>
            ) : (
              post && <span>Saved {formatDateTime(post.updated_at)}</span>
            )}
            {post?.author_name && <span>· by {post.author_name}</span>}
          </span>
        }
        actions={
          !locked && (
            <>
              {post?.status === "published" && publicUrl && (
                <Button asChild variant="outline">
                  <a href={publicUrl} target="_blank" rel="noopener">
                    <ExternalLink /> View
                  </a>
                </Button>
              )}
              <Button
                variant="outline"
                disabled={!valid || save.isPending}
                onClick={() => save.mutate("draft")}
              >
                {save.isPending && save.variables === "draft" ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Save />
                )}
                {publisher ? "Save draft" : "Save draft for review"}
              </Button>
              {publisher && (
                <Button
                  disabled={!valid || save.isPending}
                  onClick={() => save.mutate("published")}
                >
                  {save.isPending && save.variables === "published" && (
                    <Loader2 className="animate-spin" />
                  )}
                  {post?.status === "published" ? "Update" : scheduled ? "Schedule" : "Publish"}
                </Button>
              )}
            </>
          )
        }
      />

      {locked && (
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          This post has been published or belongs to someone else — ask an editor if it needs
          changes.
        </div>
      )}
      {!publisher && !locked && (
        <div className="flex items-start gap-3 rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          As an author you save drafts; an editor will review and publish them.
        </div>
      )}

      <fieldset disabled={locked} className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex min-w-0 flex-col gap-6">
          <Panel>
            <div className="grid gap-4">
              <Field label="Title">
                <Input
                  value={form.title}
                  onChange={(e) => set({ title: e.target.value })}
                  className="h-11 text-lg font-semibold"
                  maxLength={255}
                />
              </Field>
              <Field
                label="Web address"
                hint={form.slug ? undefined : "Created from the title when you save."}
              >
                <div className="flex items-center rounded-md border border-input bg-secondary/40 pl-3 text-sm">
                  <span className="shrink-0 text-muted-foreground">{def.path}/</span>
                  <input
                    value={form.slug}
                    onChange={(e) =>
                      set({
                        slug: e.target.value
                          .toLowerCase()
                          .replace(/[^a-z0-9-]/g, "-")
                          .replace(/-+/g, "-"),
                      })
                    }
                    className="h-9 min-w-0 flex-1 rounded-r-md bg-white px-2 font-mono outline-none"
                  />
                </div>
              </Field>
              <Field
                label="Summary"
                hint="One or two sentences shown on cards, in search and when shared."
              >
                <Textarea
                  rows={2}
                  value={form.excerpt}
                  onChange={(e) => set({ excerpt: e.target.value })}
                  maxLength={600}
                />
              </Field>
            </div>
          </Panel>

          {type === "event" && (
            <Panel title="Event details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Starts" error={!form.eventStart ? "Required for events" : undefined}>
                  <Input
                    type="datetime-local"
                    value={form.eventStart}
                    onChange={(e) => set({ eventStart: e.target.value })}
                  />
                </Field>
                <Field
                  label="Ends"
                  hint="Optional"
                  error={
                    form.eventEnd && form.eventStart && form.eventEnd < form.eventStart
                      ? "Ends before it starts"
                      : undefined
                  }
                >
                  <Input
                    type="datetime-local"
                    value={form.eventEnd}
                    onChange={(e) => set({ eventEnd: e.target.value })}
                  />
                </Field>
                <Field label="Venue">
                  <Input
                    value={form.venue}
                    onChange={(e) => set({ venue: e.target.value })}
                    placeholder="e.g. College Assembly Hall"
                  />
                </Field>
                <LinkField
                  label="Registration link (optional)"
                  value={form.registrationUrl}
                  onChange={(registrationUrl) => set({ registrationUrl })}
                />
              </div>
            </Panel>
          )}

          <Panel title="Content">
            <RichTextEditor
              value={form.body}
              onChange={(body) => set({ body })}
              folder="posts"
              placeholder="Write the full story…"
              minHeight="min-h-96"
            />
          </Panel>
        </div>

        <div className="flex flex-col gap-6">
          <Panel title="Publishing">
            <div className="grid gap-4">
              <Field
                label="Publish date"
                hint={
                  scheduled
                    ? "In the future — it will go live automatically then."
                    : "Shown as the post date."
                }
              >
                <Input
                  type="datetime-local"
                  value={form.publishedAt}
                  onChange={(e) => set({ publishedAt: e.target.value })}
                />
              </Field>
              {publisher && (
                <>
                  {type === "news" && (
                    <Switch
                      label="Featured"
                      description="Shown large at the top of the home page news."
                      checked={form.isFeatured}
                      onChange={(isFeatured) => set({ isFeatured })}
                    />
                  )}
                  {type === "announcement" && (
                    <Switch
                      label="Pinned"
                      description="Kept at the top of announcements."
                      checked={form.isPinned}
                      onChange={(isPinned) => set({ isPinned })}
                    />
                  )}
                  {post?.status === "published" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-fit"
                      onClick={() => save.mutate("archived")}
                    >
                      Archive (unpublish)
                    </Button>
                  )}
                </>
              )}
              {type === "announcement" && (
                <Field
                  label="Remove from home page after"
                  hint="Optional. It stays in the announcements archive."
                >
                  <Input
                    type="date"
                    value={form.expiresOn}
                    onChange={(e) => set({ expiresOn: e.target.value })}
                  />
                </Field>
              )}
            </div>
          </Panel>

          <Panel title="Cover image">
            <ImageField
              folder="posts"
              value={form.coverImageUrl}
              onChange={(url) => set({ coverImageUrl: url ?? "" })}
            />
          </Panel>

          <Panel title="Organise">
            <div className="grid gap-4">
              <Field label="Category">
                <Input
                  list={`categories-${type}`}
                  value={form.category}
                  onChange={(e) => set({ category: e.target.value })}
                  maxLength={80}
                />
                <datalist id={`categories-${type}`}>
                  {def.categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </Field>
              <Field label="Tags" hint="Press Enter to add.">
                <div className="flex flex-wrap gap-1.5 rounded-md border border-input bg-white p-1.5">
                  {form.tags.map((t) => (
                    <span
                      key={t}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-primary"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => set({ tags: form.tags.filter((x) => x !== t) })}
                        aria-label={`Remove ${t}`}
                      >
                        <X className="size-3" />
                      </button>
                    </span>
                  ))}
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === ",") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    onBlur={addTag}
                    className="min-w-24 flex-1 px-1 text-sm outline-none"
                    placeholder="Add tag"
                  />
                </div>
              </Field>
            </div>
          </Panel>

          <Panel
            title="Attachment"
            description="An optional PDF or document, e.g. the official notice."
          >
            <FileField
              folder="documents"
              value={form.attachmentUrl}
              onChange={(url) => set({ attachmentUrl: url ?? "" })}
            />
          </Panel>
        </div>
      </fieldset>
    </div>
  );
}
