import { useState } from "react";
import type { Publication } from "#/lib/directory-types";

// Year groups visible before "Show all"; the rest are revealed on click.
const INITIAL_YEAR_GROUPS = 5;

interface YearGroup {
  year?: number; // undefined = entries with no year, listed last
  publications: Publication[];
}

function groupByYear(publications: Publication[]): YearGroup[] {
  const groups = new Map<number | undefined, Publication[]>();
  for (const pub of publications) {
    const list = groups.get(pub.year) ?? [];
    list.push(pub);
    groups.set(pub.year, list);
  }
  return [...groups.entries()]
    .sort(([a], [b]) => (a === undefined ? 1 : b === undefined ? -1 : b - a))
    .map(([year, list]) => ({ year, publications: list }));
}

function PublicationItem({ pub }: { pub: Publication }) {
  const titleClass = "heading block text-sm leading-snug font-semibold";
  return (
    <div className="p-4">
      {pub.url ? (
        <a
          href={pub.url}
          target="_blank"
          rel="noopener noreferrer"
          className={`${titleClass} text-[#39418f] hover:underline`}
        >
          {pub.title}
        </a>
      ) : (
        <span className={titleClass}>{pub.title}</span>
      )}
      {pub.authorsWithSelfBold.length > 0 && (
        <p className="t-muted mt-1 text-xs">
          {pub.authorsWithSelfBold.map((author, i) => (
            <span key={i}>
              {i > 0 && ", "}
              {author.bold ? <span className="font-semibold">{author.text}</span> : author.text}
            </span>
          ))}
        </p>
      )}
      {pub.metaLine && <p className="t-muted mt-0.5 text-xs">{pub.metaLine}</p>}
    </div>
  );
}

export function ProfilePublications({ publications }: { publications: Publication[] }) {
  const [showAll, setShowAll] = useState(false);
  const groups = groupByYear(publications);
  // Entries with no year at all get one plain list, no heading.
  const hasYears = groups.some((group) => group.year !== undefined);
  const visible = showAll ? groups : groups.slice(0, INITIAL_YEAR_GROUPS);

  return (
    <>
      <div className="space-y-6">
        {visible.map((group) => (
          <div key={group.year ?? "undated"}>
            {hasYears && (
              <h3 className="num t-spark mb-2 text-sm font-bold">{group.year ?? "Undated"}</h3>
            )}
            <div className="surface divide-y divide-[#d4d7e8] rounded-xl">
              {group.publications.map((pub, i) => (
                <PublicationItem key={`${pub.title}-${i}`} pub={pub} />
              ))}
            </div>
          </div>
        ))}
      </div>
      {!showAll && groups.length > INITIAL_YEAR_GROUPS && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="focus-ring num mt-4 cursor-pointer text-sm font-bold text-[#39418f] hover:underline"
        >
          Show all {publications.length} publications
        </button>
      )}
    </>
  );
}
