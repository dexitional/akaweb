import { createFileRoute } from "@tanstack/react-router";
import { getPostList } from "#/server/public";
import { PostListingPage, postListSearchSchema } from "#/components/site/post-pages";

export const Route = createFileRoute("/_site/events/")({
  validateSearch: postListSearchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getPostList({ data: { type: "event", ...deps } }),
  head: () => ({ meta: [{ title: "Events | Akatsi College of Education" }] }),
  component: ListingRoute,
});

function ListingRoute() {
  return <PostListingPage type="event" search={Route.useSearch()} data={Route.useLoaderData()} />;
}
