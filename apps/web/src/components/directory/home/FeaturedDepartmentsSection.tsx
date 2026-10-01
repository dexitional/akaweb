import { Link } from "@tanstack/react-router";

import type { FeaturedDepartment } from "#/lib/directory-types";

export function FeaturedDepartmentsSection({
  departments,
}: {
  departments: Array<FeaturedDepartment>;
}) {
  if (departments.length === 0) return null;
  return (
    <section aria-label="Featured departments">
      <h2 className="zone-h eyebrow t-muted mb-3">Featured departments</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {departments.map((department) => (
          <Link
            key={department.slug}
            to="/directory/d/$slug"
            params={{ slug: department.slug }}
            className="surface focus-ring block p-4 hover:shadow-sm"
          >
            <p className="heading text-sm leading-snug">{department.name}</p>
            {department.head && <p className="t-muted mt-1 text-xs">Head: {department.head}</p>}
            <p className="mt-2 text-xs">
              <span className="num t-spark">{department.staff}</span>{" "}
              <span className="t-muted">staff</span>
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
