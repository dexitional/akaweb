import { createFileRoute, notFound } from "@tanstack/react-router";
import { z } from "zod";
import { getDirectoryHomeData, getUnitListData } from "#/server/directory-fns";
import { UnitListPage } from "#/components/directory/unit-list/UnitListPage";
import { GetListedSection } from "#/components/directory/home/GetListedSection";

const searchSchema = z.object({
  q: z.string().max(100).optional().catch(undefined),
  filter: z
    .enum(["all", "with_website", "with_contact", "large", "medium", "small"])
    .optional()
    .catch(undefined),
  sort: z.enum(["name", "initials", "staff_count"]).optional().catch(undefined),
  view: z.enum(["grid", "list"]).optional().catch(undefined),
  scope: z.enum(["page", "global"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_site/directory/d/list/$category")({
  validateSearch: searchSchema,
  loader: async ({ params }) => {
    const [list, home] = await Promise.all([getUnitListData(), getDirectoryHomeData()]);
    const category = list.categories.find((c) => c.slug === params.category);
    if (!category) throw notFound();
    return { ...list, category, listing: home.listing };
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.category.pluralName} | Akatsi College of Education` },
          {
            name: "description",
            content: `Browse the ${loaderData.category.pluralName.toLowerCase()} of Akatsi College of Education and find their staff, websites and contacts.`,
          },
        ]
      : [],
  }),
  component: UnitCategoryListRoute,
});

function UnitCategoryListRoute() {
  const { category, categories, units, listing } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    <>
      {/* Keyed so switching category (a client-side navigation) starts from that URL's state. */}
      <UnitListPage
        key={category.slug}
        category={category}
        categories={categories}
        units={units}
        initialState={{
          q: search.q ?? "",
          filter: search.filter ?? "all",
          sort: search.sort ?? "name",
          view: search.view ?? "grid",
          scope: search.scope ?? "page",
        }}
      />
      <GetListedSection email={listing.email} recipients={listing.recipients} />
    </>
  );
}
