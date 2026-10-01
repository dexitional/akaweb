import { Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { Building2, ChevronRight, SlidersHorizontal } from "lucide-react";

import { rememberSearch, useSearchHistory } from "#/hooks/useSearchHistory";
import type { DirectorySearchResults, UnitPerson } from "#/lib/directory-types";
import { cn } from "#/lib/utils";
import { FavouriteButton, PersonPhoto } from "../shared/StaffBits";
import { UnitCategoryIcon } from "../shared/unitCategoryIcons";

export type ResultType = "all" | "people" | "units" | "categories" | "expertise";
export type ResultView = "grid" | "list" | "compact";
export type PeopleTypeFilter = "" | "teaching" | "non-teaching";

export interface SearchResultsState {
  type: ResultType;
  view: ResultView;
  staff: PeopleTypeFilter;
  dept: string; // department slug, "" = any
}

interface SearchResultsProps {
  query: string; // "" when browsing A–Z
  initial?: string;
  results: DirectorySearchResults;
  initialState: SearchResultsState;
  organization: string;
}

// How many people the blended ("all") view shows before "View all".
const BLENDED_PEOPLE = 4;

/** Wraps the parts of `text` that match a search word's prefix in <mark>. */
function Highlight({ text, words }: { text: string; words: string[] }) {
  if (words.length === 0) return <>{text}</>;
  const escaped = words.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const pattern = new RegExp(`(^|[^\\p{L}\\p{N}])(${escaped.join("|")})`, "giu");
  const parts: ReactNode[] = [];
  let last = 0;
  for (const match of text.matchAll(pattern)) {
    const [, lead = "", hit = ""] = match;
    const start = match.index + lead.length;
    parts.push(text.slice(last, start), <mark key={start}>{hit}</mark>);
    last = start + hit.length;
  }
  parts.push(text.slice(last));
  return <>{parts}</>;
}

function PersonGridCard({ person, words }: { person: UnitPerson; words: string[] }) {
  return (
    <div className="relative">
      <FavouriteButton slug={person.slug} name={person.name} />
      <Link
        to="/directory/p/$slug"
        params={{ slug: person.slug ?? "" }}
        className="surface dhr-hover-accent focus-ring group block h-full p-5 text-center"
      >
        <PersonPhoto person={person} sizes="64px" className="mx-auto h-16 w-16 rounded-full" />
        <h4 className="heading mt-3 text-sm leading-snug group-hover:underline">
          <Highlight text={person.name} words={words} />
        </h4>
        {person.title && <p className="t-muted mt-1 text-xs">{person.title}</p>}
        {person.department && (
          <p className="t-muted mt-0.5 truncate text-xs">{person.department}</p>
        )}
      </Link>
    </div>
  );
}

function PersonListCard({ person, words }: { person: UnitPerson; words: string[] }) {
  return (
    <div className="relative">
      <FavouriteButton slug={person.slug} name={person.name} />
      <Link
        to="/directory/p/$slug"
        params={{ slug: person.slug ?? "" }}
        className="surface dhr-hover-accent focus-ring group flex items-center gap-4 p-4 pr-14"
      >
        <PersonPhoto person={person} sizes="56px" className="h-14 w-14 shrink-0 rounded-full" />
        <span className="min-w-0 flex-1">
          <span className="heading block truncate text-sm group-hover:underline">
            <Highlight text={person.name} words={words} />
          </span>
          <span className="t-muted block truncate text-xs">
            {[person.title, person.department].filter(Boolean).join(" · ")}
          </span>
        </span>
        <ChevronRight
          className="size-4 shrink-0 text-[#b6b9d1] group-hover:text-[#39418f]"
          aria-hidden="true"
        />
      </Link>
    </div>
  );
}

function PersonCompactRow({ person, words }: { person: UnitPerson; words: string[] }) {
  return (
    <li>
      <Link
        to="/directory/p/$slug"
        params={{ slug: person.slug ?? "" }}
        className="dhr-row focus-ring flex items-baseline gap-3 px-3 py-2 text-sm"
      >
        <span className="heading min-w-0 truncate">
          <Highlight text={person.name} words={words} />
        </span>
        <span className="t-muted min-w-0 flex-1 truncate text-xs">
          {[person.title, person.department].filter(Boolean).join(" · ")}
        </span>
      </Link>
    </li>
  );
}

export function SearchResults({
  query,
  initial,
  results,
  initialState,
  organization,
}: SearchResultsProps) {
  const { saveSearch } = useSearchHistory();
  const [state, setState] = useState<SearchResultsState>(initialState);
  const [showPeopleFilters, setShowPeopleFilters] = useState(
    Boolean(initialState.staff || initialState.dept),
  );
  const [saveName, setSaveName] = useState("");
  const [savedFlash, setSavedFlash] = useState(false);
  const { type, view, staff, dept } = state;
  const words = useMemo(
    () =>
      query
        .toLowerCase()
        .split(/[^\p{L}\p{N}'-]+/u)
        .filter(Boolean),
    [query],
  );

  // Arriving here (e.g. from an expertise chip) counts as a search.
  useEffect(() => {
    if (query) rememberSearch(query);
  }, [query]);

  // Keep filters in the URL alongside q / initial (without re-running the loader).
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const set = (key: string, value: string, fallback: string) =>
      value === fallback ? params.delete(key) : params.set(key, value);
    set("type", type, "all");
    set("view", view, "grid");
    set("staff", staff, "");
    set("dept", dept, "");
    const next = `${window.location.pathname}?${params.toString()}`;
    if (next !== `${window.location.pathname}${window.location.search}`)
      window.history.replaceState(window.history.state, "", next);
  }, [type, view, staff, dept]);

  function update(patch: Partial<SearchResultsState>) {
    setState((prev) => ({ ...prev, ...patch }));
  }

  const departments = useMemo(() => {
    const counts = new Map<string, { slug: string; name: string; count: number }>();
    for (const person of results.people) {
      if (!person.departmentSlug || !person.department) continue;
      const entry = counts.get(person.departmentSlug) ?? {
        slug: person.departmentSlug,
        name: person.department,
        count: 0,
      };
      entry.count += 1;
      counts.set(person.departmentSlug, entry);
    }
    return [...counts.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [results.people]);

  const people = useMemo(
    () =>
      results.people.filter(
        (p) => (!staff || p.staffType === staff) && (!dept || p.departmentSlug === dept),
      ),
    [results.people, staff, dept],
  );

  // Only feature someone as the best match when their name actually matches.
  const top = results.people[0];
  const nameMatches = (name: string) =>
    words.some((word) =>
      name
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .some((part) => part.startsWith(word)),
    );
  const bestMatch =
    query && type === "all" && !staff && !dept && top && nameMatches(top.name) ? top : undefined;
  const listedPeople = bestMatch ? people.filter((p) => p.slug !== bestMatch.slug) : people;
  // The blended view previews a few people; an A–Z browse lists the whole letter.
  const blended = type === "all" && !initial;
  const shownPeople = blended ? listedPeople.slice(0, BLENDED_PEOPLE) : listedPeople;
  const typeCounts = {
    people: people.length,
    units: results.units.length,
    categories: results.categories.length,
    expertise: results.expertise.length,
  };
  const nothing =
    typeCounts.people + typeCounts.units + typeCounts.categories + typeCounts.expertise === 0;
  const staffCounts = {
    teaching: results.people.filter((p) => p.staffType === "teaching").length,
    "non-teaching": results.people.filter((p) => p.staffType === "non-teaching").length,
  };

  function onSave(event: FormEvent) {
    event.preventDefault();
    saveSearch(saveName || query, query);
    setSaveName("");
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 2000);
  }

  const peopleHeading = initial
    ? `People · surnames starting with ${initial}`
    : blended
      ? `People · showing ${shownPeople.length + (bestMatch ? 1 : 0)} of ${people.length}`
      : `People · ${people.length}`;

  return (
    <div data-dhr="blend-results" className="dhr-enter">
      {query && (
        <section className="band-alt border-t border-[#d4d7e8]" aria-label="Save this search">
          <div className="dhr-shell py-3">
            <form onSubmit={onSave} className="flex flex-wrap items-center gap-2 text-xs">
              <label className="t-muted" htmlFor="dhr-save-search-name">
                Save this search:
              </label>
              <input
                id="dhr-save-search-name"
                type="text"
                value={saveName}
                onChange={(event) => setSaveName(event.target.value)}
                maxLength={60}
                placeholder={query}
                className="focus-ring surface-2 rounded-full border border-[#d4d7e8] px-3 py-1 text-xs"
              />
              <button
                type="submit"
                className="dhr-recent focus-ring cursor-pointer rounded-full px-2.5 py-1 font-semibold"
              >
                {savedFlash ? "Saved ✓" : "Save"}
              </button>
            </form>
          </div>
        </section>
      )}

      {bestMatch && (
        <section className="band-feature" aria-label="Best match">
          <div className="dhr-shell py-8">
            <h2 className="zone-h eyebrow t-muted mb-3">Best match</h2>
            <article className="surface flex flex-col items-start gap-5 p-5 sm:flex-row sm:p-6">
              <PersonPhoto
                sizes="80px"
                person={bestMatch}
                className="h-20 w-20 shrink-0 rounded-full ring-4 ring-[#e4e6f5]"
              />
              <div className="min-w-0 flex-1">
                <Link
                  to="/directory/p/$slug"
                  params={{ slug: bestMatch.slug ?? "" }}
                  className="heading focus-ring text-xl leading-snug hover:underline"
                >
                  <Highlight text={bestMatch.name} words={words} />
                </Link>
                {bestMatch.title && <p className="mt-0.5 text-sm">{bestMatch.title}</p>}
                <p className="t-muted mt-1 text-xs">
                  {organization}
                  {bestMatch.department && (
                    <>
                      {" "}
                      <span aria-hidden="true">›</span>{" "}
                      {bestMatch.departmentSlug ? (
                        <Link
                          to="/directory/d/$slug"
                          params={{ slug: bestMatch.departmentSlug }}
                          className="hover:underline"
                        >
                          {bestMatch.department}
                        </Link>
                      ) : (
                        bestMatch.department
                      )}
                    </>
                  )}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                  {bestMatch.email && (
                    <a
                      href={`mailto:${bestMatch.email}`}
                      className="chip focus-ring rounded-full px-2.5 py-1 font-semibold"
                    >
                      ✉ {bestMatch.email}
                    </a>
                  )}
                  {bestMatch.slug && (
                    <Link
                      to="/directory/p/$slug"
                      params={{ slug: bestMatch.slug }}
                      className="focus-ring t-accent ml-auto font-semibold hover:underline"
                    >
                      Full profile <span aria-hidden="true">→</span>
                    </Link>
                  )}
                </div>
              </div>
            </article>
          </div>
        </section>
      )}

      <section className="band">
        <div className="dhr-shell py-6 lg:grid lg:grid-cols-[280px_1fr] lg:items-start lg:gap-10">
          <aside
            className="order-2 mt-10 space-y-6 lg:sticky lg:top-24 lg:order-1 lg:mt-0"
            aria-label="Refine results"
          >
            <section aria-label="Filter by result type">
              <h2 className="zone-h eyebrow t-muted mb-2">Type</h2>
              <ul className="text-sm">
                {(
                  [
                    ["people", "People"],
                    ["units", "Departments & units"],
                    ["categories", "Unit categories"],
                    ["expertise", "Expertise"],
                  ] as const
                )
                  .filter(([key]) => typeCounts[key] > 0 || type === key)
                  .map(([key, label]) => (
                    <li key={key}>
                      <button
                        type="button"
                        aria-pressed={type === key}
                        onClick={() => update({ type: type === key ? "all" : key })}
                        className={cn(
                          "reg-filter-row focus-ring -mx-2 flex w-full cursor-pointer items-center gap-2 px-2 py-1.5",
                          type === key && "font-semibold",
                        )}
                      >
                        <span className="flex-1 text-left">{label}</span>
                        <span className="num t-muted text-xs">{typeCounts[key]}</span>
                      </button>
                    </li>
                  ))}
              </ul>
            </section>

            {results.people.length > 0 && (
              <section aria-label="Refine people">
                <button
                  type="button"
                  onClick={() => setShowPeopleFilters((open) => !open)}
                  aria-expanded={showPeopleFilters}
                  className="reg-filter-row focus-ring -mx-2 flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 font-semibold"
                >
                  <SlidersHorizontal className="t-accent size-4 shrink-0" aria-hidden="true" />
                  <span className="flex-1 text-left">Filter people</span>
                  {(staff || dept) && (
                    <span className="num t-accent text-xs">
                      {Number(Boolean(staff)) + Number(Boolean(dept))}
                    </span>
                  )}
                  <span className="t-muted text-xs" aria-hidden="true">
                    {showPeopleFilters ? "▴" : "▾"}
                  </span>
                </button>
                {showPeopleFilters && (
                  <div className="mt-3 space-y-4 text-sm">
                    <div>
                      <h3 className="eyebrow t-muted mb-1">Staff</h3>
                      <ul>
                        {(
                          [
                            ["teaching", "Teaching"],
                            ["non-teaching", "Non-teaching"],
                          ] as const
                        ).map(([key, label]) => (
                          <li key={key}>
                            <button
                              type="button"
                              aria-pressed={staff === key}
                              onClick={() => update({ staff: staff === key ? "" : key })}
                              className="reg-filter-row focus-ring -mx-2 flex w-full cursor-pointer items-center gap-2 px-2 py-1.5"
                            >
                              <span className="flex-1 text-left">{label}</span>
                              <span className="num t-muted text-xs">{staffCounts[key]}</span>
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                    {departments.length > 0 && (
                      <div>
                        <h3 className="eyebrow t-muted mb-1">Department</h3>
                        <ul className="max-h-64 overflow-y-auto">
                          {departments.map((d) => (
                            <li key={d.slug}>
                              <button
                                type="button"
                                aria-pressed={dept === d.slug}
                                onClick={() => update({ dept: dept === d.slug ? "" : d.slug })}
                                className="reg-filter-row focus-ring -mx-2 flex w-full cursor-pointer items-center gap-2 px-2 py-1.5"
                              >
                                <span className="flex-1 truncate text-left">{d.name}</span>
                                <span className="num t-muted text-xs">{d.count}</span>
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {(staff || dept) && (
                      <button
                        type="button"
                        onClick={() => update({ staff: "", dept: "" })}
                        className="focus-ring t-accent cursor-pointer text-xs font-semibold hover:underline"
                      >
                        Clear people filters
                      </button>
                    )}
                  </div>
                )}
              </section>
            )}

            <p className="t-muted text-[11px]">
              Filters narrow the people results — departments and expertise stay put.
            </p>
          </aside>

          <div className="order-1 min-w-0 space-y-10 lg:order-2">
            {nothing ? (
              <div className="surface p-8 text-center">
                <p className="heading text-base">
                  {initial
                    ? `No one's surname starts with ${initial} yet`
                    : `No results for “${query}”`}
                </p>
                <p className="t-muted mt-1 text-sm">
                  {staff || dept
                    ? "Try clearing the people filters."
                    : "Check the spelling, or try a department or topic."}
                </p>
              </div>
            ) : (
              <>
                {(type === "all" || type === "people") && shownPeople.length > 0 && (
                  <section aria-label="People results">
                    <div className="mb-3 flex flex-wrap items-center gap-3">
                      <h2 className="zone-h eyebrow t-muted">{peopleHeading}</h2>
                      <span
                        className="t-muted ml-auto flex items-center gap-3 text-xs"
                        role="group"
                        aria-label="Density"
                      >
                        {(["list", "compact", "grid"] as const).map((key, i) => (
                          <span key={key}>
                            {i > 0 && (
                              <span aria-hidden="true" className="mx-0.5">
                                /
                              </span>
                            )}
                            <button
                              type="button"
                              aria-pressed={view === key}
                              onClick={() => update({ view: key })}
                              className={cn(
                                "focus-ring cursor-pointer capitalize",
                                view === key ? "t-accent font-semibold" : "hover:underline",
                              )}
                            >
                              {key}
                            </button>
                          </span>
                        ))}
                      </span>
                    </div>

                    {view === "grid" && (
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        {shownPeople.map((person) => (
                          <PersonGridCard
                            key={person.slug ?? person.name}
                            person={person}
                            words={words}
                          />
                        ))}
                      </div>
                    )}
                    {view === "list" && (
                      <div className="grid grid-cols-1 gap-3">
                        {shownPeople.map((person) => (
                          <PersonListCard
                            key={person.slug ?? person.name}
                            person={person}
                            words={words}
                          />
                        ))}
                      </div>
                    )}
                    {view === "compact" && (
                      <ul className="surface divide-y divide-[#d4d7e8] p-1">
                        {shownPeople.map((person) => (
                          <PersonCompactRow
                            key={person.slug ?? person.name}
                            person={person}
                            words={words}
                          />
                        ))}
                      </ul>
                    )}

                    {blended && listedPeople.length > shownPeople.length && (
                      <button
                        type="button"
                        onClick={() => update({ type: "people" })}
                        className="focus-ring t-accent mt-3 inline-flex cursor-pointer items-center gap-1 text-sm font-semibold hover:underline"
                      >
                        View all <span className="num">{people.length}</span> people{" "}
                        <span aria-hidden="true">→</span>
                      </button>
                    )}
                  </section>
                )}

                {(type === "all" || type === "units") && results.units.length > 0 && (
                  <section aria-label="Department and unit results">
                    <h2 className="zone-h eyebrow t-muted mb-3">
                      Departments &amp; units · {results.units.length}
                    </h2>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {results.units.map((unit) => (
                        <Link
                          key={unit.slug}
                          to="/directory/d/$slug"
                          params={{ slug: unit.slug }}
                          className="surface dhr-hover-accent focus-ring group flex items-center gap-3 p-4"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E4E6F5] text-[#39418F]">
                            <Building2 className="size-5" aria-hidden="true" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="heading block truncate text-sm group-hover:underline">
                              <Highlight text={unit.name} words={words} />
                            </span>
                            <span className="t-muted block truncate text-xs">
                              {[unit.code, unit.category].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                          <ChevronRight
                            className="size-4 shrink-0 text-[#b6b9d1] group-hover:text-[#39418f]"
                            aria-hidden="true"
                          />
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {(type === "all" || type === "categories") && results.categories.length > 0 && (
                  <section aria-label="Unit category results">
                    <h2 className="zone-h eyebrow t-muted mb-3">
                      Unit categories · {results.categories.length}
                    </h2>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {results.categories.map((category) => (
                        <Link
                          key={category.slug}
                          to="/directory/d/list/$category"
                          params={{ category: category.slug }}
                          className="surface dhr-hover-accent focus-ring group flex items-center gap-3 p-4"
                        >
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[#E4E6F5] text-[#39418F]">
                            <UnitCategoryIcon
                              name={category.icon}
                              className="size-5"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="min-w-0">
                            <span className="heading block truncate text-sm group-hover:underline">
                              <Highlight text={category.pluralName} words={words} />
                            </span>
                            <span className="t-muted block text-xs">
                              {category.unitCount} {category.unitCount === 1 ? "unit" : "units"}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}

                {(type === "all" || type === "expertise") && results.expertise.length > 0 && (
                  <section aria-label="Expertise results">
                    <h2 className="zone-h eyebrow t-muted mb-3">
                      Expertise · {results.expertise.length}
                    </h2>
                    <div className="flex flex-wrap gap-2">
                      {results.expertise.map((tag) => (
                        <Link
                          key={tag.label}
                          to="/directory/search"
                          search={{ q: tag.label }}
                          className="dhr-chip focus-ring rounded-full px-3 py-1.5 text-xs font-semibold"
                        >
                          <Highlight text={tag.label} words={words} />{" "}
                          <span className="num t-muted font-normal">· {tag.count}</span>
                        </Link>
                      ))}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
