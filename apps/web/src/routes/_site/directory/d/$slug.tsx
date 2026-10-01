import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getUnitData } from "#/server/directory-fns";
import { DepartmentDetailPage } from "#/components/directory/department-detail/DepartmentDetailPage";

const searchSchema = z.object({
  q: z.string().max(100).optional().catch(undefined),
  filter: z.enum(["all", "teaching", "non-teaching"]).optional().catch(undefined),
  quick: z.enum(["professors", "heads", "senior"]).optional().catch(undefined),
  sort: z.enum(["relevance", "name", "designation"]).optional().catch(undefined),
  view: z.enum(["grid", "list"]).optional().catch(undefined),
  scope: z.enum(["page", "global"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_site/directory/d/$slug")({
  validateSearch: searchSchema,
  loader: ({ params }) => getUnitData({ data: { slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.unit.name} | Akatsi College of Education` },
          {
            name: "description",
            content: `Staff directory for the ${loaderData.unit.name} at Akatsi College of Education.`,
          },
        ]
      : [],
  }),
  component: UnitRoute,
});

function UnitRoute() {
  const { unit, directoryStaff } = Route.useLoaderData();
  const search = Route.useSearch();
  return (
    // Keyed so moving to another unit (client-side) starts from that URL's state.
    <DepartmentDetailPage
      key={unit.slug}
      {...unit}
      directoryStaff={directoryStaff}
      initialState={{
        q: search.q ?? "",
        filter: search.filter ?? "all",
        quick: search.quick ?? "",
        sort: search.sort ?? "relevance",
        view: search.view ?? "grid",
        scope: search.scope ?? "page",
      }}
    />
  );
}
