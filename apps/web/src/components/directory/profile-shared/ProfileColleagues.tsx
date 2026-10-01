import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { InitialsAvatar } from "../shared/InitialsAvatar";
import type { Colleague, ColleagueTab } from "#/lib/directory-types";

const AVATAR_COLORS = "bg-[#E4E6F5] text-[#39418F]";
const LAST_PROFILE_KEY = "directory:lastViewedProfile";

function ColleagueRow({ colleague }: { colleague: Colleague }) {
  return (
    <Link
      to="/directory/p/$slug"
      params={{ slug: colleague.slug }}
      className="flex items-center gap-3.5 px-5 py-3 transition-colors hover:bg-[#f8f7fc] sm:px-6"
    >
      <InitialsAvatar
        name={colleague.name}
        size={44}
        photoUrl={colleague.photoUrl}
        colorClassName={AVATAR_COLORS}
        ringColor="ring-2 ring-[#eef0f8]"
      />
      <span className="min-w-0 flex-1">
        <span className="heading block truncate text-sm">{colleague.name}</span>
        <span className="t-muted block truncate text-xs">
          {[colleague.title, colleague.department].filter(Boolean).join(" · ")}
        </span>
        {colleague.tags && colleague.tags.length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1">
            {colleague.tags.map((tag) => (
              <span
                key={tag}
                className="chip-spark inline-flex items-center rounded-full px-2 py-0.5 text-[11px]"
              >
                {tag}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="t-muted text-lg leading-none" aria-hidden="true">
        ›
      </span>
    </Link>
  );
}

function ColleaguePill({ colleague }: { colleague: Colleague }) {
  return (
    <Link
      to="/directory/p/$slug"
      params={{ slug: colleague.slug }}
      className="surface inline-flex items-center gap-2.5 rounded-full py-1.5 pr-4 pl-1.5 transition-colors hover:bg-[#f8f7fc]"
    >
      <InitialsAvatar
        name={colleague.name}
        size={36}
        photoUrl={colleague.photoUrl}
        colorClassName={AVATAR_COLORS}
      />
      <span className="leading-tight">
        <span className="heading block text-sm">{colleague.name}</span>
        {colleague.title && <span className="t-muted block text-[11px]">{colleague.title}</span>}
      </span>
    </Link>
  );
}

export function ProfileColleagues({ tabs }: { tabs: ColleagueTab[] }) {
  const [activeId, setActiveId] = useState(tabs[0]?.id);
  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0];
  if (!active) return null;

  return (
    <div className="surface overflow-hidden rounded-2xl">
      <div className="p-5 pb-0 sm:p-6">
        <div
          role="tablist"
          aria-label="Colleagues"
          className="surface-2 flex w-max max-w-full flex-wrap gap-1 rounded-full p-1"
        >
          {tabs.map((tab) => {
            const selected = tab.id === active.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                id={`colleagues-tab-${tab.id}`}
                aria-selected={selected}
                aria-controls={`colleagues-panel-${tab.id}`}
                onClick={() => setActiveId(tab.id)}
                className="focus-ring cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold text-[#5a5f7e] transition-colors aria-[selected=false]:hover:text-[#0b1a62] aria-selected:bg-[#39418f] aria-selected:text-white"
              >
                {tab.label} ({tab.count})
              </button>
            );
          })}
        </div>
      </div>

      <div
        role="tabpanel"
        id={`colleagues-panel-${active.id}`}
        aria-labelledby={`colleagues-tab-${active.id}`}
      >
        {active.groups ? (
          <div className="space-y-5 p-5 pt-4 sm:p-6 sm:pt-4">
            {active.groups.map((group) => (
              <div key={group.label}>
                <div className="mb-2.5 flex items-center gap-3">
                  <span className="chip-spark inline-flex items-center gap-1 rounded-full px-3 py-1 text-sm">
                    ✦ {group.label}
                  </span>
                  <span className="rule flex-1" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {group.colleagues.map((colleague) => (
                    <ColleaguePill key={colleague.slug} colleague={colleague} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-2 divide-y divide-[#d4d7e8]">
            {active.colleagues.map((colleague) => (
              <ColleagueRow key={colleague.slug} colleague={colleague} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Records "viewed together" pairs: when a visitor opens this profile after
 * another one in the same browser session, report the pair so both profiles'
 * "Frequently viewed" tabs can learn from it. Renders nothing.
 */
export function CoViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    let previous: string | null = null;
    try {
      previous = sessionStorage.getItem(LAST_PROFILE_KEY);
      // Store before posting so a re-run (e.g. React Strict Mode) sees
      // previous === slug and skips the duplicate report.
      sessionStorage.setItem(LAST_PROFILE_KEY, slug);
    } catch {
      return; // Storage unavailable (private mode etc.) — skip tracking.
    }
    if (!previous || previous === slug) return;

    fetch("/api/directory/track-coview", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: previous, to: slug }),
    }).catch(() => {
      // Tracking is best-effort.
    });
  }, [slug]);

  return null;
}
