import { Link, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent } from "react";
import { ArrowRight, Building2, Loader2, Search, Sparkles } from "lucide-react";

import { rememberSearch, useSearchHistory } from "#/hooks/useSearchHistory";
import type { DirectorySearchResults, DirectoryStats } from "#/lib/directory-types";
import { InitialsAvatar } from "../shared/InitialsAvatar";
import { UnitCategoryIcon } from "../shared/unitCategoryIcons";

const ALPHABET = Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i));
const EMPTY_RESULTS: DirectorySearchResults = {
  people: [],
  units: [],
  categories: [],
  expertise: [],
};

interface DirectoryHeroProps {
  stats: DirectoryStats;
  initialQuery?: string;
  activeInitial?: string;
}

function formatCount(value: number) {
  return value.toLocaleString("en-GB");
}

export function DirectoryHero({ stats, initialQuery = "", activeInitial }: DirectoryHeroProps) {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ term: string; data: DirectorySearchResults }>({
    term: "",
    data: EMPTY_RESULTS,
  });
  const { recent, saved, clearRecent, removeSaved } = useSearchHistory();
  const term = query.trim();

  // Live suggestions, debounced like the reference (300ms).
  useEffect(() => {
    if (term.length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      setLoading(true);
      fetch(`/api/directory/search?q=${encodeURIComponent(term)}`, { signal: controller.signal })
        .then((res) => (res.ok ? (res.json() as Promise<DirectorySearchResults>) : EMPTY_RESULTS))
        .then((data) => setResults({ term, data }))
        .catch(() => {
          // Aborted or offline — keep the previous suggestions.
        })
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  // "/" focuses search from anywhere on the page.
  useEffect(() => {
    function onSlashKey(event: globalThis.KeyboardEvent) {
      const tag = (document.activeElement?.tagName ?? "").toUpperCase();
      if (event.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA" && tag !== "SELECT") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onSlashKey);
    return () => document.removeEventListener("keydown", onSlashKey);
  }, []);

  // Close suggestions on an outside click.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const current = term.length >= 2 && results.term === term ? results.data : EMPTY_RESULTS;
  const total =
    current.people.length +
    current.units.length +
    current.categories.length +
    current.expertise.length;
  const showPanel = open && term.length >= 2 && (results.term === term || loading);

  function submit(value: string) {
    const clean = value.trim();
    if (!clean) return;
    rememberSearch(clean);
    setOpen(false);
    void navigate({ to: "/directory/search", search: { q: clean } });
  }

  // Arrow keys walk the options (focus moves onto them, as in the reference).
  const move = useCallback((step: number) => {
    const items = Array.from(listRef.current?.querySelectorAll<HTMLElement>("[role=option]") ?? []);
    if (items.length === 0) return;
    setOpen(true);
    const at = items.indexOf(document.activeElement as HTMLElement);
    const next =
      at < 0 ? (step > 0 ? 0 : items.length - 1) : (at + step + items.length) % items.length;
    items[next]?.focus();
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      move(1);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      move(-1);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      inputRef.current?.focus();
    }
  }

  // Dock-style magnification of the A–Z tiles toward the pointer.
  function zoom(event: MouseEvent<HTMLElement>) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    event.currentTarget.querySelectorAll("button").forEach((button) => {
      const rect = button.getBoundingClientRect();
      const distance = Math.abs(event.clientX - (rect.left + rect.width / 2));
      const scale = Math.max(1, 1.75 - distance / 80);
      button.style.transform = scale > 1 ? `translateY(${-(scale - 1) * 9}px) scale(${scale})` : "";
      button.style.zIndex = scale > 1 ? String(Math.round(scale * 100)) : "";
    });
  }

  function resetZoom(event: MouseEvent<HTMLElement>) {
    event.currentTarget.querySelectorAll("button").forEach((button) => {
      button.style.transform = "";
      button.style.zIndex = "";
    });
  }

  const unitStats = [
    { value: stats.departments, label: stats.departments === 1 ? "department" : "departments" },
    { value: stats.units, label: stats.units === 1 ? "unit" : "units" },
    { value: stats.offices, label: stats.offices === 1 ? "office" : "offices" },
  ].filter((stat) => stat.value > 0);

  const optionClass =
    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left outline-none hover:bg-[#f8f7fc] focus:bg-[#eef0f8]";

  return (
    // No overflow-hidden on the section itself: it would clip the suggestions
    // dropdown. Only the decorative glow layer is cropped. z-30 lifts the
    // dropdown over later sections (their badges use z-10) while staying under
    // the sticky header (z-50) and the Favourites button (z-40).
    <section id="dhr-hero" className="dhr-hero relative z-30">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="dhr-hero-blob-a absolute -top-24 -right-24 h-96 w-96 rounded-full blur-3xl" />
        <div className="dhr-hero-blob-b absolute -bottom-24 -left-24 h-96 w-96 rounded-full blur-3xl" />
      </div>

      <div className="dhr-shell relative pt-12 pb-12 sm:pt-16 sm:pb-14">
        <div className="dhr-enter">
          <h1 className="heading max-w-4xl text-4xl leading-tight sm:text-5xl">
            Discover Expertise,
            <br />
            <span className="dhr-grad">Connect with Scholars</span>
          </h1>
          <p className="t-muted mt-5 max-w-3xl text-base sm:text-lg">
            Your gateway to connecting with over{" "}
            <strong className="num t-accent">{formatCount(stats.staff)}</strong> dedicated tutors,
            administrators, and staff across the college.
          </p>
          {unitStats.length > 0 && (
            <p className="t-muted mt-2 text-xs">
              {unitStats.map((stat, i) => (
                <span key={stat.label}>
                  {i > 0 && " · "}
                  <span className="num text-[#0b1a62]">{formatCount(stat.value)}</span> {stat.label}
                </span>
              ))}
            </p>
          )}
        </div>

        <div ref={rootRef} className="relative mt-6 w-full" onKeyDown={onKeyDown}>
          <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
            {loading ? "Searching directory..." : showPanel ? `${total} suggestions` : ""}
          </div>

          {loading ? (
            <Loader2
              className="t-muted absolute top-1/2 left-4 size-5 -translate-y-1/2 animate-spin"
              aria-hidden="true"
            />
          ) : (
            <Search
              className="t-muted absolute top-1/2 left-4 size-5 -translate-y-1/2"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          )}

          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                submit(query);
              }
            }}
            placeholder="Search by name, department, or expertise..."
            aria-label="Search the directory"
            autoComplete="off"
            role="combobox"
            aria-autocomplete="list"
            aria-controls="dhr-suggestions"
            aria-expanded={showPanel}
            aria-describedby="directory-search-hint"
            className="surface focus-ring dhr-search w-full py-3.5 pr-28 pl-12 text-base outline-none [&::-webkit-search-cancel-button]:hidden"
          />
          <p id="directory-search-hint" className="sr-only">
            Type to see suggestions as you go, use the arrow keys to move through them, or press
            Enter to see all results.
          </p>
          <span className="t-muted pointer-events-none absolute top-1/2 right-4 hidden -translate-y-1/2 items-center gap-1.5 text-[11px] sm:flex">
            <kbd className="surface-2 rounded px-1.5 py-0.5 font-semibold">/</kbd> to search
          </span>

          {showPanel && (
            <div
              ref={listRef}
              id="dhr-suggestions"
              role="listbox"
              aria-label="Search suggestions"
              className="surface animate-in fade-in-0 slide-in-from-top-1 absolute inset-x-0 top-full z-30 mt-2 max-h-[26rem] overflow-y-auto p-2 shadow-xl duration-150"
            >
              {results.term !== term && loading ? (
                <p className="t-muted px-3 py-4 text-sm">Searching…</p>
              ) : total === 0 ? (
                <p className="t-muted px-3 py-4 text-sm">
                  No matches for <strong className="text-[#0b1a62]">“{term}”</strong>. Try a
                  surname, department or topic.
                </p>
              ) : (
                <>
                  {current.people.length > 0 && (
                    <div role="group" aria-label="People">
                      <p className="eyebrow t-muted px-3 pt-2 pb-1">People</p>
                      {current.people.map((person) => (
                        <Link
                          key={person.slug}
                          to="/directory/p/$slug"
                          params={{ slug: person.slug ?? "" }}
                          role="option"
                          aria-selected={false}
                          onClick={() => rememberSearch(term)}
                          className={optionClass}
                        >
                          <InitialsAvatar
                            name={person.name}
                            photoUrl={person.photoUrl}
                            size={32}
                            colorClassName="bg-[#E4E6F5] text-[#39418F]"
                          />
                          <span className="min-w-0">
                            <span className="heading block truncate text-sm">{person.name}</span>
                            <span className="t-muted block truncate text-xs">
                              {[person.title, person.department].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {current.units.length > 0 && (
                    <div role="group" aria-label="Units">
                      <p className="eyebrow t-muted px-3 pt-3 pb-1">Departments &amp; units</p>
                      {current.units.map((unit) => (
                        <Link
                          key={unit.slug}
                          to="/directory/d/$slug"
                          params={{ slug: unit.slug }}
                          role="option"
                          aria-selected={false}
                          onClick={() => rememberSearch(term)}
                          className={optionClass}
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E4E6F5] text-[#39418F]">
                            <Building2 className="size-4" aria-hidden="true" />
                          </span>
                          <span className="min-w-0">
                            <span className="heading block truncate text-sm">{unit.name}</span>
                            <span className="t-muted block truncate text-xs">
                              {[unit.code, unit.category].filter(Boolean).join(" · ")}
                            </span>
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {current.categories.length > 0 && (
                    <div role="group" aria-label="Unit categories">
                      <p className="eyebrow t-muted px-3 pt-3 pb-1">Browse by type</p>
                      {current.categories.map((category) => (
                        <Link
                          key={category.slug}
                          to="/directory/d/list/$category"
                          params={{ category: category.slug }}
                          role="option"
                          aria-selected={false}
                          onClick={() => rememberSearch(term)}
                          className={optionClass}
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E4E6F5] text-[#39418F]">
                            <UnitCategoryIcon
                              name={category.icon}
                              className="size-4"
                              aria-hidden="true"
                            />
                          </span>
                          <span className="heading min-w-0 flex-1 truncate text-sm">
                            All {category.pluralName.toLowerCase()}
                          </span>
                          <span className="t-muted shrink-0 text-xs">
                            {category.unitCount} {category.unitCount === 1 ? "unit" : "units"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                  {current.expertise.length > 0 && (
                    <div role="group" aria-label="Expertise">
                      <p className="eyebrow t-muted px-3 pt-3 pb-1">Expertise</p>
                      {current.expertise.map((tag) => (
                        <Link
                          key={tag.label}
                          to="/directory/search"
                          search={{ q: tag.label }}
                          role="option"
                          aria-selected={false}
                          onClick={() => rememberSearch(tag.label)}
                          className={optionClass}
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-[#E4E6F5] text-[#39418F]">
                            <Sparkles className="size-4" aria-hidden="true" />
                          </span>
                          <span className="heading min-w-0 flex-1 truncate text-sm">
                            {tag.label}
                          </span>
                          <span className="t-muted shrink-0 text-xs">
                            {tag.count} {tag.count === 1 ? "person" : "people"}
                          </span>
                        </Link>
                      ))}
                    </div>
                  )}
                </>
              )}
              <div className="mt-1 border-t border-[#d4d7e8] pt-1">
                <Link
                  to="/directory/search"
                  search={{ q: term }}
                  role="option"
                  aria-selected={false}
                  onClick={() => rememberSearch(term)}
                  className={`${optionClass} t-accent text-sm font-semibold`}
                >
                  See all results for “{term}”
                  <ArrowRight className="ml-auto size-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          )}
        </div>

        {recent.length > 0 && (
          <div className="mt-5 flex flex-wrap items-center gap-2 text-xs">
            <span className="t-muted">Recent:</span>
            {recent.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => {
                  setQuery(item);
                  setOpen(true);
                  inputRef.current?.focus();
                }}
                className="dhr-recent focus-ring cursor-pointer rounded-full px-2.5 py-1 font-semibold"
              >
                {item}
              </button>
            ))}
            <button
              type="button"
              onClick={clearRecent}
              className="focus-ring t-muted cursor-pointer underline underline-offset-2 hover:no-underline"
            >
              Clear
            </button>
          </div>
        )}

        {saved.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
            <span className="t-muted">Saved:</span>
            {saved.map((item) => (
              <span
                key={item.name}
                className="dhr-recent inline-flex items-center rounded-full font-semibold"
              >
                <Link
                  to="/directory/search"
                  search={{ q: item.query }}
                  className="focus-ring rounded-l-full py-1 pr-1 pl-2.5"
                  title={`Search for “${item.query}”`}
                >
                  {item.name}
                </Link>
                <button
                  type="button"
                  onClick={() => removeSaved(item.name)}
                  aria-label={`Remove saved search ${item.name}`}
                  className="focus-ring cursor-pointer rounded-r-full py-1 pr-2 pl-0.5 opacity-70 hover:opacity-100"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <nav
          className="az mt-10 mb-4 flex flex-wrap items-center gap-1.5"
          aria-label="Browse people by surname initial"
          onMouseMove={zoom}
          onMouseLeave={resetZoom}
        >
          <span className="eyebrow t-muted mr-1.5">Browse A–Z</span>
          {ALPHABET.map((letter) => (
            <button
              key={letter}
              type="button"
              aria-pressed={activeInitial === letter}
              aria-label={`People with surnames starting with ${letter}`}
              onClick={() =>
                void navigate({ to: "/directory/search", search: { initial: letter } })
              }
              className="focus-ring"
            >
              {letter}
            </button>
          ))}
        </nav>
      </div>
    </section>
  );
}
