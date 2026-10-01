import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { getSectionData } from "#/server/public";
import { sectionDef } from "#/lib/content";
import { legacyRedirect } from "#/lib/legacy-redirects";
import { useSiteLayout } from "#/lib/site-layout";
import { PageHero } from "#/components/site/page-hero";
import { CoverImage } from "#/components/site/cover-image";
import { EmptyState } from "#/components/site/empty-state";
import { SmartLink } from "#/components/site/smart-link";

// Landing page for a CMS section (/about, /academics, ...): every published
// page in the section as a card.
export const Route = createFileRoute("/_site/$section/")({
  beforeLoad: ({ params }) => {
    if (!sectionDef(params.section)) {
      // Old WordPress URLs (/history-of-akatsicoe/, /departments/languages/, ...).
      const target = legacyRedirect(`/${params.section}`);
      if (target) throw redirect({ href: target, statusCode: 301 });
      throw notFound();
    }
  },
  loader: ({ params }) => getSectionData({ data: { section: params.section } }),
  head: ({ params }) => ({
    meta: [{ title: `${sectionDef(params.section)?.label ?? "Page"} | Akatsi College of Education` }],
  }),
  component: SectionPage,
});

function SectionPage() {
  const { section } = Route.useParams();
  const { pages } = Route.useLoaderData();
  const { settings } = useSiteLayout();
  const def = sectionDef(section)!;
  const custom = settings.sections[def.key];

  return (
    <>
      <PageHero
        eyebrow={def.eyebrow}
        title={def.label}
        summary={custom.intro || def.intro}
        imageUrl={custom.imageUrl || null}
        crumbs={[{ label: def.label }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-14 md:px-8 md:py-20">
        {pages.length === 0 ? (
          <EmptyState title="Content is on its way" text="Pages for this section haven't been published yet." />
        ) : (
          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {pages.map((page, i) => (
              <li key={page.id}>
                <SmartLink
                  href={`${def.path}/${page.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
                >
                  <div className="relative">
                    <CoverImage src={page.hero_image_url} className="aspect-[16/9]" imgClassName="transition-transform duration-500 group-hover:scale-105" />
                    <span className="absolute top-4 left-4 flex size-9 items-center justify-center rounded-full bg-white/95 text-sm font-extrabold text-primary shadow">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <h2 className="text-xl font-bold text-slate-900 group-hover:text-primary">{page.title}</h2>
                    {page.summary && <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{page.summary}</p>}
                    <span className="mt-auto flex items-center gap-1 pt-5 text-sm font-semibold text-brand-green">
                      Read more
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                    </span>
                  </div>
                </SmartLink>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}
