import { cn } from "#/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  intro,
  align = "center",
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  align?: "center" | "left";
  tone?: "light" | "dark";
  className?: string;
}) {
  return (
    <div className={cn(align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl", className)}>
      {eyebrow && (
        <p className={cn("text-xs font-bold tracking-[0.18em] uppercase", tone === "dark" ? "text-brand-sky" : "text-brand-green")}>
          {eyebrow}
        </p>
      )}
      <h2 className={cn("mt-2 text-3xl font-extrabold tracking-tight text-balance md:text-4xl", tone === "dark" ? "text-white" : "text-primary")}>
        {title}
      </h2>
      {intro && (
        <p className={cn("mt-3 text-base leading-relaxed md:text-lg", tone === "dark" ? "text-white/75" : "text-muted-foreground")}>
          {intro}
        </p>
      )}
    </div>
  );
}
