import { Download } from "lucide-react";
import { cn } from "#/lib/utils";

const PlayIcon = () => (
  <svg viewBox="0 0 24 24" className="size-7" aria-hidden="true">
    <path fill="#34A853" d="M3.6 1.8 13.5 12l-9.9 10.2c-.4-.2-.6-.7-.6-1.2V3c0-.5.2-1 .6-1.2Z" />
    <path fill="#FBBC04" d="m17 8.4-3.5 3.6L17 15.6l3.9-2.2c1.1-.6 1.1-2.2 0-2.8L17 8.4Z" />
    <path fill="#4285F4" d="M3.6 1.8c.4-.2.9-.2 1.4.1L17 8.4 13.5 12 3.6 1.8Z" />
    <path fill="#EA4335" d="M13.5 12 17 15.6 5 22.1c-.5.3-1 .3-1.4.1L13.5 12Z" />
  </svg>
);

const AppleIcon = () => (
  <svg viewBox="0 0 24 24" className="size-7 fill-current" aria-hidden="true">
    <path d="M16.4 12.6c0-2.6 2.1-3.8 2.2-3.9-1.2-1.8-3.1-2-3.7-2-1.6-.2-3.1.9-3.9.9-.8 0-2-.9-3.4-.9-1.7 0-3.3 1-4.2 2.6-1.8 3.1-.5 7.7 1.3 10.2.9 1.2 1.9 2.6 3.2 2.6 1.3-.1 1.8-.8 3.3-.8 1.6 0 2 .8 3.4.8 1.4 0 2.3-1.3 3.1-2.5 1-1.4 1.4-2.8 1.4-2.9 0 0-2.7-1-2.7-4.1ZM13.8 5c.7-.9 1.2-2.1 1.1-3.3-1 0-2.3.7-3 1.6-.7.8-1.2 2-1.1 3.2 1.2.1 2.3-.6 3-1.5Z" />
  </svg>
);

type Store = "play" | "apple" | "apk";

const META: Record<Store, { top: string; label: string }> = {
  play: { top: "Get it on", label: "Google Play" },
  apple: { top: "Download on the", label: "App Store" },
  apk: { top: "Download the", label: "Android APK" },
};

// A store badge-style button; without an href it renders as "Coming soon".
export function StoreButton({
  store,
  href,
  className,
  download,
}: {
  store: Store;
  href?: string | null;
  className?: string;
  download?: boolean;
}) {
  const m = META[store];
  const icon = store === "play" ? <PlayIcon /> : store === "apple" ? <AppleIcon /> : <Download className="size-7" aria-hidden="true" />;
  const body = (
    <>
      {icon}
      <span className="flex flex-col text-left leading-tight">
        <span className="text-[11px] font-medium opacity-80">{href ? m.top : "Coming soon to"}</span>
        <span className="text-lg font-bold tracking-tight">{m.label}</span>
      </span>
    </>
  );
  const base = "inline-flex min-w-52 items-center gap-3 rounded-2xl px-5 py-3 transition-transform";
  if (!href) {
    return (
      <span className={cn(base, "cursor-default bg-white/10 text-white/70 ring-1 ring-white/20 ring-inset", className)} aria-disabled="true">
        {body}
      </span>
    );
  }
  return (
    <a
      href={href}
      {...(download ? { download: "" } : { target: "_blank", rel: "noopener noreferrer" })}
      className={cn(base, "bg-slate-950 text-white shadow-lg shadow-black/25 ring-1 ring-white/15 hover:-translate-y-0.5", className)}
    >
      {body}
    </a>
  );
}
