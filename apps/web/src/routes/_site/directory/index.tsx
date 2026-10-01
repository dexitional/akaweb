import { createFileRoute } from "@tanstack/react-router";
import { getDirectoryHomeData } from "#/server/directory-fns";
import { DirectoryBreadcrumb } from "#/components/directory/home/DirectoryBreadcrumb";
import { DirectoryHero } from "#/components/directory/home/DirectoryHero";
import { MostViewedProfilesSection } from "#/components/directory/home/MostViewedProfilesSection";
import { NewFacesAndRecentSection } from "#/components/directory/home/NewFacesAndRecentSection";
import { DirectoryWayfindingSection } from "#/components/directory/home/DirectoryWayfindingSection";
import { GetListedSection } from "#/components/directory/home/GetListedSection";

export const Route = createFileRoute("/_site/directory/")({
  loader: () => getDirectoryHomeData(),
  head: () => ({
    meta: [
      { title: "Staff Directory | Akatsi College of Education" },
      {
        name: "description",
        content:
          "Find tutors, researchers, administrators and support staff across Akatsi College of Education.",
      },
    ],
  }),
  component: DirectoryHomeRoute,
});

function DirectoryHomeRoute() {
  const data = Route.useLoaderData();
  return (
    <>
      <DirectoryBreadcrumb />
      <DirectoryHero stats={data.stats} />
      <MostViewedProfilesSection profiles={data.mostViewed} />
      <NewFacesAndRecentSection
        newFaces={data.newFaces}
        researcher={data.researcher}
        appointedHeads={data.appointedHeads}
        featuredDepartments={data.featuredDepartments}
      />
      <DirectoryWayfindingSection categories={data.categories} tags={data.expertiseTags} />
      <GetListedSection email={data.listing.email} recipients={data.listing.recipients} />
    </>
  );
}
