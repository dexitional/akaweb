import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Home,
  LayoutGrid,
  List,
  Printer,
  Search,
  Share2,
  Users,
  X,
} from "lucide-react";

import { cn } from "#/lib/utils";
import { FavouriteButton, PersonPhoto, profileHref } from "../shared/StaffBits";

import type { RelatedUnit, UnitLeader, UnitPerson } from "#/lib/directory-types";

export type StaffTab = "all" | "teaching" | "non-teaching";
export type QuickFilter = "" | "professors" | "heads" | "senior";
export type StaffSort = "relevance" | "name" | "designation";
export type StaffView = "grid" | "list";
export type StaffScope = "page" | "global";

export interface DepartmentPageState {
  q: string;
  filter: StaffTab;
  quick: QuickFilter;
  sort: StaffSort;
  view: StaffView;
  scope: StaffScope;
}

export interface DepartmentDetailPageProps {
  slug: string;
  name: string;
  code?: string;
  category?: { name: string; pluralName: string; slug: string };
  leaders: UnitLeader[];
  staff: UnitPerson[]; // this unit's staff, leaders excluded
  relatedUnits: RelatedUnit[];
  summary?: string;
  pageHref?: string; // the unit's full page on the main site
  directoryStaff: UnitPerson[]; // everyone, for the "Full Directory" scope
  initialState: DepartmentPageState;
}

const QUICK_FILTERS: {
  key: Exclude<QuickFilter, "">;
  label: string;
  test: (title: string) => boolean;
}[] = [
  { key: "professors", label: "Professors Only", test: (t) => /professor/i.test(t) },
  { key: "heads", label: "Department Heads", test: (t) => /\bhead\b|\bdean\b|director/i.test(t) },
  {
    key: "senior",
    label: "Senior Staff",
    test: (t) => /\b(senior|principal|chief)\b|professor/i.test(t),
  },
];

const SORT_LABELS: Record<StaffSort, string> = {
  relevance: "Relevance",
  name: "Name A–Z",
  designation: "Designation",
};

const TAB_LABELS: Record<StaffTab, string> = {
  all: "All Staff",
  teaching: "Teaching",
  "non-teaching": "Non-teaching",
};

function LeaderCard({ leader }: { leader: UnitLeader }) {
  const body = (
    <>
      <div className="absolute inset-0 bg-gradient-to-br from-[#39418f]/0 via-[#39418f]/0 to-[#39418f]/5 transition-all duration-500 group-hover:from-[#39418f]/5 group-hover:via-[#39418f]/5 group-hover:to-[#39418f]/10" />
      <div className="absolute top-0 right-0 -mt-20 -mr-20 h-40 w-40 rounded-full bg-[#39418f]/10 transition-transform duration-700 group-hover:scale-150" />
      <div className="absolute bottom-0 left-0 -mb-16 -ml-16 h-32 w-32 rounded-full bg-[#39418f]/5 transition-transform duration-700 group-hover:scale-125" />
      <div className="relative p-7">
        <div className="mb-5 flex justify-center">
          <div className="relative">
            <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#39418f] to-[var(--primary)] opacity-40 blur-2xl transition-opacity group-hover:opacity-60" />
            <PersonPhoto
              person={leader}
              sizes="192px"
              className="h-48 w-48 rounded-2xl shadow-2xl ring-4 ring-white transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute -right-2 -bottom-2 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-[#39418f] to-[var(--primary)] shadow-lg ring-4 ring-white transition-transform group-hover:scale-110">
              <Check className="h-6 w-6 text-white" strokeWidth={2.5} aria-hidden="true" />
            </div>
          </div>
        </div>
        <div className="text-center">
          <h3 className="mb-2 text-xl font-black text-[#0b1a62] transition-colors group-hover:text-[#39418f]">
            {leader.name}
          </h3>
          {leader.role && <p className="text-sm font-medium text-[#5a5f7e]">{leader.role}</p>}
        </div>
        {leader.slug && (
          <div className="absolute right-7 bottom-7 flex h-10 w-10 scale-75 items-center justify-center rounded-full bg-[#39418f] opacity-0 shadow-lg transition-all group-hover:scale-100 group-hover:opacity-100">
            <ChevronRight className="h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />
          </div>
        )}
      </div>
    </>
  );

  return (
    <article className="group relative overflow-hidden rounded-2xl border-2 border-[#c9cde6] bg-gradient-to-br from-[#eef0f8] via-white to-[#eef0f8]/50 transition-all duration-300 hover:-translate-y-1 hover:border-[#39418f] hover:shadow-2xl">
      <FavouriteButton slug={leader.slug} name={leader.name} />
      {leader.slug ? (
        <Link to="/directory/p/$slug" params={{ slug: leader.slug }} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </article>
  );
}

function StaffCard({ person, showDepartment }: { person: UnitPerson; showDepartment: boolean }) {
  const subtitle = [person.title, showDepartment ? person.department : undefined]
    .filter(Boolean)
    .join(" · ");
  const body = (
    <>
      <div className="overflow-hidden bg-[#eef0f8]">
        <PersonPhoto
          person={person}
          sizes="(min-width: 1280px) 25vw, (min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="h-72 w-full"
        />
      </div>
      <div className="border-t-4 border-transparent p-4 transition-colors duration-200 group-hover:border-[#39418f]">
        <h3 className="mb-1 truncate text-sm font-bold text-balance text-[#0b1a62]">
          {person.name}
        </h3>
        {subtitle && <p className="line-clamp-2 text-xs text-pretty text-[#5a5f7e]">{subtitle}</p>}
      </div>
    </>
  );

  return (
    <article className="group relative overflow-hidden rounded-xl border border-[#d4d7e8] bg-white transition-all duration-200 hover:border-[#39418f] hover:shadow-md">
      <FavouriteButton slug={person.slug} name={person.name} />
      {person.slug ? (
        <Link to="/directory/p/$slug" params={{ slug: person.slug }} className="block">
          {body}
        </Link>
      ) : (
        body
      )}
    </article>
  );
}

function StaffRow({ person, showDepartment }: { person: UnitPerson; showDepartment: boolean }) {
  const subtitle = [person.title, showDepartment ? person.department : undefined]
    .filter(Boolean)
    .join(" · ");
  const body = (
    <>
      <div className="shrink-0">
        <PersonPhoto
          person={person}
          sizes="64px"
          className="size-16 rounded-lg ring-1 ring-[#d4d7e8] transition-all group-hover:ring-[#39418f]"
        />
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="mb-0.5 truncate text-sm font-bold text-[#0b1a62]">{person.name}</h3>
        {subtitle && <p className="truncate text-xs text-pretty text-[#5a5f7e]">{subtitle}</p>}
      </div>
      <ChevronRight
        className="size-4 shrink-0 text-[#b6b9d1] transition-colors group-hover:text-[#39418f]"
        strokeWidth={2}
        aria-hidden="true"
      />
    </>
  );

  return (
    <article className="group relative overflow-hidden rounded-xl border border-[#d4d7e8] bg-white transition-all duration-200 hover:border-[#39418f] hover:shadow-md">
      <FavouriteButton slug={person.slug} name={person.name} />
      {person.slug ? (
        // pr-14 keeps the chevron clear of the corner favourite star.
        <Link
          to="/directory/p/$slug"
          params={{ slug: person.slug }}
          className="flex items-center gap-4 p-4 pr-14"
        >
          {body}
        </Link>
      ) : (
        <div className="flex items-center gap-4 p-4 pr-14">{body}</div>
      )}
    </article>
  );
}

interface StaffGroupData {
  key: string;
  title: string;
  subtitle: string;
  people: UnitPerson[];
}

function StaffGroup({
  group,
  view,
  showDepartment,
}: {
  group: StaffGroupData;
  view: StaffView;
  showDepartment: boolean;
}) {
  const headingId = `staff-group-${group.key}`;
  return (
    <section aria-labelledby={headingId}>
      <div className="mb-8 border-b border-[#d4d7e8] pb-5">
        <div className="flex items-center gap-3">
          <h2
            id={headingId}
            className="text-xl font-bold tracking-tight text-balance text-[#0b1a62]"
          >
            {group.title}
          </h2>
          <span className="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded-full bg-[#e4e6f5] px-2 text-xs font-bold text-[#39418f] tabular-nums">
            {group.people.length}
          </span>
        </div>
        <p className="mt-1 text-sm text-pretty text-[#5a5f7e]">{group.subtitle}</p>
      </div>
      {view === "grid" ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {group.people.map((person, i) => (
            <StaffCard
              key={person.slug ?? `${person.name}-${i}`}
              person={person}
              showDepartment={showDepartment}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {group.people.map((person, i) => (
            <StaffRow
              key={person.slug ?? `${person.name}-${i}`}
              person={person}
              showDepartment={showDepartment}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function matchesQuery(person: UnitPerson, query: string) {
  if (!query) return true;
  return [person.name, person.title, person.slug]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(query);
}

function downloadCsv(filename: string, people: UnitPerson[], origin: string) {
  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = [
    ["Name", "Designation", "Staff type", "Department", "Profile"],
    ...people.map((p) => [
      p.name,
      p.title ?? "",
      p.staffType ?? "",
      p.department ?? "",
      p.slug ? `${origin}${profileHref(p.slug)}` : "",
    ]),
  ];
  const blob = new Blob([rows.map((row) => row.map(escape).join(",")).join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function DepartmentDetailPage({
  slug,
  name,
  category,
  leaders,
  staff,
  relatedUnits,
  summary,
  pageHref,
  directoryStaff,
  initialState,
}: DepartmentDetailPageProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  const exportRef = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<DepartmentPageState>(initialState);
  const [relatedOpen, setRelatedOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const { q, filter, quick, sort, view, scope } = state;
  const query = q.trim().toLowerCase();
  const searchingDirectory = scope === "global" && query !== "";

  function update(patch: Partial<DepartmentPageState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  function clearFilters() {
    update({ q: "", filter: "all", quick: "", sort: "relevance" });
  }

  // Keep the URL shareable: filter & view always, the rest only when set.
  useEffect(() => {
    const params = new URLSearchParams({ filter, view });
    if (q) params.set("q", q);
    if (quick) params.set("quick", quick);
    if (sort !== "relevance") params.set("sort", sort);
    if (scope !== "page") params.set("scope", scope);
    const next = `${window.location.pathname}?${params.toString()}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [q, filter, quick, sort, view, scope]);

  // "/" focuses search; Escape clears search & filters.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (event.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        event.preventDefault();
        searchRef.current?.focus();
      }
      if (event.key === "Escape") {
        setExportOpen(false);
        setState((prev) => ({ ...prev, q: "", filter: "all", quick: "", sort: "relevance" }));
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  // Close the export menu on an outside click.
  useEffect(() => {
    if (!exportOpen) return;
    function onPointerDown(event: PointerEvent) {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [exportOpen]);

  const searched = useMemo(() => {
    const pool = searchingDirectory ? directoryStaff : staff;
    const quickTest = QUICK_FILTERS.find((f) => f.key === quick)?.test;
    return pool.filter((p) => matchesQuery(p, query) && (!quickTest || quickTest(p.title ?? "")));
  }, [searchingDirectory, directoryStaff, staff, query, quick]);

  const tabCounts: Record<StaffTab, number> = {
    all: searched.length,
    teaching: searched.filter((p) => p.staffType === "teaching").length,
    "non-teaching": searched.filter((p) => p.staffType === "non-teaching").length,
  };
  // Only offer a tab when the unit actually has staff of that type.
  const tabs = (["all", "teaching", "non-teaching"] as const).filter(
    (tab) =>
      tab === "all" ||
      (searchingDirectory ? directoryStaff : staff).some((p) => p.staffType === tab),
  );

  const visible = useMemo(() => {
    const list = filter === "all" ? [...searched] : searched.filter((p) => p.staffType === filter);
    if (sort === "name") return list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "designation") {
      return list.sort(
        (a, b) => (a.title ?? "").localeCompare(b.title ?? "") || a.name.localeCompare(b.name),
      );
    }
    // Relevance: when searching, names that start with the query come first.
    if (query) {
      const starts = (p: UnitPerson) =>
        p.name.toLowerCase().includes(` ${query}`) || p.name.toLowerCase().startsWith(query)
          ? 0
          : 1;
      return list.sort((a, b) => starts(a) - starts(b));
    }
    return list;
  }, [searched, filter, sort, query]);

  // Split into Teaching / Non-Teaching only when both kinds are present
  // (leaders are already excluded); otherwise one "Staff Members" list.
  const staffGroups = useMemo<StaffGroupData[]>(() => {
    const teaching = visible.filter((p) => p.staffType === "teaching");
    const nonTeaching = visible.filter((p) => p.staffType === "non-teaching");
    if (teaching.length === 0 || nonTeaching.length === 0) {
      return [
        searchingDirectory
          ? {
              key: "results",
              title: "Directory Results",
              subtitle: "Matching staff from across the college",
              people: visible,
            }
          : {
              key: "all",
              title: "Staff Members",
              subtitle: "Browse our complete directory of staff members",
              people: visible,
            },
      ];
    }
    const untyped = visible.filter(
      (p) => p.staffType !== "teaching" && p.staffType !== "non-teaching",
    );
    return [
      {
        key: "teaching",
        title: "Teaching Staff",
        subtitle: "Lecturers, researchers and academic staff",
        people: teaching,
      },
      {
        key: "non-teaching",
        title: "Non-Teaching Staff",
        subtitle: "Administrative, technical and support staff",
        people: nonTeaching,
      },
      {
        key: "other",
        title: "Other Staff",
        subtitle: "Staff not yet marked as teaching or non-teaching",
        people: untyped,
      },
    ].filter((group) => group.people.length > 0);
  }, [visible, searchingDirectory]);

  const showLeadership = leaders.length > 0 && !query && filter === "all" && !quick;
  const activeChips = [
    query ? `Search: “${q.trim()}”` : null,
    filter !== "all" ? TAB_LABELS[filter] : null,
    quick ? QUICK_FILTERS.find((f) => f.key === quick)?.label : null,
    `Sorted: ${SORT_LABELS[sort]}`,
  ].filter((chip): chip is string => Boolean(chip));
  const staffTotal = staff.length;

  async function copyShareLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked — nothing useful to show.
    }
  }

  const breadcrumbLink =
    "inline-flex max-w-[150px] items-center truncate rounded-md px-1.5 py-0.5 text-xs font-medium text-[#5a5f7e] transition-all duration-200 hover:bg-[#e4e6f5]/50 hover:text-[#0b1a62] focus:ring-2 focus:ring-[#39418f] focus:ring-offset-2 focus:outline-none sm:max-w-xs sm:px-2 sm:py-1 sm:text-sm lg:max-w-none";
  const separator = (
    <ChevronRight
      className="mx-1 h-3 w-3 shrink-0 text-[#5a5f7e] sm:mx-2 sm:h-4 sm:w-4"
      aria-hidden="true"
    />
  );

  return (
    <div className="min-h-dvh bg-[#edeef6]">
      <a
        href="#department-staff"
        className="sr-only z-50 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-[#39418f] shadow-lg focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#39418f]"
      >
        Skip to staff
      </a>

      {/* Breadcrumb */}
      <nav
        className="flex min-h-10 bg-[#e4e6f5] py-2 sm:py-3 print:hidden"
        aria-label="Breadcrumb navigation"
      >
        <ol
          role="list"
          className="flex w-full flex-wrap items-center gap-1 px-4 sm:gap-2 sm:px-6 lg:px-20"
        >
          <li className="flex items-center">
            <Link to="/" className={breadcrumbLink} aria-label="Go to homepage">
              <Home className="mr-1 h-3 w-3 shrink-0 sm:mr-2 sm:h-4 sm:w-4" aria-hidden="true" />
              Home
            </Link>
          </li>
          <li className="flex items-center">
            {separator}
            <Link to="/directory" className={breadcrumbLink}>
              Directory
            </Link>
          </li>
          {category && (
            <li className="flex items-center">
              {separator}
              <Link
                to="/directory/d/list/$category"
                params={{ category: category.slug }}
                className={breadcrumbLink}
              >
                {category.pluralName}
              </Link>
            </li>
          )}
          <li className="flex items-center">
            {separator}
            <span
              aria-current="page"
              className="inline-flex max-w-[150px] items-center truncate rounded-md bg-[#e4e6f5]/50 px-1.5 py-0.5 text-xs font-semibold text-[#0b1a62] sm:max-w-xs sm:px-2 sm:py-1 sm:text-sm lg:max-w-none"
            >
              {name}
            </span>
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <div className="hero-cover text-white">
        <div className="mx-auto max-w-7xl px-6 pt-10 pb-0 lg:px-8">
          <div className="mb-6">
            {category && (
              <p className="mb-2 text-xs font-semibold tracking-widest text-white/60 uppercase">
                {category.pluralName}
              </p>
            )}
            <h1 className="text-3xl leading-tight font-bold tracking-tight text-balance lg:text-4xl">
              {name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-pretty text-white/70">
              <span className="font-semibold text-white tabular-nums">{staffTotal}</span>{" "}
              {staffTotal === 1 ? "staff member" : "staff members"}
              {leaders.length > 0 && (
                <>
                  {" "}
                  · <span className="tabular-nums">{leaders.length}</span>{" "}
                  {leaders.length === 1 ? "leader" : "leaders"}
                </>
              )}
            </p>
            {summary && (
              <p className="mt-3 line-clamp-3 max-w-2xl text-sm text-pretty text-white/80">
                {summary}
              </p>
            )}
            {pageHref && (
              <a
                href={pageHref}
                className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white ring-1 ring-white/20 transition hover:bg-white/20 print:hidden"
              >
                Visit {category?.name.toLowerCase() ?? "unit"} page
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </a>
            )}
          </div>

          <div className="relative max-w-2xl print:hidden" role="search" aria-label="Staff search">
            <label htmlFor="staff-search" className="sr-only">
              Search staff
            </label>
            <div
              className="pointer-events-none absolute inset-y-0 left-4 flex items-center"
              aria-hidden="true"
            >
              <Search className="size-5 text-white/60" />
            </div>
            <input
              ref={searchRef}
              id="staff-search"
              type="search"
              value={q}
              onChange={(event) => update({ q: event.target.value })}
              placeholder="Search by name or designation…"
              autoComplete="off"
              spellCheck={false}
              className="w-full rounded-xl border border-white/20 bg-white/10 py-3.5 pr-10 pl-11 text-sm text-white placeholder-white/60 transition outline-none focus:bg-white/15 focus:ring-2 focus:ring-white [&::-webkit-search-cancel-button]:hidden"
            />
            {q && (
              <button
                type="button"
                onClick={clearFilters}
                aria-label="Clear search"
                className="absolute inset-y-0 right-3 my-auto flex size-7 cursor-pointer items-center justify-center rounded-full text-white/70 transition hover:bg-white/10 hover:text-white"
              >
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>

          <div
            className="mt-8 -mb-px flex items-end gap-1 overflow-x-auto print:hidden"
            role="tablist"
            aria-label="Filter by staff category"
          >
            {tabs.map((tab) => {
              const selected = filter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => update({ filter: tab })}
                  className={cn(
                    "inline-flex cursor-pointer items-center gap-1.5 rounded-t-lg border-b-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-colors",
                    selected
                      ? "border-white bg-white text-[#0b1a62]"
                      : "border-transparent text-white/70 hover:bg-white/10 hover:text-white",
                  )}
                >
                  {TAB_LABELS[tab]}
                  <span
                    className={cn(
                      "inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full px-1.5 text-xs font-bold tabular-nums",
                      selected ? "bg-[#39418f] text-white" : "bg-white/15 text-white/80",
                    )}
                  >
                    {tabCounts[tab]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 py-3 print:hidden">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-white/50 uppercase">
                Search in:
              </span>
              {(
                [
                  ["page", `This ${category?.name ?? "Unit"}`],
                  ["global", "Full Directory"],
                ] as const
              ).map(([key, label]) => {
                const pressed = scope === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => update({ scope: key })}
                    className={cn(
                      "inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
                      pressed
                        ? "border-white/40 bg-white/20 font-semibold text-white"
                        : "border-white/20 text-white/70 hover:border-white/40 hover:bg-white/10",
                    )}
                  >
                    {pressed && <CheckCircle2 className="size-3 shrink-0" aria-hidden="true" />}
                    {label}
                  </button>
                );
              })}
            </div>
            {scope === "global" && !query && (
              <p className="text-xs text-white/60">
                Type a name to search everyone in the directory.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Controls — sticks just below the 80px sticky site header */}
      <nav
        className="sticky top-20 z-40 border-b border-[#d4d7e8] bg-white shadow-sm print:hidden"
        aria-label="Staff controls"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-x-2">
            {/* Scrolls sideways on narrow screens; the export menu stays outside it so it isn't clipped. */}
            <div className="flex min-w-0 items-center gap-1 overflow-x-auto py-3">
              {QUICK_FILTERS.map((f) => {
                const pressed = quick === f.key;
                return (
                  <button
                    key={f.key}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => update({ quick: pressed ? "" : f.key })}
                    className={cn(
                      "cursor-pointer rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-[#39418f] focus-visible:outline-none",
                      pressed
                        ? "bg-[#39418f] text-white"
                        : "text-[#5a5f7e] hover:bg-[#eef0f8] hover:text-[#0b1a62]",
                    )}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            <div className="flex shrink-0 items-center gap-2 py-2.5">
              <select
                value={sort}
                onChange={(event) => update({ sort: event.target.value as StaffSort })}
                aria-label="Sort by"
                className="cursor-pointer rounded-lg border border-[#d4d7e8] bg-[#f8f7fc] px-3 py-1.5 text-xs font-semibold text-[#0b1a62] transition-colors focus:border-[#39418f] focus:ring-2 focus:ring-[#39418f] focus:outline-none"
              >
                {(Object.keys(SORT_LABELS) as StaffSort[]).map((key) => (
                  <option key={key} value={key}>
                    {SORT_LABELS[key]}
                  </option>
                ))}
              </select>

              <div
                className="flex overflow-hidden rounded-lg border border-[#d4d7e8]"
                role="group"
                aria-label="View mode"
              >
                {(
                  [
                    ["grid", "Grid view", LayoutGrid],
                    ["list", "List view", List],
                  ] as const
                ).map(([key, label, Icon], i) => (
                  <button
                    key={key}
                    type="button"
                    aria-label={label}
                    aria-pressed={view === key}
                    onClick={() => update({ view: key })}
                    className={cn(
                      "cursor-pointer p-1.5 transition-colors",
                      i > 0 && "border-l border-[#d4d7e8]",
                      view === key
                        ? "bg-[#39418f] text-white"
                        : "bg-white text-[#5a5f7e] hover:bg-[#edeef6]",
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </button>
                ))}
              </div>

              <div ref={exportRef} className="relative">
                <button
                  type="button"
                  onClick={() => setExportOpen((open) => !open)}
                  aria-label="Export options"
                  aria-haspopup="menu"
                  aria-expanded={exportOpen}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#d4d7e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#0b1a62] transition-colors hover:bg-[#edeef6] focus-visible:ring-2 focus-visible:ring-[#39418f] focus-visible:outline-none"
                >
                  <Download className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Export</span>
                </button>
                {exportOpen && (
                  <div
                    role="menu"
                    className="absolute top-full right-0 z-50 mt-2 w-44 overflow-hidden rounded-lg border border-[#d4d7e8] bg-white shadow-lg"
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportOpen(false);
                        downloadCsv(
                          `${slug}-staff.csv`,
                          [...leaders, ...visible],
                          window.location.origin,
                        );
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-sm text-[#0b1a62] transition-colors hover:bg-[#edeef6]"
                    >
                      <FileText className="size-4" aria-hidden="true" />
                      Export CSV
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setExportOpen(false);
                        window.print();
                      }}
                      className="flex w-full cursor-pointer items-center gap-2 border-t border-[#d4d7e8] px-4 py-2.5 text-sm text-[#0b1a62] transition-colors hover:bg-[#edeef6]"
                    >
                      <Printer className="size-4" aria-hidden="true" />
                      Print
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={copyShareLink}
                aria-label="Copy share link"
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#d4d7e8] bg-white px-3 py-1.5 text-xs font-semibold text-[#0b1a62] transition-colors hover:bg-[#edeef6] focus-visible:ring-2 focus-visible:ring-[#39418f] focus-visible:outline-none"
              >
                {copied ? (
                  <Check className="size-4 text-[#39418f]" aria-hidden="true" />
                ) : (
                  <Share2 className="size-4" aria-hidden="true" />
                )}
                <span className="hidden sm:inline">{copied ? "Copied!" : "Share"}</span>
              </button>
            </div>
          </div>

          <div
            className="flex flex-wrap items-center gap-2 border-t border-[#d4d7e8] py-2"
            aria-label="Active filters"
          >
            <span className="text-xs font-semibold tracking-wider text-[#8a8fa8] uppercase">
              Filters:
            </span>
            {activeChips.map((chip) => (
              <span
                key={chip}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#eef0f8] px-3 py-1 text-xs font-medium text-[#5a5f7e]"
              >
                {chip}
              </span>
            ))}
            <button
              type="button"
              onClick={clearFilters}
              className="cursor-pointer text-xs font-semibold text-[#39418f] underline underline-offset-2 hover:text-[#2d3470] focus-visible:ring-2 focus-visible:ring-[#39418f] focus-visible:outline-none"
            >
              Clear all
            </button>
          </div>
        </div>
      </nav>

      <section id="department-staff">
        {(showLeadership || relatedUnits.length > 0) && (
          <section className="mb-8">
            {showLeadership && (
              <div className="bg-gradient-to-b from-[#edeef6] to-white px-4 py-10 sm:px-6 md:py-12 lg:px-8">
                <div className="mx-auto max-w-7xl">
                  <div className="mb-6 flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#39418f] to-[var(--primary)] shadow-lg">
                      <Users className="h-6 w-6 text-white" aria-hidden="true" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#0b1a62] md:text-3xl">Leadership</h2>
                      <p className="text-sm text-[#5a5f7e]">
                        {leaders.length} {leaders.length === 1 ? "Leader" : "Leaders"}
                      </p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {leaders.map((leader, i) => (
                      <LeaderCard key={leader.slug ?? `${leader.name}-${i}`} leader={leader} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {relatedUnits.length > 0 && (
              <div className="bg-white px-4 py-10 sm:px-6 md:py-12 lg:px-8 print:hidden">
                <div className="mx-auto max-w-7xl">
                  <button
                    type="button"
                    onClick={() => setRelatedOpen((open) => !open)}
                    aria-expanded={relatedOpen}
                    aria-controls="related-units"
                    className="group mb-5 flex w-full cursor-pointer items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#39418f] to-[var(--primary)] shadow-md transition-shadow group-hover:shadow-lg">
                        <Building2 className="h-5 w-5 text-white" aria-hidden="true" />
                      </div>
                      <div className="text-left">
                        <h2 className="text-xl font-black text-[#0b1a62] transition-colors group-hover:text-[#39418f] md:text-2xl">
                          Related Departments
                        </h2>
                        <p className="text-xs text-[#5a5f7e]">
                          {relatedUnits.length} {relatedUnits.length === 1 ? "Unit" : "Units"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-[#5a5f7e]">
                        {relatedOpen ? "Hide" : "Show"}
                      </span>
                      <ChevronDown
                        className={cn(
                          "h-6 w-6 text-[#5a5f7e] transition-transform duration-300",
                          relatedOpen && "rotate-180",
                        )}
                        aria-hidden="true"
                      />
                    </div>
                  </button>
                  <div
                    id="related-units"
                    hidden={!relatedOpen}
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
                  >
                    {relatedUnits.map((unit) => (
                      <Link
                        key={unit.slug}
                        to="/directory/d/$slug"
                        params={{ slug: unit.slug }}
                        className="group relative overflow-hidden rounded-xl border border-[#d4d7e8] bg-white transition-all duration-300 hover:border-[#39418f] hover:shadow-lg"
                      >
                        <div className="absolute top-0 right-0 -mt-12 -mr-12 h-24 w-24 rounded-full bg-[#39418f]/5 transition-transform duration-500 group-hover:scale-150" />
                        <div className="relative p-4">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-[#39418f] to-[var(--primary)] shadow-md transition-transform group-hover:scale-110">
                              <Building2 className="h-6 w-6 text-white" aria-hidden="true" />
                            </div>
                            <ChevronRight
                              className="ml-auto h-5 w-5 text-[#b6b9d1] transition-all group-hover:translate-x-1 group-hover:text-[#39418f]"
                              aria-hidden="true"
                            />
                          </div>
                          <h3 className="line-clamp-2 text-sm font-bold text-[#0b1a62] transition-colors group-hover:text-[#39418f]">
                            {unit.name}
                          </h3>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}

        <section className="bg-[#edeef6] py-10 md:py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {visible.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#d4d7e8] bg-white px-6 py-14 text-center">
                <p className="text-base font-semibold text-[#0b1a62]">
                  {query || quick || filter !== "all"
                    ? "No staff match your filters"
                    : "No staff listed yet"}
                </p>
                <p className="mt-1 text-sm text-[#5a5f7e]">
                  {query || quick || filter !== "all"
                    ? "Try a different search, or clear the filters."
                    : "Staff profiles linked to this unit in the directory will appear here."}
                </p>
                {(query || quick || filter !== "all") && (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 cursor-pointer rounded-lg bg-[#39418f] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#2d3470]"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-14">
                {staffGroups.map((group) => (
                  <StaffGroup
                    key={group.key}
                    group={group}
                    view={view}
                    showDepartment={searchingDirectory}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </section>
    </div>
  );
}
