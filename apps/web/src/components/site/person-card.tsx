import { useState } from "react";
import { Mail, Phone } from "lucide-react";
import type { PersonRow } from "@aka/db";
import { initials } from "#/lib/format";
import { cn } from "#/lib/utils";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "#/components/ui/dialog.tsx";
import { OptimizedImage } from "#/components/site/optimized-image";

type Person = PersonRow & { department_name?: string | null };

function Portrait({
  person,
  className,
  sizes,
}: {
  person: Person;
  className?: string;
  sizes: string;
}) {
  return person.photo_url ? (
    <OptimizedImage
      src={person.photo_url}
      alt={person.name}
      sizes={sizes}
      className={cn("object-cover", className)}
    />
  ) : (
    <div
      className={cn(
        "flex items-center justify-center bg-gradient-to-br from-primary to-primary-dark font-extrabold text-brand-sky",
        className,
      )}
      aria-hidden="true"
    >
      {initials(person.name)}
    </div>
  );
}

export function PeopleGrid({
  people,
  layout = "grid",
}: {
  people: Array<Person>;
  layout?: "grid" | "list";
}) {
  const [open, setOpen] = useState<Person | null>(null);
  if (people.length === 0) return null;

  return (
    <>
      {layout === "grid" ? (
        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-4">
          {people.map((p, i) => (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => setOpen(p)}
                className={cn(
                  "group w-full overflow-hidden rounded-2xl border border-border bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10",
                  i === 0 && people.length > 2 && "ring-2 ring-brand-green/30",
                )}
              >
                <Portrait
                  person={p}
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
                  className="aspect-[4/5] w-full text-4xl transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="border-t-4 border-brand-green p-4">
                  <p className="font-bold text-slate-900 group-hover:text-primary">{p.name}</p>
                  <p className="mt-0.5 text-sm text-muted-foreground">{p.title}</p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
          {people.map((p) => (
            <li key={p.id} className="flex items-center gap-4 px-5 py-4">
              <Portrait person={p} sizes="56px" className="size-14 shrink-0 rounded-full text-lg" />
              <div className="min-w-0 flex-1">
                <p className="font-bold text-slate-900">{p.name}</p>
                <p className="text-sm text-muted-foreground">
                  {p.title}
                  {p.department_name && ` · ${p.department_name}`}
                </p>
              </div>
              <div className="hidden gap-2 sm:flex">
                {p.email && (
                  <a
                    href={`mailto:${p.email}`}
                    aria-label={`Email ${p.name}`}
                    className="rounded-full bg-secondary p-2.5 text-primary hover:bg-primary hover:text-white"
                  >
                    <Mail className="size-4" aria-hidden="true" />
                  </a>
                )}
                {p.phone && (
                  <a
                    href={`tel:${p.phone}`}
                    aria-label={`Call ${p.name}`}
                    className="rounded-full bg-secondary p-2.5 text-primary hover:bg-primary hover:text-white"
                  >
                    <Phone className="size-4" aria-hidden="true" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={open !== null} onOpenChange={(v) => !v && setOpen(null)}>
        {open && (
          <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-2xl">
            <div className="grid sm:grid-cols-[220px_1fr]">
              <Portrait
                person={open}
                sizes="(min-width: 640px) 320px, 100vw"
                className="aspect-[4/5] w-full text-5xl sm:h-full"
              />
              <div className="p-6">
                <DialogTitle className="text-2xl font-extrabold text-primary">
                  {open.name}
                </DialogTitle>
                <DialogDescription className="mt-1 font-semibold text-brand-green">
                  {open.title}
                </DialogDescription>
                {open.department_name && (
                  <p className="mt-1 text-sm text-muted-foreground">{open.department_name}</p>
                )}
                {open.bio ? (
                  <p className="mt-4 max-h-72 overflow-y-auto text-sm leading-relaxed whitespace-pre-line text-slate-700">
                    {open.bio}
                  </p>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No profile has been added yet.
                  </p>
                )}
                <div className="mt-5 flex flex-wrap gap-2 text-sm">
                  {open.email && (
                    <a
                      href={`mailto:${open.email}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-medium text-primary hover:bg-primary hover:text-white"
                    >
                      <Mail className="size-3.5" aria-hidden="true" />
                      {open.email}
                    </a>
                  )}
                  {open.phone && (
                    <a
                      href={`tel:${open.phone}`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 font-medium text-primary hover:bg-primary hover:text-white"
                    >
                      <Phone className="size-3.5" aria-hidden="true" />
                      {open.phone}
                    </a>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}
