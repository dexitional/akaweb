import type { FormEvent } from "react";
import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  BarChart,
  Building2,
  Calendar,
  CalendarDays,
  ChevronRight,
  Home,
  RefreshCw,
  Search,
  TrendingUp,
  Users,
  X,
  Zap,
} from "lucide-react";

import { cn } from "#/lib/utils";
import type { RankedProfileFull, ViewPeriod } from "#/lib/directory-types";
import { PersonPhoto } from "../shared/StaffBits";

type Period = ViewPeriod;

const periodOptions: { value: Period; label: string; icon: typeof Calendar }[] = [
  { value: "today", label: "Today", icon: Calendar },
  { value: "week", label: "Week", icon: CalendarDays },
  { value: "month", label: "Month", icon: BarChart },
  { value: "year", label: "Year", icon: RefreshCw },
];

const sortOptions = ["Most Visited", "Name A-Z", "Recently Added"];

const PERIOD_PHRASES: Record<Period, string> = {
  today: "today",
  week: "this week",
  month: "this month",
  year: "this year",
};

function MostVisitedProfilesBreadcrumb() {
  return (
    <div className="border-b border-indigo-100/50 bg-indigo-50/60">
      <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 text-sm md:px-8">
        <Link
          to="/"
          className="flex items-center gap-1.5 text-gray-500 transition hover:text-gray-700"
        >
          <Home className="h-3.5 w-3.5" aria-hidden="true" />
          Home
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
        <Link to="/directory" className="text-gray-500 transition hover:text-gray-700">
          Directory
        </Link>
        <ChevronRight className="h-3.5 w-3.5 text-gray-400" aria-hidden="true" />
        <span className="font-medium text-gray-900">Most Visited Profiles</span>
      </div>
    </div>
  );
}

const RANK_BADGE_STYLES: Record<number, string> = {
  1: "bg-amber-400",
  2: "bg-gray-400",
  3: "bg-orange-400",
};

function RankedProfileCardFull({ profile }: { profile: RankedProfileFull }) {
  const isTopThree = profile.rank <= 3;

  return (
    <Link
      to="/directory/p/$slug"
      params={{ slug: profile.slug }}
      className="relative block rounded-2xl border border-gray-100 bg-white p-5 text-center transition-shadow hover:shadow-md"
    >
      {isTopThree ? (
        <span
          className={cn(
            "absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white text-xs font-bold text-white shadow",
            RANK_BADGE_STYLES[profile.rank],
          )}
        >
          <Zap className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
      ) : (
        <span className="absolute -top-2 -right-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-white bg-gray-100 text-xs font-bold text-gray-600 shadow">
          #{profile.rank}
        </span>
      )}

      <div className="relative mx-auto inline-block">
        <PersonPhoto
          person={profile}
          sizes="64px"
          className="size-16 rounded-full ring-2 ring-indigo-200"
        />
      </div>

      <p className="mt-3 font-bold text-gray-900">{profile.name}</p>
      <p className="text-sm text-gray-500">{profile.title}</p>
      <p className="mt-1 text-xs font-semibold text-[#39418f] tabular-nums">
        {profile.views.toLocaleString()} {profile.views === 1 ? "view" : "views"}
      </p>
      {profile.deptCode && (
        <span className="mt-2 inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
          <Building2 className="h-2.5 w-2.5" aria-hidden="true" />
          {profile.deptCode}
        </span>
      )}
    </Link>
  );
}

export function MostVisitedProfilesPage({
  profiles,
  departments,
  period,
}: {
  profiles: RankedProfileFull[];
  departments: { slug: string; name: string }[];
  period: Period;
}) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [department, setDepartment] = useState("");
  const [sort, setSort] = useState(sortOptions[0]);
  const [searchScope, setSearchScope] = useState<"page" | "directory">("page");

  const visibleProfiles = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    return profiles
      .filter((profile) => !department || profile.departmentSlug === department)
      .filter((profile) => {
        if (!trimmed || searchScope === "directory") return true;
        return [profile.name, profile.title, profile.deptCode, profile.department]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(trimmed);
      })
      .sort((a, b) => {
        if (sort === "Name A-Z") return a.name.localeCompare(b.name);
        if (sort === "Recently Added") return b.createdAt.localeCompare(a.createdAt);
        return a.rank - b.rank;
      });
  }, [profiles, department, query, searchScope, sort]);

  function setPeriod(next: Period) {
    void navigate({
      to: "/directory/most-visited-profiles",
      search: { period: next },
      replace: true,
    });
  }

  function onSearch(event: FormEvent) {
    event.preventDefault();
    if (searchScope === "directory" && query.trim()) {
      void navigate({ to: "/directory/search", search: { q: query.trim() } });
    }
  }

  return (
    <div>
      <MostVisitedProfilesBreadcrumb />

      <section className="bg-[var(--primary)] py-14 text-center">
        <div className="mx-auto max-w-3xl px-4">
          <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white">
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            Trending Profiles
          </span>

          <h1 className="mb-4 text-4xl font-extrabold text-white md:text-5xl">
            Most Visited Profiles
          </h1>

          <p className="mb-4 text-white/70">
            Discover the most popular faculty and staff profiles {PERIOD_PHRASES[period]}. These
            profiles have received the highest number of views from our community.
          </p>

          <p className="mb-6 inline-flex w-full items-center justify-center gap-2 text-sm text-white/80">
            <Users className="h-4 w-4" aria-hidden="true" />
            <span>
              <span className="font-bold tabular-nums">{visibleProfiles.length}</span>{" "}
              {visibleProfiles.length === 1 ? "profile" : "profiles"} found
            </span>
          </p>

          <div className="inline-flex gap-1 rounded-full bg-white/10 p-1">
            {periodOptions.map((option) => {
              const Icon = option.icon;
              const isActive = period === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPeriod(option.value)}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold transition",
                    isActive ? "bg-white text-[var(--primary)]" : "text-white/70 hover:text-white",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-6 mb-4 max-w-5xl rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row">
          <form onSubmit={onSearch} role="search" className="relative flex-1">
            <label htmlFor="most-visited-search" className="sr-only">
              Search profiles
            </label>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400"
              aria-hidden="true"
            />
            <input
              id="most-visited-search"
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or designation..."
              className="w-full rounded-lg border border-gray-200 py-2.5 pr-9 pl-9 text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[var(--primary)]/20 focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                aria-label="Clear search"
                className="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </form>

          <select
            value={department}
            onChange={(event) => setDepartment(event.target.value)}
            aria-label="Filter by department"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm md:w-auto md:max-w-60"
          >
            <option value="">All Departments</option>
            {departments.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </select>

          <select
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            aria-label="Sort profiles"
            className="rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm md:w-auto"
          >
            {sortOptions.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-4 flex items-center justify-center gap-3 text-sm">
          <span className="text-gray-500">Search in:</span>
          <div className="inline-flex gap-1 rounded-full bg-gray-100 p-1">
            <button
              type="button"
              onClick={() => setSearchScope("page")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                searchScope === "page"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              This Page
            </button>
            <button
              type="button"
              onClick={() => setSearchScope("directory")}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold transition",
                searchScope === "directory"
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-700",
              )}
            >
              Directory
            </button>
          </div>
        </div>
      </div>

      {visibleProfiles.length === 0 ? (
        <p className="mx-auto max-w-7xl px-4 pb-16 text-center text-sm text-gray-500">
          {query.trim() ? (
            <>No profiles match &ldquo;{query.trim()}&rdquo;.</>
          ) : (
            "No profile views recorded for this period yet."
          )}
        </p>
      ) : (
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 pb-16 sm:grid-cols-2 lg:grid-cols-4">
          {visibleProfiles.map((profile) => (
            <RankedProfileCardFull key={profile.slug} profile={profile} />
          ))}
        </div>
      )}
    </div>
  );
}
