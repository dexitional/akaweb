import { Download, FileSpreadsheet, FileText, FileType2, Presentation } from "lucide-react";
import type { DocumentRow } from "@aka/db";
import { documentCategoryLabel } from "#/lib/content";
import { formatBytes, formatDate } from "#/lib/format";

function fileMeta(doc: Pick<DocumentRow, "mime_type" | "file_url">) {
  const ext = (doc.file_url.split(".").pop() ?? "").toLowerCase();
  if (ext === "pdf") return { icon: FileText, label: "PDF", tone: "bg-red-50 text-brand-flame" };
  if (ext === "doc" || ext === "docx")
    return { icon: FileType2, label: "Word", tone: "bg-blue-50 text-blue-700" };
  if (ext === "xls" || ext === "xlsx")
    return { icon: FileSpreadsheet, label: "Excel", tone: "bg-emerald-50 text-brand-green" };
  if (ext === "ppt" || ext === "pptx")
    return { icon: Presentation, label: "Slides", tone: "bg-orange-50 text-orange-700" };
  return { icon: FileText, label: ext.toUpperCase() || "File", tone: "bg-secondary text-primary" };
}

export function downloadHref(doc: Pick<DocumentRow, "id">) {
  return `/api/public/documents/${doc.id}/download`;
}

export function DocumentList({
  documents,
  showCategory = true,
}: {
  documents: Array<DocumentRow>;
  showCategory?: boolean;
}) {
  return (
    <ul className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
      {documents.map((doc) => {
        const meta = fileMeta(doc);
        return (
          <li key={doc.id}>
            <a
              href={downloadHref(doc)}
              target="_blank"
              rel="noopener"
              className="group flex items-center gap-4 px-5 py-4 transition-colors hover:bg-secondary/60"
            >
              <span
                className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${meta.tone}`}
              >
                <meta.icon className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-slate-900 group-hover:text-primary">
                  {doc.title}
                </span>
                {doc.description && (
                  <span className="mt-0.5 line-clamp-1 block text-sm text-muted-foreground">
                    {doc.description}
                  </span>
                )}
                <span className="mt-1 flex flex-wrap gap-x-3 text-xs text-muted-foreground">
                  {showCategory && <span>{documentCategoryLabel(doc.category)}</span>}
                  <span>{meta.label}</span>
                  {doc.size_bytes ? <span>{formatBytes(doc.size_bytes)}</span> : null}
                  <span>{formatDate(doc.published_on)}</span>
                </span>
              </span>
              <span className="hidden items-center gap-1.5 rounded-full border border-border px-3.5 py-2 text-sm font-semibold text-primary transition-colors group-hover:border-primary group-hover:bg-primary group-hover:text-white sm:flex">
                <Download className="size-4" aria-hidden="true" />
                Download
              </span>
            </a>
          </li>
        );
      })}
    </ul>
  );
}
