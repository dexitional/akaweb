import { BookMarked, Mail, MapPin, Phone } from "lucide-react";
import type { DepartmentKind, DepartmentRow, PersonRow } from "@aka/db";
import { DEPARTMENT_KINDS } from "#/lib/content";
import { initials } from "#/lib/format";
import { cn } from "#/lib/utils";
import { PageHero } from "./page-hero";
import { RichContent } from "./rich-content";
import { PeopleGrid } from "./person-card";
import { SmartLink } from "./smart-link";
import { OptimizedImage } from "#/components/site/optimized-image";

export function DepartmentPage({
  kind,
  department,
  people,
  siblings,
}: {
  kind: DepartmentKind;
  department: DepartmentRow & { programmes: Array<string> };
  people: Array<PersonRow>;
  siblings: Array<Pick<DepartmentRow, "slug" | "name">>;
}) {
  const meta = DEPARTMENT_KINDS[kind];
  const contact = [
    {
      icon: Mail,
      value: department.email,
      href: department.email ? `mailto:${department.email}` : undefined,
    },
    {
      icon: Phone,
      value: department.phone,
      href: department.phone ? `tel:${department.phone}` : undefined,
    },
    { icon: MapPin, value: department.location },
  ].filter((c) => c.value);

  return (
    <>
      <PageHero
        eyebrow={meta.label}
        title={department.name}
        summary={department.summary}
        imageUrl={department.image_url}
        crumbs={[
          { label: "Academics", href: "/academics" },
          { label: meta.plural, href: `/academics/${kind === "unit" ? "units" : "departments"}` },
          { label: department.name },
        ]}
      />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-12 md:px-8 md:py-16 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="min-w-0 space-y-12">
          {department.body ? (
            <RichContent html={department.body} className="prose-lg" />
          ) : (
            department.summary && (
              <p className="text-lg leading-relaxed text-slate-700">{department.summary}</p>
            )
          )}

          {department.programmes.length > 0 && (
            <section>
              <h2 className="mb-5 text-2xl font-extrabold text-primary">Programmes offered</h2>
              <ul className="grid gap-3 sm:grid-cols-2">
                {department.programmes.map((p) => (
                  <li
                    key={p}
                    className="flex items-start gap-3 rounded-xl border border-border bg-white p-4"
                  >
                    <BookMarked
                      className="mt-0.5 size-5 shrink-0 text-brand-green"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-slate-800">{p}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {people.length > 0 && (
            <section>
              <h2 className="mb-5 text-2xl font-extrabold text-primary">Our staff</h2>
              <PeopleGrid people={people} layout={people.length > 8 ? "list" : "grid"} />
            </section>
          )}
        </article>

        <aside className="space-y-6">
          {department.head_name && (
            <div className="overflow-hidden rounded-2xl border border-border bg-white">
              <div className="bg-primary px-5 py-3 text-xs font-bold tracking-[0.14em] text-brand-sky uppercase">
                Head of {meta.label.toLowerCase()}
              </div>
              <div className="flex items-center gap-4 p-5">
                {department.head_photo_url ? (
                  <OptimizedImage
                    src={department.head_photo_url}
                    alt=""
                    sizes="64px"
                    className="size-16 rounded-full object-cover"
                  />
                ) : (
                  <span className="flex size-16 items-center justify-center rounded-full bg-secondary text-lg font-extrabold text-primary">
                    {initials(department.head_name)}
                  </span>
                )}
                <div>
                  <p className="font-bold text-slate-900">{department.head_name}</p>
                  {department.head_title && (
                    <p className="text-sm text-muted-foreground">{department.head_title}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {contact.length > 0 && (
            <div className="space-y-3 rounded-2xl border border-border bg-white p-5">
              <p className="text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
                Contact
              </p>
              {contact.map((c) => (
                <p key={String(c.value)} className="flex items-start gap-3 text-sm">
                  <c.icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                  {c.href ? (
                    <a
                      href={c.href}
                      className="font-medium break-all text-slate-800 hover:text-primary"
                    >
                      {c.value}
                    </a>
                  ) : (
                    <span className="font-medium text-slate-800">{c.value}</span>
                  )}
                </p>
              ))}
            </div>
          )}

          {siblings.length > 1 && (
            <nav aria-label={meta.plural} className="rounded-2xl bg-secondary p-5">
              <p className="mb-3 text-xs font-bold tracking-[0.14em] text-muted-foreground uppercase">
                {meta.plural}
              </p>
              <ul className="space-y-0.5">
                {siblings.map((s) => (
                  <li key={s.slug}>
                    <SmartLink
                      href={`/academics/${kind === "unit" ? "units" : "departments"}/${s.slug}`}
                      className={cn(
                        "block rounded-lg px-3 py-2 text-sm transition-colors",
                        s.slug === department.slug
                          ? "bg-white font-semibold text-primary shadow-sm"
                          : "text-slate-700 hover:bg-white/60 hover:text-primary",
                      )}
                    >
                      {s.name}
                    </SmartLink>
                  </li>
                ))}
              </ul>
            </nav>
          )}
        </aside>
      </div>
    </>
  );
}
