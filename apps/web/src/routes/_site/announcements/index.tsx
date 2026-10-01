import { createFileRoute } from "@tanstack/react-router";
import { getPostList } from "#/server/public";
import { PostListingPage, postListSearchSchema } from "#/components/site/post-pages";

export const Route = createFileRoute("/_site/announcements/")({
  validateSearch: postListSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getPostList({ data: { type: "announcement", ...deps } }),
  head: () => ({ meta: [{ title: "Announcements | Akatsi College of Education" }] }),
  component: ListingRoute,
});

function ListingRoute() {
  return <PostListingPage type="announcement" search={Route.useSearch()} data={Route.useLoaderData()} />;
}
