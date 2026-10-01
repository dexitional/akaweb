import { useEffect, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import {
  ArrowLeft,
  CalendarDays,
  CalendarPlus,
  Clock,
  Eye,
  FileDown,
  Link2,
  MapPin,
  Search,
  Share2,
  Ticket,
  UserRound,
} from "lucide-react";
import type { PostRow, PostType } from "@aka/db";
import { postTypeDef } from "#/lib/content";
import {
  formatDate,
  formatEventRange,
  formatLongDate,
  formatTime,
  hasTime,
  readingMinutes,
} from "#/lib/format";
import { cn } from "#/lib/utils";
import type { PostCard } from "#/server/content";
import { PageHero } from "./page-hero";
import { AnnouncementCard, EventCard, NewsCard } from "./post-cards";
import { Pager } from "./pager";
import { EmptyState } from "./empty-state";
import { CoverImage } from "./cover-image";
import { RichContent } from "./rich-content";
import { SmartLink } from "./smart-link";

export const postListSearchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  category: z.string().max(80).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
  when: z.enum(["upcoming", "past"]).optional().catch(undefined),
});
export type PostListSearch = z.infer<typeof postListSearchSchema>;

type ListPath = "/news" | "/events" | "/announcements";

const INTROS: Record<PostType, string> = {
  news: "Stories of teaching, learning, research and community life at Akatsi College of Education.",
  event: "Ceremonies, conferences, workshops, sports and cultural events on and around campus.",
  announcement: "Official notices, press releases and important information from the college.",
};

export function PostListingPage({
  type,
  search,
  data,
}: {
  type: PostType;
  search: PostListSearch;
  data: {
    items: Array<PostCard>;
    total: number;
    pageSize: number;
    categories: Array<{ name: string; count: number }>;
  };
}) {
  const def = postTypeDef(type);
  const path = def.path as ListPath;
  const navigate = useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);

  const page = search.page ?? 1;
  const when = type === "event" ? (search.when ?? "upcoming") : undefined;
  const filtered = Boolean(search.q || search.category);

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap transition-colors",
      active
        ? "bg-primary text-white"
        : "border border-border bg-white text-slate-700 hover:border-primary/40 hover:text-primary",
    );

  return (
    <>
      <PageHero
        eyebrow="News & Media"
        title={def.label}
        summary={INTROS[type]}
        crumbs={[{ label: "News & Media", href: "/news" }, { label: def.label }]}
        compact
      >
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({
              to: path,
              search: { ...search, q: q.trim() || undefined, page: undefined },
            });
          }}
          className="mt-8 flex max-w-xl items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-lg"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={`Search ${def.label.toLowerCase()}…`}
            aria-label={`Search ${def.label.toLowerCase()}`}
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button
            type="submit"
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            Search
          </button>
        </form>
      </PageHero>

      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16">
        <div className="mb-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          {type === "event" && (
            <div
              className="flex gap-1 rounded-full bg-secondary p-1"
              role="tablist"
              aria-label="Event timing"
            >
              {(["upcoming", "past"] as const).map((w) => (
                <Link
                  key={w}
                  to={path}
                  search={{ ...search, when: w === "upcoming" ? undefined : w, page: undefined }}
                  role="tab"
                  aria-selected={when === w}
                  className={cn(
                    "rounded-full px-5 py-2 text-sm font-semibold capitalize transition-colors",
                    when === w
                      ? "bg-white text-primary shadow-sm"
                      : "text-slate-600 hover:text-primary",
                  )}
                >
                  {w}
                </Link>
              ))}
            </div>
          )}
          {data.categories.length > 0 && (
            <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
              <Link
                to={path}
                search={{ ...search, category: undefined, page: undefined }}
                className={chip(!search.category)}
              >
                All
              </Link>
              {data.categories.map((c) => (
                <Link
                  key={c.name}
                  to={path}
                  search={{ ...search, category: c.name, page: undefined }}
                  className={chip(search.category === c.name)}
                >
                  {c.name}
                  <span className="ml-1.5 opacity-60">{c.count}</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {filtered && (
          <p className="mb-6 text-sm text-muted-foreground">
            {data.total} result{data.total === 1 ? "" : "s"}
            {search.q && <> for “{search.q}”</>}
            {search.category && <> in {search.category}</>}
            {" · "}
            <Link
              to={path}
              search={{ when: search.when }}
              className="font-semibold text-primary hover:underline"
            >
              Clear filters
            </Link>
          </p>
        )}

        {data.items.length === 0 ? (
          <EmptyState
            title={
              filtered
                ? "Nothing matches your search"
                : type === "event" && when === "upcoming"
                  ? "No upcoming events yet"
                  : `No ${def.label.toLowerCase()} yet`
            }
            text={
              type === "event" && when === "upcoming"
                ? "Check back soon, or browse past events."
                : "Please check back soon."
            }
          />
        ) : type === "announcement" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {data.items.map((post) => (
              <AnnouncementCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {data.items.map((post) =>
              type === "event" ? (
                <EventCard key={post.id} post={post} />
              ) : (
                <NewsCard key={post.id} post={post} />
              ),
            )}
          </div>
        )}

        <Pager
          page={page}
          total={data.total}
          pageSize={data.pageSize}
          renderLink={(n, props) => (
            <Link to={path} search={{ ...search, page: n === 1 ? undefined : n }} {...props} />
          )}
        />
      </div>
    </>
  );
}

type FullPost = PostRow & { author_name: string | null; tags: Array<string>; description: string };

export function PostDetailPage({ post, related }: { post: FullPost; related: Array<PostCard> }) {
  const def = postTypeDef(post.type);
  const isEvent = post.type === "event";
  const start = post.event_start ?? post.published_at;

  return (
    <>
      <PageHero
        eyebrow={post.category ?? def.singular}
        title={post.title}
        summary={post.excerpt}
        crumbs={[
          { label: "News & Media", href: "/news" },
          { label: def.label, href: def.path },
          { label: post.title },
        ]}
        compact
      >
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-white/80">
          {isEvent ? (
            <>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatEventRange(start, post.event_end)}
              </span>
              {post.venue && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="size-4" aria-hidden="true" />
                  {post.venue}
                </span>
              )}
            </>
          ) : (
            <>
              <span className="flex items-center gap-1.5">
                <CalendarDays className="size-4" aria-hidden="true" />
                {formatLongDate(post.published_at)}
              </span>
              {post.type === "news" && (
                <span className="flex items-center gap-1.5">
                  <Clock className="size-4" aria-hidden="true" />
                  {readingMinutes(post.body)} min read
                </span>
              )}
              {post.author_name && (
                <span className="flex items-center gap-1.5">
                  <UserRound className="size-4" aria-hidden="true" />
                  {post.author_name}
                </span>
              )}
            </>
          )}
          <span className="flex items-center gap-1.5">
            <Eye className="size-4" aria-hidden="true" />
            {post.view_count.toLocaleString("en-GB")} {post.view_count === 1 ? "view" : "views"}
          </span>
        </div>
      </PageHero>

      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[minmax(0,1fr)_300px]">
        <article className="min-w-0">
          {post.cover_image_url && (
            <CoverImage
              src={post.cover_image_url}
              alt=""
              eager
              sizes="(min-width: 896px) 896px, 100vw"
              className="mb-10 aspect-[16/9] rounded-3xl shadow-lg"
            />
          )}
          {post.body ? (
            <RichContent html={post.body} className="prose-lg" />
          ) : (
            post.excerpt && <p className="text-lg leading-relaxed text-slate-700">{post.excerpt}</p>
          )}
          {post.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2 border-t border-border pt-6">
              {post.tags.map((tag) => (
                <li
                  key={tag}
                  className="rounded-full bg-secondary px-3 py-1 text-sm font-medium text-primary"
                >
                  #{tag}
                </li>
              ))}
            </ul>
          )}
          <Link
            to={def.path as ListPath}
            search={{}}
            className="mt-10 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:underline"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Back to {def.label.toLowerCase()}
          </Link>
        </article>

        <aside className="space-y-6">
          {isEvent && (
            <div className="overflow-hidden rounded-2xl border border-border bg-white">
              <div className="bg-primary px-5 py-3 text-xs font-bold tracking-[0.14em] text-brand-sky uppercase">
                Event details
              </div>
              <dl className="space-y-4 p-5 text-sm">
                <div>
                  <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                    Date
                  </dt>
                  <dd className="mt-1 font-semibold text-slate-900">{formatLongDate(start)}</dd>
                  {post.event_end && post.event_end.slice(0, 10) !== start.slice(0, 10) && (
                    <dd className="text-slate-700">to {formatLongDate(post.event_end)}</dd>
                  )}
                </div>
                {hasTime(start) && (
                  <div>
                    <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      Time
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">
                      {formatTime(start)}
                      {post.event_end &&
                        hasTime(post.event_end) &&
                        ` – ${formatTime(post.event_end)}`}
                    </dd>
                  </div>
                )}
                {post.venue && (
                  <div>
                    <dt className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                      Venue
                    </dt>
                    <dd className="mt-1 font-semibold text-slate-900">{post.venue}</dd>
                  </div>
                )}
              </dl>
              <div className="space-y-2 border-t border-border p-5">
                {post.registration_url && (
                  <SmartLink
                    href={post.registration_url}
                    className="flex items-center justify-center gap-2 rounded-full bg-brand-green px-5 py-3 text-sm font-bold text-white hover:bg-[#00703f]"
                  >
                    <Ticket className="size-4" aria-hidden="true" />
                    Register
                  </SmartLink>
                )}
                <a
                  href={googleCalendarUrl(post)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 rounded-full border border-border px-5 py-3 text-sm font-semibold text-primary hover:border-primary"
                >
                  <CalendarPlus className="size-4" aria-hidden="true" />
                  Add to calendar
                </a>
              </div>
            </div>
          )}

          {post.attachment_url && (
            <a
              href={post.attachment_url}
              target="_blank"
              rel="noopener"
              className="flex items-center gap-3 rounded-2xl border border-border bg-white p-5 transition-colors hover:border-primary"
            >
              <span className="flex size-11 items-center justify-center rounded-xl bg-red-50 text-brand-flame">
                <FileDown className="size-5" aria-hidden="true" />
              </span>
              <span>
                <span className="block font-semibold text-slate-900">Download attachment</span>
                <span className="text-xs text-muted-foreground">Official document</span>
              </span>
            </a>
          )}

          <ShareBox title={post.title} />

          {related.length > 0 && (
            <div>
              <p className="mb-3 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
                More {def.label.toLowerCase()}
              </p>
              <ul className="space-y-3">
                {related.map((r) => (
                  <li key={r.id}>
                    <SmartLink
                      href={`${def.path}/${r.slug}`}
                      className="group flex gap-3 rounded-xl p-2 transition-colors hover:bg-secondary"
                    >
                      <CoverImage
                        src={r.cover_image_url}
                        sizes="64px"
                        className="size-16 shrink-0 rounded-lg"
                      />
                      <span className="min-w-0">
                        <span className="line-clamp-2 text-sm font-semibold text-slate-900 group-hover:text-primary">
                          {r.title}
                        </span>
                        <span className="mt-1 block text-xs text-muted-foreground">
                          {formatDate(
                            r.type === "event" ? (r.event_start ?? r.published_at) : r.published_at,
                          )}
                        </span>
                      </span>
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </aside>
      </div>
    </>
  );
}

function googleCalendarUrl(post: FullPost) {
  const fmt = (v: string) => v.replace(/[-: ]/g, "").replace(/^(\d{8})(\d{6})$/, "$1T$2Z");
  const start = post.event_start ?? post.published_at;
  const end = post.event_end ?? start;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: post.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: post.excerpt ?? "",
    location: post.venue ?? "",
  });
  return `https://calendar.google.com/calendar/render?${params}`;
}

function ShareBox({ title }: { title: string }) {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  useEffect(() => setUrl(window.location.href), []);
  const encoded = encodeURIComponent(url);
  const text = encodeURIComponent(title);
  const links = [
    { label: "WhatsApp", href: `https://wa.me/?text=${text}%20${encoded}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encoded}` },
    { label: "X", href: `https://x.com/intent/post?text=${text}&url=${encoded}` },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded}` },
  ];
  return (
    <div className="rounded-2xl bg-secondary p-5">
      <p className="mb-3 flex items-center gap-2 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
        <Share2 className="size-3.5" aria-hidden="true" />
        Share
      </p>
      <div className="flex flex-wrap gap-2">
        {links.map((l) => (
          <a
            key={l.label}
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-full bg-white px-3 py-1.5 text-sm font-medium text-primary shadow-sm hover:bg-primary hover:text-white"
          >
            {l.label}
          </a>
        ))}
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard.writeText(url).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-medium text-primary shadow-sm hover:bg-primary hover:text-white"
        >
          <Link2 className="size-3.5" aria-hidden="true" />
          {copied ? "Copied!" : "Copy link"}
        </button>
      </div>
    </div>
  );
}
