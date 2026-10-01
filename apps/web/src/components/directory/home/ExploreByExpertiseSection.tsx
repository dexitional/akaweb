import { Link } from "@tanstack/react-router";

export function ExploreByExpertiseSection({ tags }: { tags: Array<string> }) {
  if (tags.length === 0) return null;
  return (
    <div className="mt-12">
      <h2 className="zone-h eyebrow t-muted mb-3">Explore by expertise</h2>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Link
            key={tag}
            to="/directory/search"
            search={{ q: tag }}
            className="dhr-chip focus-ring rounded-full px-3 py-1.5 text-xs font-semibold"
          >
            {tag}
          </Link>
        ))}
      </div>
    </div>
  );
}
