import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "#/lib/utils";

// Numbered pagination for public listings. Each listing route passes a
// renderer for its own typed <Link>.
export function Pager({
  page,
  total,
  pageSize,
  renderLink,
}: {
  page: number;
  total: number;
  pageSize: number;
  renderLink: (page: number, props: { className: string; children: React.ReactNode; "aria-label"?: string; "aria-current"?: "page" }) => React.ReactNode;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;

  const numbers: Array<number | "gap"> = [];
  for (let n = 1; n <= pages; n++) {
    if (n === 1 || n === pages || Math.abs(n - page) <= 1) numbers.push(n);
    else if (numbers[numbers.length - 1] !== "gap") numbers.push("gap");
  }

  const base = "flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-semibold transition-colors";
  return (
    <nav aria-label="Pagination" className="mt-12 flex items-center justify-center gap-1.5">
      {page > 1 &&
        renderLink(page - 1, {
          className: cn(base, "border border-border bg-white text-slate-700 hover:border-primary hover:text-primary"),
          "aria-label": "Previous page",
          children: <ChevronLeft className="size-4" aria-hidden="true" />,
        })}
      {numbers.map((n, i) =>
        n === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-muted-foreground">
            …
          </span>
        ) : (
          <span key={n}>
            {renderLink(n, {
              className: cn(base, n === page ? "bg-primary text-white" : "border border-border bg-white text-slate-700 hover:border-primary hover:text-primary"),
              "aria-current": n === page ? "page" : undefined,
              children: n,
            })}
          </span>
        ),
      )}
      {page < pages &&
        renderLink(page + 1, {
          className: cn(base, "border border-border bg-white text-slate-700 hover:border-primary hover:text-primary"),
          "aria-label": "Next page",
          children: <ChevronRight className="size-4" aria-hidden="true" />,
        })}
    </nav>
  );
}
