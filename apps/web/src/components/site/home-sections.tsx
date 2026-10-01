import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  Bell,
  BookOpenText,
  CalendarDays,
  Download,
  FileDown,
  GraduationCap,
  Laptop,
  LibraryBig,
  Mail,
  Newspaper,
  UserRound,
  Wallet,
} from "lucide-react";
import type { DepartmentRow, DocumentRow, PageRow } from "@aka/db";
import { asset } from "#/lib/asset";
import { cn } from "#/lib/utils";
import { useSiteLayout } from "#/lib/site-layout";
import type { SiteSettings } from "#/lib/settings";
import type { PostCard } from "#/server/content";
import { SectionHeading } from "./section-heading";
import { SmartLink } from "./smart-link";
import { CoverImage } from "./cover-image";
import { AnnouncementCard, EventCard, NewsCard } from "./post-cards";
import { DocumentList } from "./document-list";
import { Reveal, Stagger, StaggerItem } from "./reveal";
import { OptimizedImage } from "#/components/site/optimized-image";

const QUICK_ICONS = {
  apply: GraduationCap,
  portal: UserRound,
  elearning: Laptop,
  library: LibraryBig,
  calendar: CalendarDays,
  download: FileDown,
  fees: Wallet,
  news: Newspaper,
  contact: Mail,
} as const;

export function QuickLinksBar() {
  const { settings } = useSiteLayout();
  const items = settings.quickLinks.items;
  if (items.length === 0) return null;
  return (
    <div className="relative z-20 border-b border-border bg-white">
      <Stagger
        gap={0.05}
        className="no-scrollbar mx-auto flex max-w-7xl items-center gap-3 overflow-x-auto px-4 py-4 md:px-8"
      >
        {items.map((item) => {
          const Icon = QUICK_ICONS[item.icon];
          return (
            <StaggerItem key={`${item.label}-${item.url}`} className="shrink-0">
              <SmartLink
                href={item.url}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
                  item.highlight
                    ? "bg-primary text-white hover:bg-primary-dark"
                    : "border border-border text-slate-800 hover:border-primary/40 hover:bg-secondary hover:text-primary",
                )}
              >
                <Icon className="size-4" aria-hidden="true" />
                {item.label}
              </SmartLink>
            </StaggerItem>
          );
        })}
      </Stagger>
    </div>
  );
}

export function WelcomeSection() {
  const { settings } = useSiteLayout();
  const w = settings.welcome;
  if (!w.message) return null;
  return (
    <section className="relative overflow-hidden py-20 md:py-24">
      <div
        className="absolute top-0 left-0 -z-10 h-full w-1/2 bg-gradient-to-r from-secondary to-transparent"
        aria-hidden="true"
      />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 md:px-8 lg:grid-cols-[5fr_7fr]">
        <Reveal from="left" className="relative mx-auto w-full max-w-md">
          <div
            className="absolute -top-4 -left-4 size-full rounded-[2rem] border-2 border-brand-green/40"
            aria-hidden="true"
          />
          <div className="relative overflow-hidden rounded-[2rem] bg-primary shadow-2xl shadow-primary/20">
            {w.photoUrl ? (
              <OptimizedImage
                src={w.photoUrl}
                alt={w.name}
                sizes="(min-width: 768px) 448px, 100vw"
                className="aspect-[4/5] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[4/5] items-center justify-center bg-gradient-to-br from-primary to-primary-dark">
                <div className="dot-grid absolute inset-0 opacity-50" aria-hidden="true" />
                <OptimizedImage
                  src={asset("logo.webp")}
                  alt=""
                  sizes="224px"
                  className="relative w-1/2 drop-shadow-xl"
                />
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-primary-dark via-primary-dark/80 to-transparent p-6 pt-16 text-white">
              <p className="text-lg font-bold">{w.name}</p>
              <p className="text-sm text-brand-sky">{w.role}</p>
            </div>
          </div>
        </Reveal>
        <Reveal from="right" delay={0.1}>
          <p className="text-xs font-bold tracking-[0.18em] text-brand-green uppercase">
            {w.eyebrow}
          </p>
          <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-balance text-primary md:text-4xl">
            {w.title}
          </h2>
          <p className="mt-6 border-l-4 border-brand-green/60 pl-6 text-lg leading-relaxed whitespace-pre-line text-slate-700">
            {w.message}
          </p>
          {w.linkUrl && (
            <SmartLink
              href={w.linkUrl}
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
            >
              {w.linkLabel || "Read more"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </SmartLink>
          )}
        </Reveal>
      </div>
    </section>
  );
}

function useCountUp(target: number, durationMs = 1600) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [value, setValue] = useState(target);
  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setValue(0);
    let frame = 0;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / durationMs);
          setValue(Math.round(target * (1 - Math.pow(1 - t, 3))));
          if (t < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [target, durationMs]);
  return { ref, value };
}

function StatItem({ item }: { item: SiteSettings["stats"]["items"][number] }) {
  const { ref, value } = useCountUp(item.value);
  // Years (e.g. "1963") read wrong with thousands separators.
  const display =
    item.value >= 1900 && item.value <= 2100 && !item.suffix
      ? String(value)
      : value.toLocaleString("en-GB");
  return (
    <div
      ref={ref}
      className="rounded-2xl border border-white/10 bg-white/[0.06] p-6 text-center backdrop-blur-sm"
    >
      <p className="text-4xl font-extrabold tracking-tight text-brand-sky md:text-5xl">
        {display}
        {item.suffix}
      </p>
      <p className="mt-2 font-semibold text-white">{item.label}</p>
      {item.note && <p className="mt-1 text-xs text-white/60">{item.note}</p>}
    </div>
  );
}

export function StatsBand() {
  const { settings } = useSiteLayout();
  const { stats } = settings;
  if (stats.items.length === 0) return null;
  return (
    <section className="relative overflow-hidden bg-primary py-20">
      <div className="dot-grid absolute inset-0 opacity-70" aria-hidden="true" />
      <div
        className="absolute -top-32 -left-32 size-96 rounded-full bg-brand-green/25 blur-3xl"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow={settings.identity.shortName}
            title={stats.title}
            intro={stats.intro}
          />
        </Reveal>
        <Stagger
          className={cn(
            "mx-auto mt-12 grid grid-cols-2 gap-4 md:gap-6",
            stats.items.length === 3
              ? "max-w-5xl md:grid-cols-3"
              : stats.items.length <= 2
                ? "max-w-3xl"
                : "lg:grid-cols-4",
          )}
        >
          {stats.items.map((item) => (
            <StaggerItem key={item.label}>
              <StatItem item={item} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function AcademicsSection({
  departments,
}: {
  departments: Array<Pick<DepartmentRow, "id" | "slug" | "name" | "summary" | "image_url">>;
}) {
  if (departments.length === 0) return null;
  return (
    <section className="py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            align="left"
            eyebrow="Academics"
            title="Academic departments"
            intro="Specialist departments delivering the Bachelor of Education programmes for Ghana's basic schools."
          />
          <SmartLink
            href="/academics"
            className="group inline-flex items-center gap-1.5 font-semibold text-primary"
          >
            Explore academics
            <ArrowRight
              className="size-4 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </SmartLink>
        </Reveal>
        <Stagger as="ul" className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {departments.map((d, i) => (
            <StaggerItem as="li" key={d.id}>
              <SmartLink
                href={`/academics/departments/${d.slug}`}
                className="group relative isolate flex h-56 flex-col justify-end overflow-hidden rounded-2xl p-5 text-white"
              >
                <CoverImage
                  src={d.image_url}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                  className="absolute inset-0 -z-10"
                  imgClassName="transition-transform duration-700 group-hover:scale-110"
                />
                <div
                  className={cn(
                    "absolute inset-0 -z-10 bg-gradient-to-t to-transparent transition-colors",
                    i % 2
                      ? "from-brand-green/95 via-brand-green/40"
                      : "from-primary-dark/95 via-primary/50",
                  )}
                  aria-hidden="true"
                />
                <BookOpenText className="mb-3 size-6 text-brand-sky" aria-hidden="true" />
                <h3 className="text-lg leading-snug font-bold">{d.name}</h3>
                <span className="mt-2 flex items-center gap-1 text-sm font-semibold text-white/80 group-hover:text-white">
                  View department
                  <ArrowRight
                    className="size-3.5 transition-transform group-hover:translate-x-1"
                    aria-hidden="true"
                  />
                </span>
              </SmartLink>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function NewsSection({ news }: { news: Array<PostCard> }) {
  if (news.length === 0) return null;
  const [first, ...rest] = news;
  return (
    <section className="bg-muted py-20">
      <div className="mx-auto max-w-7xl px-4 md:px-8">
        <Reveal className="flex flex-wrap items-end justify-between gap-6">
          <SectionHeading
            align="left"
            eyebrow="News"
            title="Latest from the college"
            intro="Stories of teaching, learning and life on campus."
          />
          <SmartLink
            href="/news"
            className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            All news
            <ArrowRight className="size-4" aria-hidden="true" />
          </SmartLink>
        </Reveal>
        <Stagger className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {first && (
            <StaggerItem className="flex md:col-span-2">
              <NewsCard post={first} featured />
            </StaggerItem>
          )}
          {rest.map((post) => (
            <StaggerItem key={post.id} className="flex">
              <NewsCard post={post} />
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function NoticesAndEvents({
  announcements,
  events,
  eventsAreUpcoming,
}: {
  announcements: Array<PostCard>;
  events: Array<PostCard>;
  eventsAreUpcoming: boolean;
}) {
  if (announcements.length === 0 && events.length === 0) return null;
  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-7xl gap-12 px-4 md:px-8 lg:grid-cols-[7fr_5fr]">
        <Reveal from="left">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading align="left" eyebrow="Notices" title="Announcements" />
            <SmartLink
              href="/announcements"
              className="group hidden items-center gap-1.5 text-sm font-semibold text-primary sm:inline-flex"
            >
              <Bell className="size-4" aria-hidden="true" />
              View all
              <ArrowRight
                className="size-4 transition-transform group-hover:translate-x-1"
                aria-hidden="true"
              />
            </SmartLink>
          </div>
          <Stagger className="mt-8 grid gap-4">
            {announcements.length ? (
              announcements.map((post) => (
                <StaggerItem key={post.id}>
                  <AnnouncementCard post={post} />
                </StaggerItem>
              ))
            ) : (
              <p className="text-muted-foreground">No current announcements.</p>
            )}
          </Stagger>
        </Reveal>
        <Reveal
          from="right"
          delay={0.1}
          className="rounded-3xl bg-gradient-to-b from-secondary to-white p-6 ring-1 ring-border md:p-8"
        >
          <div className="flex items-end justify-between gap-4">
            <SectionHeading
              align="left"
              eyebrow="Calendar"
              title={eventsAreUpcoming ? "Upcoming events" : "Recent events"}
            />
          </div>
          <Stagger className="mt-6 grid gap-1">
            {events.length ? (
              events.map((post) => (
                <StaggerItem key={post.id}>
                  <EventCard post={post} variant="row" />
                </StaggerItem>
              ))
            ) : (
              <p className="text-muted-foreground">No events scheduled yet.</p>
            )}
          </Stagger>
          <SmartLink
            href="/events"
            className="mt-6 flex items-center justify-center gap-2 rounded-full border border-primary/20 bg-white px-5 py-3 text-sm font-semibold text-primary transition-colors hover:bg-primary hover:text-white"
          >
            <CalendarDays className="size-4" aria-hidden="true" />
            Full events calendar
          </SmartLink>
        </Reveal>
      </div>
    </section>
  );
}

export function StudentLifeSection({
  pages,
}: {
  pages: Array<Pick<PageRow, "slug" | "title" | "summary" | "hero_image_url">>;
}) {
  if (pages.length === 0) return null;
  return (
    <section className="relative overflow-hidden bg-primary-dark py-20">
      <div className="line-grid absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto max-w-7xl px-4 md:px-8">
        <Reveal>
          <SectionHeading
            tone="dark"
            eyebrow="Student life"
            title="Experience Akatsi"
            intro="Leadership, faith, sports, clubs and a caring community — college life beyond the lecture hall."
          />
        </Reveal>
        <Stagger className="mt-12 grid gap-6 md:grid-cols-2">
          {pages.map((p) => (
            <StaggerItem key={p.slug} className="flex">
              <SmartLink
                href={`/student-life/${p.slug}`}
                className="group flex w-full flex-col overflow-hidden rounded-2xl bg-white shadow-xl transition-transform hover:-translate-y-1 sm:flex-row"
              >
                <CoverImage
                  src={p.hero_image_url}
                  sizes="(min-width: 1024px) 240px, (min-width: 640px) 40vw, 100vw"
                  className="aspect-[16/9] sm:aspect-auto sm:w-2/5"
                  imgClassName="transition-transform duration-500 group-hover:scale-105"
                />
                <div className="flex flex-1 flex-col justify-center p-6">
                  <h3 className="text-xl font-bold text-primary">{p.title}</h3>
                  {p.summary && (
                    <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{p.summary}</p>
                  )}
                  <span className="mt-4 flex items-center gap-1 text-sm font-semibold text-brand-green">
                    Learn more
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </SmartLink>
            </StaggerItem>
          ))}
        </Stagger>
      </div>
    </section>
  );
}

export function DownloadsSection({ documents }: { documents: Array<DocumentRow> }) {
  if (documents.length === 0) return null;
  return (
    <section className="py-20">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 md:px-8 lg:grid-cols-[4fr_8fr]">
        <Reveal from="left">
          <SectionHeading
            align="left"
            eyebrow="Guides & downloads"
            title="Documents you need"
            intro="Admission forms, handbooks, academic calendars and official guides — always the latest version."
          />
          <SmartLink
            href="/downloads"
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark"
          >
            <Download className="size-4" aria-hidden="true" />
            Browse all downloads
          </SmartLink>
        </Reveal>
        <Reveal from="right" delay={0.1}>
          <DocumentList documents={documents} />
        </Reveal>
      </div>
    </section>
  );
}

export function CtaBand() {
  const { settings } = useSiteLayout();
  const cta = settings.cta;
  if (!cta.title) return null;
  return (
    <section className="relative overflow-hidden bg-brand-green py-20 text-white">
      <div className="line-grid absolute inset-0" aria-hidden="true" />
      <OptimizedImage
        src={asset("logo-sm.webp")}
        alt=""
        sizes="256px"
        className="pointer-events-none absolute -right-10 -bottom-16 h-80 w-auto opacity-10"
        aria-hidden="true"
      />
      <Reveal className="relative mx-auto max-w-3xl px-4 text-center">
        <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-white/15">
          <GraduationCap className="size-8" aria-hidden="true" />
        </div>
        <h2 className="mt-6 text-4xl leading-tight font-extrabold tracking-tight md:text-5xl">
          <span className="block">{cta.title}</span>
          {cta.highlight && <span className="block text-primary-dark">{cta.highlight}</span>}
        </h2>
        {cta.text && <p className="mx-auto mt-5 max-w-2xl text-lg text-white/85">{cta.text}</p>}
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          {cta.primaryLabel && cta.primaryUrl && (
            <SmartLink
              href={cta.primaryUrl}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-8 py-4 font-bold text-white shadow-lg transition hover:bg-primary-dark"
            >
              {cta.primaryLabel}
              <ArrowRight className="size-4" aria-hidden="true" />
            </SmartLink>
          )}
          {cta.secondaryLabel && cta.secondaryUrl && (
            <SmartLink
              href={cta.secondaryUrl}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-8 py-4 font-semibold ring-1 ring-white/40 transition hover:bg-white/20"
            >
              {cta.secondaryLabel}
            </SmartLink>
          )}
        </div>
      </Reveal>
    </section>
  );
}
