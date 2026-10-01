import { createFileRoute } from "@tanstack/react-router";
import { getDepartmentData } from "#/server/public";
import { DepartmentPage } from "#/components/site/department-page";

export const Route = createFileRoute("/_site/academics/departments/$slug")({
  loader: ({ params }) => getDepartmentData({ data: { kind: "department", slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.department.name} | Akatsi College of Education` },
          ...(loaderData.department.summary ? [{ name: "description", content: loaderData.department.summary }] : []),
        ]
      : [],
  }),
  component: DepartmentRoute,
});

function DepartmentRoute() {
  const data = Route.useLoaderData();
  return <DepartmentPage kind="department" {...data} />;
}
