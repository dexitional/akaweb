import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronRight,
  Globe,
  Home,
  LayoutGrid,
  List,
  Search,
  Share2,
  Users,
} from "lucide-react";

import type { DirectoryUnit, UnitCategory } from "#/lib/directory-types";
import { cn } from "#/lib/utils";
import { UnitCategoryIcon } from "../shared/unitCategoryIcons";

export type UnitFilter = "all" | "with_website" | "with_contact" | "large" | "medium" | "small";
export type UnitSort = "name" | "initials" | "staff_count";
export type UnitView = "grid" | "list";
export type UnitScope = "page" | "global";

export interface UnitListState {
  q: string;
  filter: UnitFilter;
  sort: UnitSort;
  view: UnitView;
  scope: UnitScope;
}

interface UnitListPageProps {
  category: UnitCategory;
  categories: UnitCategory[];
  units: DirectoryUnit[]; // every unit, so "Directory" scope can search across categories
  initialState: UnitListState;
}

const FILTERS: { key: UnitFilter; label: string; test: (unit: DirectoryUnit) => boolean }[] = [
  { key: "all", label: "All", test: () => true },
  { key: "with_website", label: "With Website", test: (u) => Boolean(u.websiteUrl) },
  { key: "with_contact", label: "With Contact", test: (u) => Boolean(u.email || u.phone) },
  { key: "large", label: "Large (10+ Staff)", test: (u) => u.staffCount >= 10 },
  {
    key: "medium",
    label: "Medium (5-9 Staff)",
    test: (u) => u.staffCount >= 5 && u.staffCount <= 9,
  },
  { key: "small", label: "Small (< 5 Staff)", test: (u) => u.staffCount < 5 },
];

const SORTS: { key: UnitSort; label: string }[] = [
  { key: "name", label: "Name" },
  { key: "initials", label: "Initials" },
  { key: "staff_count", label: "Staff" },
];

const COMPARATORS: Record<UnitSort, (a: DirectoryUnit, b: DirectoryUnit) => number> = {
  name: (a, b) => a.name.localeCompare(b.name),
  // Units without a code sort after those with one.
  initials: (a, b) => (a.code ?? "￿").localeCompare(b.code ?? "￿") || a.name.localeCompare(b.name),
  staff_count: (a, b) => b.staffCount - a.staffCount || a.name.localeCompare(b.name),
};

function unitHref(slug: string) {
  return `/directory/d/${slug}`;
}

function matchesSearch(unit: DirectoryUnit, query: string) {
  if (!query) return true;
  const haystack = [unit.name, unit.code, unit.websiteUrl].filter(Boolean).join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function ShareButton({ unit }: { unit: DirectoryUnit }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = `${window.location.origin}${unitHref(unit.slug)}`;
    try {
      const nav: Partial<Navigator> = navigator;
      if (nav.share) {
        await nav.share({ title: unit.name, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Share sheet dismissed or clipboard blocked — nothing to report.
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      aria-label={`Share ${unit.name}`}
      className="focus-ring inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200"
    >
      {copied ? (
        <Check className="h-4 w-4" aria-hidden="true" />
      ) : (
        <Share2 className="h-4 w-4" aria-hidden="true" />
      )}
      {copied ? "Link copied" : "Share"}
    </button>
  );
}

function UnitActions({ unit }: { unit: DirectoryUnit }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        to="/directory/d/$slug"
        params={{ slug: unit.slug }}
        className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--primary-dark)]"
      >
        <Users className="h-4 w-4" aria-hidden="true" />
        View Staff
      </Link>
      {unit.websiteUrl && (
        <a
          href={unit.websiteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="focus-ring inline-flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 transition-colors hover:bg-gray-200"
        >
          <Globe className="h-4 w-4" aria-hidden="true" />
          Website
        </a>
      )}
      <ShareButton unit={unit} />
    </div>
  );
}

function UnitMeta({ unit, showCategory }: { unit: DirectoryUnit; showCategory: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      {unit.code && (
        <span className="inline-flex items-center rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-[#39418F]">
          {unit.code}
        </span>
      )}
      {showCategory && unit.categoryName && (
        <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
          {unit.categoryName}
        </span>
      )}
      <span className="text-xs text-gray-500">
        {unit.staffCount} {unit.staffCount === 1 ? "staff member" : "staff"}
      </span>
    </div>
  );
}

export function UnitListPage({ category, categories, units, initialState }: UnitListPageProps) {
  const [state, setState] = useState<UnitListState>(initialState);
  const { q, filter, sort, view, scope } = state;
  const searchingDirectory = scope === "global" && q.trim() !== "";

  // Mirror state into the URL (replace, not push — typing shouldn't flood history).
  useEffect(() => {
    const params = new URLSearchParams({ q, filter, sort, view, scope });
    const next = `${window.location.pathname}?${params.toString()}`;
    if (next !== `${window.location.pathname}${window.location.search}`) {
      window.history.replaceState(window.history.state, "", next);
    }
  }, [q, filter, sort, view, scope]);

  function update(patch: Partial<UnitListState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  const categoryUnits = useMemo(
    () => units.filter((unit) => unit.categorySlug === category.slug),
    [units, category.slug],
  );

  // Search pool: this category, or — with "Directory" scope and a query — every unit.
  const searched = useMemo(
    () =>
      (searchingDirectory ? units : categoryUnits).filter((unit) => matchesSearch(unit, q.trim())),
    [searchingDirectory, units, categoryUnits, q],
  );

  const filterCounts = useMemo(
    () =>
      Object.fromEntries(FILTERS.map((f) => [f.key, searched.filter(f.test).length])) as Record<
        UnitFilter,
        number
      >,
    [searched],
  );

  const visible = useMemo(() => {
    const test = FILTERS.find((f) => f.key === filter)?.test ?? (() => true);
    return searched.filter(test).sort(COMPARATORS[sort]);
  }, [searched, filter, sort]);

  const stats = [
    { label: `Total ${category.pluralName}`, value: categoryUnits.length },
    { label: "Total Staff", value: categoryUnits.reduce((sum, unit) => sum + unit.staffCount, 0) },
    { label: "With Websites", value: categoryUnits.filter((unit) => unit.websiteUrl).length },
    {
      label: "With Contact Info",
      value: categoryUnits.filter((unit) => unit.email || unit.phone).length,
    },
  ];
  const noun = (searchingDirectory ? "units" : category.pluralName).toLowerCase();
  const shownNoun =
    visible.length === 1 ? (searchingDirectory ? "unit" : category.name).toLowerCase() : noun;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="border-b border-indigo-100/50 bg-indigo-50/60">
        <ol className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-4 py-3 text-sm md:px-8">
          <li>
            <Link
              to="/"
              className="flex items-center gap-1.5 text-gray-500 transition hover:text-gray-700"
            >
              <Home className="h-3.5 w-3.5" aria-hidden="true" />
              Home
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            <Link to="/directory" className="text-gray-500 transition hover:text-gray-700">
              Directory
            </Link>
          </li>
          <li className="flex items-center gap-2">
            <ChevronRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
            <span aria-current="page" className="font-medium text-gray-900">
              {category.pluralName}
            </span>
          </li>
        </ol>
      </nav>

      {/* Hero */}
      <section className="bg-[var(--primary)] py-14 text-center sm:py-20">
        <div className="mx-auto max-w-3xl px-4">
          <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white">
            <UnitCategoryIcon name={category.icon} className="h-4 w-4" aria-hidden="true" />
            College Directory
          </span>
          <h1 className="mb-5 text-4xl font-black tracking-tight text-white sm:text-5xl md:text-6xl">
            {category.pluralName}
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-lg leading-relaxed text-white/70">
            Browse through our {category.pluralName.toLowerCase()} and discover the diverse academic
            and administrative units that make up our college.
          </p>

          <div className="mb-8 flex flex-wrap justify-center gap-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="min-w-[110px] rounded-xl border border-white/15 bg-white/10 px-6 py-3"
              >
                <div className="text-2xl font-bold text-white">{stat.value}</div>
                <div className="text-sm text-white/70">{stat.label}</div>
              </div>
            ))}
          </div>

          <div className="relative mx-auto max-w-2xl">
            <Search
              className="pointer-events-none absolute top-1/2 left-5 h-5 w-5 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              type="search"
              value={q}
              onChange={(event) => update({ q: event.target.value })}
              placeholder="Search by name, initials, or website..."
              aria-label={`Search ${category.pluralName.toLowerCase()} by name, initials, or website`}
              className="w-full rounded-xl bg-white py-4 pr-6 pl-14 text-base text-gray-900 shadow-xl outline-none placeholder:text-gray-500 focus:ring-2 focus:ring-indigo-300"
            />
          </div>
          <div className="mt-4 flex items-center justify-center gap-3">
            <span className="text-sm text-white/70">Search in:</span>
            <div className="inline-flex rounded-lg border border-white/20 bg-white/10 p-1">
              {(
                [
                  ["page", "This Page"],
                  ["global", "Directory"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  aria-pressed={scope === key}
                  onClick={() => update({ scope: key })}
                  className={cn(
                    "focus-ring cursor-pointer rounded-md px-4 py-2 text-sm font-semibold transition-all",
                    scope === key
                      ? "bg-white text-[var(--primary)] shadow-sm"
                      : "text-white hover:bg-white/10",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Toolbar — sticks just below the 80px sticky site header */}
      <div className="sticky top-20 z-30 border-b border-gray-200 bg-white/95 shadow-sm backdrop-blur">
        <div className="mx-auto max-w-7xl space-y-4 px-4 py-5 md:px-8">
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((f) => {
              const active = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={active}
                  onClick={() => update({ filter: f.key })}
                  className={cn(
                    "focus-ring inline-flex cursor-pointer items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all",
                    active
                      ? "bg-[var(--primary)] text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {f.key === "all"
                    ? `All ${searchingDirectory ? "Units" : category.pluralName}`
                    : f.label}
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      active ? "bg-white/20 text-white" : "bg-gray-200 text-gray-600",
                    )}
                  >
                    {filterCounts[f.key]}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="mr-2 text-sm text-gray-600">Sort by:</span>
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  aria-pressed={sort === s.key}
                  onClick={() => update({ sort: s.key })}
                  className={cn(
                    "focus-ring cursor-pointer rounded-lg px-3 py-2 text-sm font-semibold transition-all",
                    sort === s.key
                      ? "bg-[var(--primary)] text-white shadow-md"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200",
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <p className="text-sm text-gray-600" aria-live="polite">
                Showing <span className="font-bold text-gray-900">{visible.length}</span>{" "}
                {shownNoun}
              </p>
              <button
                type="button"
                onClick={() => update({ view: view === "grid" ? "list" : "grid" })}
                aria-label={view === "grid" ? "Switch to list view" : "Switch to grid view"}
                className="focus-ring cursor-pointer rounded-lg bg-gray-100 p-2 text-gray-700 transition-all hover:bg-gray-200"
              >
                {view === "grid" ? (
                  <List className="h-5 w-5" aria-hidden="true" />
                ) : (
                  <LayoutGrid className="h-5 w-5" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="mx-auto max-w-7xl px-4 py-12 md:px-8">
        {visible.length === 0 ? (
          <div className="rounded-2xl bg-white p-12 text-center shadow-sm ring-1 ring-gray-200">
            <p className="text-lg font-semibold text-gray-900">
              No {noun} {q.trim() ? `match “${q.trim()}”` : "to show yet"}
            </p>
            <p className="mt-1 text-sm text-gray-500">
              {q.trim() || filter !== "all"
                ? "Try a different search or filter."
                : `${category.pluralName} added in the directory will appear here.`}
            </p>
            {(q.trim() || filter !== "all") && (
              <button
                type="button"
                onClick={() => update({ q: "", filter: "all" })}
                className="focus-ring mt-4 cursor-pointer rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-white"
              >
                Clear search &amp; filters
              </button>
            )}
          </div>
        ) : view === "grid" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((unit) => (
              <article
                key={unit.slug}
                className="group rounded-lg bg-white p-6 shadow-md ring-1 ring-gray-200 transition-all duration-200 hover:-translate-y-1 hover:shadow-lg"
              >
                <h2 className="mb-3 line-clamp-2 min-h-[3rem] text-base font-bold text-gray-900 transition-colors group-hover:text-[#39418F]">
                  {unit.name}
                </h2>
                <div className="mb-4">
                  <UnitMeta unit={unit} showCategory={searchingDirectory} />
                </div>
                <UnitActions unit={unit} />
              </article>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-200 overflow-hidden rounded-lg bg-white shadow-md ring-1 ring-gray-200">
            {visible.map((unit) => (
              <article
                key={unit.slug}
                className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <h2 className="mb-1.5 text-base font-bold text-gray-900">{unit.name}</h2>
                  <UnitMeta unit={unit} showCategory={searchingDirectory} />
                </div>
                <UnitActions unit={unit} />
              </article>
            ))}
          </div>
        )}

        {/* Browse other categories */}
        <section className="mt-20 rounded-2xl bg-white p-8 shadow-lg ring-1 ring-gray-200 md:p-12">
          <div className="mb-8 text-center">
            <h2 className="mb-2 text-3xl font-bold text-gray-900">Browse Other Categories</h2>
            <p className="text-gray-600">
              Explore different types of departments and units across the college
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {categories.map((other) => {
              const current = other.slug === category.slug;
              return (
                <Link
                  key={other.slug}
                  to="/directory/d/list/$category"
                  params={{ category: other.slug }}
                  aria-current={current ? "page" : undefined}
                  className={cn(
                    "focus-ring group relative rounded-xl p-6 text-center transition-all duration-200 hover:-translate-y-1 hover:shadow-xl",
                    current
                      ? "bg-[var(--primary)] text-white shadow-lg"
                      : "bg-gray-100 ring-1 ring-gray-200",
                  )}
                >
                  {current && (
                    <Check
                      className="absolute top-2 right-2 h-5 w-5 text-white"
                      aria-hidden="true"
                    />
                  )}
                  <UnitCategoryIcon
                    name={other.icon}
                    className={cn(
                      "mx-auto mb-3 h-9 w-9",
                      current ? "text-white" : "text-[#39418F]",
                    )}
                    aria-hidden="true"
                  />
                  <span
                    className={cn(
                      "block text-sm font-bold",
                      current ? "text-white" : "text-gray-900 group-hover:text-[#39418F]",
                    )}
                  >
                    {other.pluralName}
                  </span>
                  <span
                    className={cn("block text-xs", current ? "text-white/70" : "text-gray-500")}
                  >
                    {other.unitCount} {other.unitCount === 1 ? "unit" : "units"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
