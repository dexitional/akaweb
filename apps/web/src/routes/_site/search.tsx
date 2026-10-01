import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { z } from "zod";
import { ArrowRight, Search } from "lucide-react";
import { searchSite } from "#/server/public";
import { formatDate } from "#/lib/format";
import { PageHero } from "#/components/site/page-hero";
import { EmptyState } from "#/components/site/empty-state";
import { SmartLink } from "#/components/site/smart-link";

export const Route = createFileRoute("/_site/search")({
  validateSearch: z.object({ q: z.string().max(100).catch("") }),
  loaderDeps: ({ search }) => ({ q: search.q }),
  loader: ({ deps }) => searchSite({ data: { q: deps.q } }),
  head: () => ({ meta: [{ title: "Search | Akatsi College of Education" }, { name: "robots", content: "noindex" }] }),
  component: SearchPage,
});

const KIND_STYLES: Record<string, string> = {
  Page: "bg-secondary text-primary",
  News: "bg-sky-50 text-sky-700",
  Event: "bg-emerald-50 text-brand-green",
  Announcement: "bg-amber-50 text-amber-800",
  Department: "bg-indigo-50 text-indigo-700",
  Unit: "bg-indigo-50 text-indigo-700",
  Download: "bg-red-50 text-brand-flame",
};

function SearchPage() {
  const { q } = Route.useSearch();
  const results = Route.useLoaderData();
  const navigate = useNavigate();
  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);
  const kinds = Array.from(new Set(results.map((r) => r.kind)));
  const [filter, setFilter] = useState<string | null>(null);
  useEffect(() => setFilter(null), [q]);
  const visible = filter ? results.filter((r) => r.kind === filter) : results;

  return (
    <>
      <PageHero title="Search" crumbs={[{ label: "Search" }]} compact>
        <form
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            void navigate({ to: "/search", search: { q: term.trim() } });
          }}
          className="mt-6 flex max-w-2xl items-center gap-2 rounded-full bg-white p-1.5 pl-5 shadow-lg"
        >
          <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <input
            autoFocus
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="What are you looking for?"
            aria-label="Search the website"
            className="min-w-0 flex-1 bg-transparent py-2.5 text-base text-slate-900 outline-none placeholder:text-slate-400"
          />
          <button type="submit" className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark">
            Search
          </button>
        </form>
      </PageHero>
      <div className="mx-auto max-w-4xl px-4 py-12 md:py-16">
        {q.trim().length < 2 ? (
          <EmptyState title="Start typing to search" text="Search across pages, news, events, announcements, departments and downloads." />
        ) : results.length === 0 ? (
          <EmptyState title={`No results for “${q}”`} text="Try different or fewer words." />
        ) : (
          <>
            <div className="mb-6 flex flex-wrap items-center gap-2">
              <p className="mr-2 text-sm text-muted-foreground">
                {results.length} result{results.length === 1 ? "" : "s"} for <strong className="text-slate-900">“{q}”</strong>
              </p>
              {kinds.length > 1 &&
                [null, ...kinds].map((k) => (
                  <button
                    key={k ?? "all"}
                    type="button"
                    onClick={() => setFilter(k)}
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${filter === k ? "bg-primary text-white" : "bg-secondary text-slate-700 hover:text-primary"}`}
                  >
                    {k ?? "All"}
                  </button>
                ))}
            </div>
            <ul className="space-y-3">
              {visible.map((r) => (
                <li key={`${r.kind}-${r.href}`}>
                  <SmartLink href={r.href} className="group block rounded-2xl border border-border bg-white p-5 transition-all hover:border-primary/30 hover:shadow-md">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`rounded-full px-2.5 py-0.5 font-semibold ${KIND_STYLES[r.kind] ?? ""}`}>{r.kind}</span>
                      {r.date && <span className="text-muted-foreground">{formatDate(r.date)}</span>}
                    </div>
                    <p className="mt-2 flex items-center justify-between gap-3 text-lg font-bold text-slate-900 group-hover:text-primary">
                      {r.title}
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" aria-hidden="true" />
                    </p>
                    {r.snippet && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{r.snippet}</p>}
                  </SmartLink>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </>
  );
}
