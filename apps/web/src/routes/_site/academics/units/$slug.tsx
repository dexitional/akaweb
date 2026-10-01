import { createFileRoute } from "@tanstack/react-router";
import { getDepartmentData } from "#/server/public";
import { DepartmentPage } from "#/components/site/department-page";

export const Route = createFileRoute("/_site/academics/units/$slug")({
  loader: ({ params }) => getDepartmentData({ data: { kind: "unit", slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.department.name} | Akatsi College of Education` },
          ...(loaderData.department.summary ? [{ name: "description", content: loaderData.department.summary }] : []),
        ]
      : [],
  }),
  component: UnitRoute,
});

function UnitRoute() {
  const data = Route.useLoaderData();
  return <DepartmentPage kind="unit" {...data} />;
}
