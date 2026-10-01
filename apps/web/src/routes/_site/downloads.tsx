import { useEffect, useState } from "react";
import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { Search } from "lucide-react";
import { getDocumentList } from "#/server/public";
import { DOCUMENT_CATEGORIES } from "#/lib/content";
import { cn } from "#/lib/utils";
import { PageHero } from "#/components/site/page-hero";
import { DocumentList } from "#/components/site/document-list";
import { EmptyState } from "#/components/site/empty-state";
import { Pager } from "#/components/site/pager";

const searchSchema = z.object({
  page: z.number().int().min(1).optional().catch(undefined),
  category: z.string().max(40).optional().catch(undefined),
  q: z.string().max(100).optional().catch(undefined),
});

export const Route = createFileRoute("/_site/downloads")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ deps }) => getDocumentList({ data: deps }),
  head: () => ({ meta: [{ title: "Guides & Downloads | Akatsi College of Education" }] }),
  component: DownloadsPage,
});

function DownloadsPage() {
  const search = Route.useSearch();
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const [q, setQ] = useState(search.q ?? "");
  useEffect(() => setQ(search.q ?? ""), [search.q]);
  const totalAll = Object.values(data.categories).reduce((a, b) => a + b, 0);

  return (
    <>
      <PageHero
        eyebrow="News & Media"
        title="Guides & Downloads"
        summary="Forms, handbooks, policies, guides and academic calendars from Akatsi College of Education."
        crumbs={[{ label: "News & Media", href: "/news" }, { label: "Guides & Downloads" }]}
        compact
      >
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ to: "/downloads", search: { ...search, q: q.trim() || undefined, page: undefined } });
          }}
          className="mt-8 flex max-w-xl items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-lg"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search documents…"
            aria-label="Search documents"
            className="min-w-0 flex-1 bg-transparent py-2 text-[15px] text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button type="submit" className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white hover:bg-primary-dark">
            Search
          </button>
        </form>
      </PageHero>

      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[240px_minmax(0,1fr)]">
        <nav aria-label="Document categories">
          <p className="mb-3 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">Categories</p>
          <ul className="no-scrollbar flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
            {[{ key: undefined as string | undefined, label: "All documents", count: totalAll }, ...DOCUMENT_CATEGORIES.map((c) => ({ key: c.key, label: c.label, count: data.categories[c.key] ?? 0 }))]
              .filter((c) => c.key === undefined || c.count > 0)
              .map((c) => {
                const active = search.category === c.key;
                return (
                  <li key={c.label} className="shrink-0">
                    <Link
                      to="/downloads"
                      search={{ ...search, category: c.key, page: undefined }}
                      className={cn(
                        "flex items-center justify-between gap-3 rounded-xl px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors",
                        active ? "bg-primary text-white" : "bg-secondary text-slate-700 hover:text-primary lg:bg-transparent lg:hover:bg-secondary",
                      )}
                    >
                      {c.label}
                      <span className={cn("text-xs", active ? "text-white/70" : "text-muted-foreground")}>{c.count}</span>
                    </Link>
                  </li>
                );
              })}
          </ul>
        </nav>
        <div>
          {data.items.length === 0 ? (
            <EmptyState title="No documents found" text={search.q ? `Nothing matches “${search.q}”.` : "Documents will appear here once published."} />
          ) : (
            <DocumentList documents={data.items} showCategory={!search.category} />
          )}
          <Pager
            page={search.page ?? 1}
            total={data.total}
            pageSize={data.pageSize}
            renderLink={(n, props) => <Link to="/downloads" search={{ ...search, page: n === 1 ? undefined : n }} {...props} />}
          />
        </div>
      </div>
    </>
  );
}
