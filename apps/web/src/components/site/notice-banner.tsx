import { useEffect, useState } from "react";
import { ChevronRight, Info, X } from "lucide-react";
import { useSiteLayout } from "#/lib/site-layout";
import { SmartLink } from "./smart-link";

// The site-wide notice set in Admin → Settings → Notice. Dismissal is
// remembered per notice (keyed by its title) in this browser only.
export function NoticeBanner() {
  const { notice } = useSiteLayout();
  const storageKey = notice ? `aka-notice-dismissed:${notice.title}` : "";
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    try {
      setDismissed(localStorage.getItem(storageKey) === "1");
    } catch {
      // Storage blocked — just show the notice.
    }
  }, [storageKey]);

  if (!notice || dismissed) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      localStorage.setItem(storageKey, "1");
    } catch {
      // ignore
    }
  };

  return (
    <div
      className="relative border-b border-amber-200/70 bg-amber-50"
      role="region"
      aria-label="Notice"
    >
      <div className="mx-auto flex max-w-7xl flex-col gap-3 py-3 pr-14 pl-4 md:flex-row md:items-center md:justify-between md:px-8 md:pr-16">
        <div className="flex min-w-0 items-start gap-3">
          <Info className="mt-0.5 size-5 shrink-0 text-amber-700" aria-hidden="true" />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {notice.label && (
                <span className="rounded-full bg-amber-200/70 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                  {notice.label}
                </span>
              )}
              <p className="text-[15px] font-bold text-slate-900">{notice.title}</p>
            </div>
            {notice.text && <p className="mt-0.5 text-[13px] text-slate-600">{notice.text}</p>}
          </div>
        </div>
        {notice.linkUrl && (
          <SmartLink
            href={notice.linkUrl}
            className="inline-flex w-fit shrink-0 items-center gap-1 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            {notice.linkLabel || "Read more"}
            <ChevronRight className="size-4" aria-hidden="true" />
          </SmartLink>
        )}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss notice"
        className="absolute top-3 right-3 rounded-full p-1.5 text-slate-500 transition-colors hover:bg-black/5 md:right-6"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}
