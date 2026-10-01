import { Link } from "@tanstack/react-router";

import type { UnitCategory } from "#/lib/directory-types";
import { UnitCategoryIcon } from "../shared/unitCategoryIcons";

export function BrowseByTypeSection({ categories }: { categories: Array<UnitCategory> }) {
  // Only the kinds of unit the college actually has.
  const present = categories.filter((category) => category.unitCount > 0);
  return (
    <div>
      <div className="mb-8">
        <h2 className="heading text-2xl">Browse by Type</h2>
        <p className="t-muted mt-1.5 text-sm">
          Explore departments, units and offices across the college
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {present.map((category) => (
          <Link
            key={category.slug}
            to="/directory/d/list/$category"
            params={{ category: category.slug }}
            className="surface focus-ring flex items-center gap-3.5 p-4 transition-shadow hover:shadow-md"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#E4E6F5] text-[#39418F]">
              <UnitCategoryIcon name={category.icon} className="size-5" aria-hidden="true" />
            </span>
            <span className="min-w-0">
              <span className="heading block truncate text-sm">{category.pluralName}</span>
              <span className="t-muted block text-xs">
                {category.unitCount} {category.unitCount === 1 ? "unit" : "units"}
              </span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
