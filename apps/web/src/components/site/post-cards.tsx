import { ArrowRight, ArrowUpRight, CalendarDays, Clock, MapPin, Megaphone, Pin } from "lucide-react";
import type { PostType } from "@aka/db";
import { dateParts, formatDate, formatEventRange, formatTime, hasTime } from "#/lib/format";
import { cn } from "#/lib/utils";
import type { PostCard } from "#/server/content";
import { CoverImage } from "./cover-image";
import { SmartLink } from "./smart-link";

const BASE: Record<PostType, string> = { news: "/news", event: "/events", announcement: "/announcements" };

export function postHref(post: Pick<PostCard, "type" | "slug">) {
  return `${BASE[post.type]}/${post.slug}`;
}

export function NewsCard({ post, featured = false }: { post: PostCard; featured?: boolean }) {
  return (
    <SmartLink
      href={postHref(post)}
      className={cn(
        "group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10",
        featured && "lg:flex-row",
      )}
    >
      <CoverImage
        src={post.cover_image_url}
        className={cn("aspect-[16/10] shrink-0", featured && "lg:aspect-auto lg:w-[55%]")}
        imgClassName="transition-transform duration-500 group-hover:scale-105"
      />
      <article className={cn("flex flex-1 flex-col p-5", featured && "lg:justify-center lg:p-8")}>
        <div className="flex flex-wrap items-center gap-2 text-[13px] text-muted-foreground">
          {post.category && (
            <span className="rounded-full bg-accent px-2.5 py-0.5 text-xs font-semibold text-primary">{post.category}</span>
          )}
          <span className="flex items-center gap-1">
            <CalendarDays className="size-3.5" aria-hidden="true" />
            {formatDate(post.published_at)}
          </span>
        </div>
        <h3
          className={cn(
            "mt-3 font-bold text-slate-900 transition-colors group-hover:text-primary",
            featured ? "text-xl lg:text-2xl" : "line-clamp-2 text-lg",
          )}
        >
          {post.title}
        </h3>
        {post.excerpt && (
          <p className={cn("mt-2 text-sm leading-relaxed text-muted-foreground", featured ? "line-clamp-4" : "line-clamp-2")}>
            {post.excerpt}
          </p>
        )}
        <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-primary">
          Read story
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
        </span>
      </article>
    </SmartLink>
  );
}

export function AnnouncementCard({ post }: { post: PostCard }) {
  const important = post.is_pinned === 1 || post.category === "Important";
  return (
    <SmartLink
      href={postHref(post)}
      className="group flex gap-4 rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
    >
      <div
        className={cn(
          "flex size-12 shrink-0 items-center justify-center rounded-xl",
          important ? "bg-brand-flame text-white" : "bg-primary text-white",
        )}
      >
        {post.is_pinned ? <Pin className="size-5" aria-hidden="true" /> : <Megaphone className="size-5" aria-hidden="true" />}
      </div>
      <article className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          {post.category && (
            <span
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-semibold",
                important ? "bg-red-50 text-brand-flame" : "bg-secondary text-primary",
              )}
            >
              {post.category}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="size-3.5" aria-hidden="true" />
            {formatDate(post.published_at)}
          </span>
        </div>
        <h3 className="mt-2 line-clamp-2 font-bold text-slate-900 group-hover:text-primary">{post.title}</h3>
        {post.excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
      </article>
      <ArrowUpRight
        className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary"
        aria-hidden="true"
      />
    </SmartLink>
  );
}

export function EventCard({ post, variant = "card" }: { post: PostCard; variant?: "card" | "row" }) {
  const start = post.event_start ?? post.published_at;
  const { day, month } = dateParts(start);
  const dateTile = (
    <div className="flex size-16 shrink-0 flex-col items-center justify-center rounded-xl bg-primary text-white shadow-md">
      <span className="text-2xl leading-none font-extrabold">{day}</span>
      <span className="mt-0.5 text-[11px] font-bold tracking-wider text-brand-sky uppercase">{month}</span>
    </div>
  );

  if (variant === "row") {
    return (
      <SmartLink
        href={postHref(post)}
        className="group flex items-center gap-4 rounded-2xl border border-transparent p-3 transition-colors hover:border-border hover:bg-white"
      >
        {dateTile}
        <div className="min-w-0">
          <h3 className="line-clamp-2 font-bold text-slate-900 group-hover:text-primary">{post.title}</h3>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[13px] text-muted-foreground">
            {hasTime(start) && (
              <span className="flex items-center gap-1">
                <Clock className="size-3.5" aria-hidden="true" />
                {formatTime(start)}
              </span>
            )}
            {post.venue && (
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5" aria-hidden="true" />
                {post.venue}
              </span>
            )}
          </p>
        </div>
      </SmartLink>
    );
  }

  return (
    <SmartLink
      href={postHref(post)}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
    >
      <div className="relative">
        <CoverImage
          src={post.cover_image_url}
          className="aspect-[16/9]"
          imgClassName="transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute -bottom-6 left-5">{dateTile}</div>
        {post.category && (
          <span className="absolute top-3 right-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-primary">
            {post.category}
          </span>
        )}
      </div>
      <article className="flex flex-1 flex-col p-5 pt-9">
        <h3 className="line-clamp-2 text-lg font-bold text-slate-900 group-hover:text-primary">{post.title}</h3>
        <div className="mt-2 space-y-1 text-[13px] text-muted-foreground">
          <p className="flex items-center gap-1.5">
            <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
            {formatEventRange(start, post.event_end)}
          </p>
          {post.venue && (
            <p className="flex items-center gap-1.5">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              {post.venue}
            </p>
          )}
        </div>
        {post.excerpt && <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{post.excerpt}</p>}
      </article>
    </SmartLink>
  );
}
