import { cn } from "#/lib/utils";

export interface LegalSection {
  id: string;
  title: string;
  body: React.ReactNode;
}

// Long-form policy text (app privacy policy, terms): a numbered table of
// contents beside the document on large screens, same typography as CMS pages.
export function LegalDocument({
  updated,
  intro,
  sections,
}: {
  updated: string;
  intro: React.ReactNode;
  sections: Array<LegalSection>;
}) {
  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[260px_minmax(0,1fr)]">
      <nav aria-label="On this page" className="lg:sticky lg:top-28 lg:self-start">
        <p className="mb-3 text-xs font-bold tracking-[0.16em] text-muted-foreground uppercase">
          On this page
        </p>
        <ol className="flex flex-col gap-1 border-l border-border text-sm">
          {sections.map((s, i) => (
            <li key={s.id}>
              <a
                href={`#${s.id}`}
                className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-slate-600 hover:border-brand-green hover:text-primary"
              >
                <span className="mr-1.5 text-muted-foreground tabular-nums">{i + 1}.</span>
                {s.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      <article
        className={cn(
          "prose prose-slate max-w-3xl prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-primary",
          "prose-a:font-semibold prose-a:text-primary prose-a:decoration-brand-green/50 prose-a:underline-offset-2 hover:prose-a:decoration-brand-green",
          "prose-strong:text-slate-900 prose-li:marker:text-brand-green",
        )}
      >
        <p className="not-prose mb-8 inline-flex rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-slate-600">
          Last updated: {updated}
        </p>
        <div className="lead">{intro}</div>
        {sections.map((s, i) => (
          <section key={s.id} id={s.id} className="scroll-mt-28">
            <h2>
              {i + 1}. {s.title}
            </h2>
            {s.body}
          </section>
        ))}
      </article>
    </div>
  );
}
