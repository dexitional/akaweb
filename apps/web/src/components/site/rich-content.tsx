import { cn } from "#/lib/utils";

// Renders rich text from the CMS. The HTML is always sanitised on the server
// (server/api/lib/rich-text.ts) before it reaches the browser — never pass
// unsanitised HTML here.
export function RichContent({ html, className }: { html: string; className?: string }) {
  return (
    <div
      className={cn(
        "prose prose-slate max-w-none prose-headings:font-extrabold prose-headings:tracking-tight prose-headings:text-primary",
        "prose-a:font-semibold prose-a:text-primary prose-a:decoration-brand-green/50 prose-a:underline-offset-2 hover:prose-a:decoration-brand-green",
        "prose-blockquote:border-l-brand-green prose-blockquote:text-slate-700 prose-strong:text-slate-900",
        "prose-img:rounded-xl prose-li:marker:text-brand-green prose-table:text-sm prose-th:bg-secondary prose-th:px-3 prose-td:px-3",
        className,
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
