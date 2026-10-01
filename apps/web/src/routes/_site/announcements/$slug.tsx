import { createFileRoute } from "@tanstack/react-router";
import { getPostData } from "#/server/public";
import { PostDetailPage } from "#/components/site/post-pages";

export const Route = createFileRoute("/_site/announcements/$slug")({
  loader: ({ params }) => getPostData({ data: { type: "announcement", slug: params.slug } }),
  head: ({ loaderData }) => {
    const post = loaderData?.post;
    if (!post) return {};
    return {
      meta: [
        { title: `${post.title} | Akatsi College of Education` },
        { name: "description", content: post.description },
        { property: "og:title", content: post.title },
        { property: "og:description", content: post.description },
        { property: "og:type", content: "article" },
        ...(post.cover_image_url ? [{ property: "og:image", content: post.cover_image_url }] : []),
      ],
    };
  },
  component: DetailRoute,
});

function DetailRoute() {
  const { post, related } = Route.useLoaderData();
  return <PostDetailPage post={post} related={related} />;
}
