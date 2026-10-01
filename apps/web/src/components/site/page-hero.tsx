import { ChevronRight, Home } from "lucide-react";
import { cn } from "#/lib/utils";
import { SmartLink } from "./smart-link";
import { OptimizedImage } from "#/components/site/optimized-image";

export interface Crumb {
  label: string;
  href?: string;
}

// The navy title band at the top of every inner page, with an optional
// photo washed in behind it.
export function PageHero({
  eyebrow,
  title,
  summary,
  imageUrl,
  crumbs,
  children,
  compact = false,
}: {
  eyebrow?: string;
  title: string;
  summary?: string | null;
  imageUrl?: string | null;
  crumbs: Array<Crumb>;
  children?: React.ReactNode;
  compact?: boolean;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-primary text-white">
      {imageUrl ? (
        <>
          <OptimizedImage
            src={imageUrl}
            alt=""
            sizes="100vw"
            quality={60}
            priority
            className="absolute inset-0 -z-20 size-full object-cover"
          />
          <div
            className="absolute inset-0 -z-10 bg-gradient-to-r from-primary-dark via-primary/90 to-primary/55"
            aria-hidden="true"
          />
        </>
      ) : (
        <>
          <div className="dot-grid absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
          <div
            className="absolute -top-24 -right-24 -z-10 size-[420px] rounded-full bg-brand-sky/15 blur-3xl"
            aria-hidden="true"
          />
        </>
      )}
      <div
        className={cn(
          "mx-auto max-w-7xl px-4 md:px-8",
          compact ? "py-10 md:py-12" : "py-14 md:py-20",
        )}
      >
        <Breadcrumbs crumbs={crumbs} />
        {eyebrow && (
          <p className="mt-6 text-xs font-bold tracking-[0.18em] text-brand-sky uppercase">
            {eyebrow}
          </p>
        )}
        <h1
          className={cn(
            "max-w-4xl font-extrabold tracking-tight text-balance",
            eyebrow ? "mt-2" : "mt-6",
            compact ? "text-3xl md:text-4xl" : "text-4xl md:text-5xl",
          )}
        >
          {title}
        </h1>
        {summary && (
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-white/80 md:text-lg">
            {summary}
          </p>
        )}
        {children}
      </div>
    </section>
  );
}

export function Breadcrumbs({ crumbs }: { crumbs: Array<Crumb> }) {
  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-1.5 text-[13px] text-white/70">
        <li>
          <SmartLink href="/" className="flex items-center gap-1 hover:text-white">
            <Home className="size-3.5" aria-hidden="true" />
            Home
          </SmartLink>
        </li>
        {crumbs.map((crumb) => (
          <li key={crumb.label} className="flex items-center gap-1.5">
            <ChevronRight className="size-3.5 text-white/40" aria-hidden="true" />
            {crumb.href ? (
              <SmartLink href={crumb.href} className="hover:text-white">
                {crumb.label}
              </SmartLink>
            ) : (
              <span aria-current="page" className="font-medium text-white">
                {crumb.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
