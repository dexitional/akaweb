import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { z } from "zod";
import { Eye } from "lucide-react";
import { getPageData } from "#/server/public";
import { sectionDef } from "#/lib/content";
import { legacyRedirect } from "#/lib/legacy-redirects";
import { cn } from "#/lib/utils";
import { PageHero } from "#/components/site/page-hero";
import { RichContent } from "#/components/site/rich-content";
import { PageBlocks } from "#/components/site/page-blocks";
import { SmartLink } from "#/components/site/smart-link";

// Any CMS page: /about/history, /admissions/how-to-apply, ...
export const Route = createFileRoute("/_site/$section/$slug")({
  validateSearch: z.object({ preview: z.literal(1).optional().catch(undefined) }),
  beforeLoad: ({ params }) => {
    if (!sectionDef(params.section)) {
      // Old WordPress URLs (/history-of-akatsicoe/, /departments/languages/, ...).
      const target = legacyRedirect(`/${params.section}/${params.slug}`);
      if (target) throw redirect({ href: target, statusCode: 301 });
      throw notFound();
    }
  },
  loaderDeps: ({ search }) => ({ preview: search.preview === 1 }),
  loader: ({ params, deps }) =>
    getPageData({ data: { section: params.section, slug: params.slug, preview: deps.preview } }),
  head: ({ loaderData }) => {
    const page = loaderData?.page;
    if (!page) return {};
    const description = page.seo_description ?? page.summary ?? undefined;
    return {
      meta: [
        { title: `${page.seo_title ?? page.title} | Akatsi College of Education` },
        ...(description ? [{ name: "description", content: description }, { property: "og:description", content: description }] : []),
        { property: "og:title", content: page.seo_title ?? page.title },
        ...(page.hero_image_url ? [{ property: "og:image", content: page.hero_image_url }] : []),
      ],
    };
  },
  component: CmsPage,
});

function CmsPage() {
  const { section } = Route.useParams();
  const { page, siblings, resolved } = Route.useLoaderData();
  const def = sectionDef(section)!;
  const hasSidebar = siblings.length > 1;

  return (
    <>
      {page.status !== "published" && (
        <div className="bg-amber-100 px-4 py-2 text-center text-sm font-semibold text-amber-900">
          <Eye className="mr-1.5 inline size-4" aria-hidden="true" />
          Preview — this page is a draft and isn't visible to the public.
        </div>
      )}
      <PageHero
        eyebrow={def.label}
        title={page.title}
        summary={page.summary}
        imageUrl={page.hero_image_url}
        crumbs={[{ label: def.label, href: def.path }, { label: page.title }]}
      />
      <div className={cn("mx-auto max-w-7xl px-4 py-12 md:px-8 md:py-16", hasSidebar && "lg:grid lg:grid-cols-[250px_minmax(0,1fr)] lg:gap-12")}>
        {hasSidebar && (
          <aside className="mb-10 lg:mb-0">
            <nav aria-label={`${def.label} pages`} className="lg:sticky lg:top-28">
              <p className="mb-3 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">In {def.label}</p>
              <ul className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col lg:gap-0.5 lg:border-l-2 lg:border-border">
                {siblings.map((s) => {
                  const active = s.slug === page.slug;
                  return (
                    <li key={s.slug} className="shrink-0">
                      <SmartLink
                        href={`${def.path}/${s.slug}`}
                        className={cn(
                          "block rounded-full px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors lg:-ml-0.5 lg:rounded-none lg:border-l-2 lg:py-2.5 lg:whitespace-normal",
                          active
                            ? "bg-primary text-white lg:border-brand-green lg:bg-secondary lg:font-semibold lg:text-primary"
                            : "bg-secondary text-slate-700 hover:text-primary lg:border-transparent lg:bg-transparent lg:hover:border-slate-300",
                        )}
                      >
                        {s.title}
                      </SmartLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </aside>
        )}
        <article className="min-w-0 space-y-14">
          {page.body && <RichContent html={page.body} className="prose-lg" />}
          <PageBlocks blocks={page.blocks} resolved={resolved} />
        </article>
      </div>
    </>
  );
}
