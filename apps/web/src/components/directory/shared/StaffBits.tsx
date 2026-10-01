import { Star } from "lucide-react";

import { useFavourites } from "#/hooks/useFavourites";
import { cn } from "#/lib/utils";
import type { UnitPerson } from "#/lib/directory-types";
import { OptimizedImage } from "#/components/site/optimized-image";

// Building blocks shared by the unit page, search results and favourites:
// initials, profile links, the photo-over-initials tile and the favourite star.

const TITLE_PREFIX_RE = /^(dr|mr|mrs|ms|miss|prof|rev)\.?$/i;

export function getInitials(fullName: string): string {
  const words = fullName
    .replace(/\([^)]*\)/g, " ")
    .trim()
    .split(/\s+/)
    .filter((word) => !TITLE_PREFIX_RE.test(word));
  if (words.length === 0) return "?";
  const first = words[0]!.charAt(0);
  const last = words.length > 1 ? words[words.length - 1]!.charAt(0) : "";
  return (first + last).toUpperCase();
}

export function profileHref(slug: string) {
  return `/directory/p/${slug}`;
}

/** Initials drawn as SVG (so they scale with the box) with the photo layered over them. */
export function PersonPhoto({
  person,
  className,
  sizes = "96px",
}: {
  person: UnitPerson;
  className?: string;
  /** Rendered width, for picking the image variant — see OptimizedImage. */
  sizes?: string;
}) {
  return (
    <span
      className={cn(
        "relative inline-flex items-center justify-center overflow-hidden bg-[#E4E6F5] text-[#39418F] select-none",
        className,
      )}
    >
      <svg className="h-full w-full" viewBox="0 0 100 100" aria-hidden="true" focusable="false">
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
          sizes={sizes}
          className="absolute inset-0 h-full w-full object-cover object-top"
        />
      )}
    </span>
  );
}

export function FavouriteButton({ slug, name }: { slug?: string; name: string }) {
  const { isFavourite, toggle } = useFavourites();
  if (!slug) return null;
  const active = isFavourite(slug);
  const label = active ? `Remove ${name} from favourites` : `Add ${name} to favourites`;
  return (
    <div className="absolute top-3 right-3 z-10 print:hidden">
      <button
        type="button"
        onClick={() => toggle(slug)}
        aria-pressed={active}
        aria-label={label}
        title={active ? "Remove from favourites" : "Add to favourites"}
        className={cn(
          "inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border transition-colors",
          active
            ? "border-[#c8892b] bg-[#fffbeb] text-[#7f5c07]"
            : "border-[#d4d7e8] bg-white/90 text-[#5a5f7e] hover:border-[#c8892b] hover:text-[#7f5c07]",
        )}
      >
        <Star
          className="h-5 w-5 shrink-0"
          strokeWidth={1.5}
          fill={active ? "currentColor" : "none"}
          aria-hidden="true"
        />
      </button>
    </div>
  );
}
