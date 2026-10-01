import { useState } from "react";
import { Check, Download, Share2 } from "lucide-react";
import { buildVCard, vCardFileName } from "#/lib/vcard";

interface ProfileActionsProps {
  slug: string;
  name: string;
  role?: string;
  departmentName?: string;
  organization: string;
  email?: string;
  phone?: string;
}

function trackShare(slug: string) {
  fetch("/api/directory/track-share", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ slug }),
  }).catch(() => {
    // Tracking is best-effort; the action itself already succeeded.
  });
}

export function ProfileActions({
  slug,
  name,
  role,
  departmentName,
  organization,
  email,
  phone,
}: ProfileActionsProps) {
  const [justShared, setJustShared] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  function handleSaveVCard() {
    const url = typeof window !== "undefined" ? window.location.href : undefined;
    const vcard = buildVCard({
      name,
      title: role,
      organization: departmentName ? `${organization};${departmentName}` : organization,
      email,
      phone,
      url,
    });

    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = vCardFileName(name);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);

    setJustSaved(true);
    setTimeout(() => setJustSaved(false), 2000);
    trackShare(slug);
  }

  async function handleShare() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      // Not every browser has the share sheet (or, over plain http, the clipboard).
      const nav: Partial<Navigator> = navigator;
      if (nav.share) {
        await nav.share({ title: name, url });
      } else if (nav.clipboard) {
        await nav.clipboard.writeText(url);
      }
    } catch {
      // User cancelled the share sheet — not an error, don't track it.
      return;
    }

    setJustShared(true);
    setTimeout(() => setJustShared(false), 2000);
    trackShare(slug);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={handleSaveVCard}
        className="btn-accent focus-ring rounded-full px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
      >
        {justSaved ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            Saved
          </>
        ) : (
          <>
            <Download className="h-4 w-4" aria-hidden="true" />
            Save vCard
          </>
        )}
      </button>
      <button
        type="button"
        onClick={handleShare}
        className="btn-ghost focus-ring rounded-full px-4 py-2 text-sm font-semibold inline-flex items-center gap-2"
      >
        {justShared ? (
          <>
            <Check className="h-4 w-4" aria-hidden="true" />
            Copied
          </>
        ) : (
          <>
            <Share2 className="h-4 w-4" aria-hidden="true" />
            Share
          </>
        )}
      </button>
    </div>
  );
}
