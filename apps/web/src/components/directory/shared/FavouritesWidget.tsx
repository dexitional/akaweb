import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Star, X } from "lucide-react";

import { useFavourites } from "#/hooks/useFavourites";
import type { UnitPerson } from "#/lib/directory-types";
import { getInitials } from "./StaffBits";
import { OptimizedImage } from "#/components/site/optimized-image";

/**
 * Floating "Favourites" button + panel, shown on every directory page once
 * the visitor has starred at least one profile. Favourites are slugs in
 * localStorage; names/photos are looked up fresh so they never go stale
 * (profiles that were removed or exited drop out).
 */
export function FavouritesWidget() {
  const { favourites, remove, clearAll } = useFavourites();
  const [open, setOpen] = useState(false);
  // slug → details; null once looked up and not found.
  const [details, setDetails] = useState<Record<string, UnitPerson | null>>({});
  const rootRef = useRef<HTMLDivElement>(null);

  const missing = favourites.filter((slug) => !(slug in details));
  const missingKey = missing.join(",");
  useEffect(() => {
    if (!missingKey) return;
    let cancelled = false;
    fetch(`/api/directory/favourites?slugs=${encodeURIComponent(missingKey)}`)
      .then((res) =>
        res.ok ? (res.json() as Promise<{ people: Array<UnitPerson> }>) : { people: [] },
      )
      .then(({ people }) => {
        if (cancelled) return;
        setDetails((prev) => {
          const next = { ...prev };
          for (const slug of missingKey.split(","))
            next[slug] = people.find((p) => p.slug === slug) ?? null;
          return next;
        });
      })
      .catch(() => {
        // Network hiccup: leave them unresolved; the next change retries.
      });
    return () => {
      cancelled = true;
    };
  }, [missingKey]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const people = favourites.flatMap((slug) => details[slug] ?? []);
  const count = favourites.filter((slug) => details[slug] !== null).length;
  if (count === 0) return null;

  return (
    <div ref={rootRef} className="fixed right-4 bottom-4 z-40 print:hidden">
      {open && (
        <div
          id="favourites-panel"
          className="mb-3 w-80 max-w-[calc(100vw-2rem)] animate-in rounded-xl border border-neutral-200 bg-white shadow-xl duration-150 fade-in-0 zoom-in-95 slide-in-from-bottom-2"
        >
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <h2 className="text-sm font-semibold text-neutral-900">Favourites ({count})</h2>
            <button
              type="button"
              onClick={() => {
                clearAll();
                setOpen(false);
              }}
              className="cursor-pointer text-xs font-medium text-neutral-500 hover:text-red-600"
            >
              Clear all
            </button>
          </div>

          <ul className="max-h-80 divide-y divide-neutral-100 overflow-y-auto">
            {people.length === 0 && (
              <li className="px-4 py-6 text-center text-xs text-neutral-500">Loading…</li>
            )}
            {people.map((person) => (
              <li key={person.slug} className="flex items-center gap-3 px-4 py-3">
                <Link
                  to="/directory/p/$slug"
                  params={{ slug: person.slug ?? "" }}
                  onClick={() => setOpen(false)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <span className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#E4E6F5] text-[#39418F] ring-2 ring-neutral-100 select-none">
                    <svg
                      className="h-full w-full"
                      viewBox="0 0 100 100"
                      aria-hidden="true"
                      focusable="false"
                    >
                      <text
                        x="50"
                        y="50"
                        dy=".35em"
                        textAnchor="middle"
                        fontSize="40"
                        fontWeight="600"
                        fill="currentColor"
                      >
                        {getInitials(person.name)}
                      </text>
                    </svg>
                    {person.photoUrl && (
                      <OptimizedImage
                        src={person.photoUrl}
                        alt={person.name}
                        sizes="48px"
                        maxWidth={256}
                        className="absolute inset-0 h-full w-full object-cover object-top"
                      />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-neutral-900">
                      {person.name}
                    </span>
                    {person.title && (
                      <span className="block truncate text-xs text-neutral-500">
                        {person.title}
                      </span>
                    )}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => person.slug && remove(person.slug)}
                  aria-label={`Remove ${person.name} from favourites`}
                  title="Remove from favourites"
                  className="shrink-0 cursor-pointer rounded-full p-1.5 text-neutral-400 transition-colors hover:bg-red-50 hover:text-red-600"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          aria-expanded={open}
          aria-controls="favourites-panel"
          aria-label="Toggle favourites list"
          className="relative inline-flex cursor-pointer items-center gap-2 rounded-full border border-amber-400 bg-amber-50 px-5 py-3 text-sm font-semibold text-amber-700 shadow-lg transition-colors hover:bg-amber-100"
        >
          <Star
            className="h-5 w-5 shrink-0"
            fill="currentColor"
            strokeWidth={0}
            aria-hidden="true"
          />
          <span>Favourites</span>
          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white">
            {count}
          </span>
        </button>
      </div>
    </div>
  );
}
