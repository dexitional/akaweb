import { createFileRoute } from "@tanstack/react-router";
import { getProfileData } from "#/server/directory-fns";
import { ProfilePage } from "#/components/directory/profile-shared/ProfilePage";

export const Route = createFileRoute("/_site/directory/p/$slug")({
  // Each visit counts as a view, so never serve a cached profile.
  staleTime: 0,
  loader: ({ params }) => getProfileData({ data: { slug: params.slug } }),
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.name} | Akatsi College of Education` },
          {
            name: "description",
            content: loaderData.departmentName
              ? `${loaderData.role} in the ${loaderData.departmentName} at Akatsi College of Education.`
              : loaderData.role,
          },
        ]
      : [],
  }),
  component: StaffProfileRoute,
});

function StaffProfileRoute() {
  const profile = Route.useLoaderData();
  return <ProfilePage key={profile.slug} data={profile} />;
}
