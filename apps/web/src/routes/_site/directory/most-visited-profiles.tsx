import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { getMostVisitedData } from "#/server/directory-fns";
import { MostVisitedProfilesPage } from "#/components/directory/most-visited-profiles/MostVisitedProfilesPage";

const searchSchema = z.object({
  period: z.enum(["today", "week", "month", "year"]).optional().catch(undefined),
});

export const Route = createFileRoute("/_site/directory/most-visited-profiles")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => ({ period: search.period ?? "week" }),
  loader: ({ deps }) => getMostVisitedData({ data: deps }),
  head: () => ({
    meta: [
      { title: "Most Visited Profiles | Akatsi College of Education" },
      {
        name: "description",
        content: "The most viewed staff profiles at Akatsi College of Education.",
      },
    ],
  }),
  component: MostVisitedRoute,
});

function MostVisitedRoute() {
  const { profiles, departments } = Route.useLoaderData();
  const { period } = Route.useLoaderDeps();
  return (
    <MostVisitedProfilesPage
      key={period}
      profiles={profiles}
      departments={departments}
      period={period}
    />
  );
}
