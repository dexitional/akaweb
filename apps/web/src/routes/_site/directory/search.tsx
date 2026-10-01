import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getDirectorySearchData } from "#/server/directory-fns";
import { useSiteLayout } from "#/lib/site-layout";
import { DirectoryBreadcrumb } from "#/components/directory/home/DirectoryBreadcrumb";
import { DirectoryHero } from "#/components/directory/home/DirectoryHero";
import { SearchResults } from "#/components/directory/search/SearchResults";

// Unknown or missing values fall back to the default rather than erroring.
const searchSchema = z.object({
  q: z.string().max(100).optional().catch(undefined),
  initial: z
    .string()
    .regex(/^[A-Za-z]$/)
    .optional()
    .catch(undefined),
  type: z.enum(["all", "people", "units", "categories", "expertise"]).optional().catch(undefined),
  view: z.enum(["grid", "list", "compact"]).optional().catch(undefined),
  staff: z.enum(["teaching", "non-teaching"]).optional().catch(undefined),
  dept: z.string().max(160).optional().catch(undefined),
});

export const Route = createFileRoute("/_site/directory/search")({
  validateSearch: searchSchema,
  // Only the query refetches; filters are applied in the page.
  loaderDeps: ({ search }) => ({
    q: search.q?.trim() ?? "",
    initial: search.q?.trim() ? "" : (search.initial?.toUpperCase() ?? ""),
  }),
  loader: ({ deps }) => getDirectorySearchData({ data: deps }),
  head: ({ match }) => {
    const { q, initial } = match.loaderDeps;
    const title = q
      ? `“${q}” — Directory search`
      : initial
        ? `People · ${initial} — Directory`
        : "Directory search";
    return {
      meta: [
        { title: `${title} | Akatsi College of Education` },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: DirectorySearchRoute,
});

function DirectorySearchRoute() {
  const { stats, results } = Route.useLoaderData();
  const { q, initial } = Route.useLoaderDeps();
  const search = Route.useSearch();
  const { settings } = useSiteLayout();
  return (
    <>
      <DirectoryBreadcrumb current="Search" />
      {/* Keyed so a new search (client-side navigation) resets the hero and filters. */}
      <DirectoryHero
        key={`hero-${q}-${initial}`}
        stats={stats}
        initialQuery={q}
        activeInitial={initial || undefined}
      />
      {(q || initial) && (
        <SearchResults
          key={`results-${q}-${initial}`}
          query={q}
          initial={initial || undefined}
          results={results}
          organization={settings.identity.name}
          initialState={{
            type: search.type ?? "all",
            view: search.view ?? "grid",
            staff: search.staff ?? "",
            dept: search.dept ?? "",
          }}
        />
      )}
    </>
  );
}
