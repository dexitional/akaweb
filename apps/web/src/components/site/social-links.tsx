import { Facebook, Instagram, Linkedin, Music2, Twitter, Youtube } from "lucide-react";
import { cn } from "#/lib/utils";
import type { SiteSettings } from "#/lib/settings";

const ICONS = {
  facebook: { icon: Facebook, label: "Facebook" },
  x: { icon: Twitter, label: "X (Twitter)" },
  instagram: { icon: Instagram, label: "Instagram" },
  youtube: { icon: Youtube, label: "YouTube" },
  linkedin: { icon: Linkedin, label: "LinkedIn" },
  tiktok: { icon: Music2, label: "TikTok" },
} as const;

export function SocialLinks({
  socials,
  size = "md",
  tone = "light",
}: {
  socials: SiteSettings["socials"];
  size?: "sm" | "md";
  tone?: "light" | "dark";
}) {
  const entries = (Object.keys(ICONS) as Array<keyof typeof ICONS>).filter((k) => socials[k]);
  if (entries.length === 0) return null;
  return (
    <ul className="flex items-center gap-2">
      {entries.map((key) => {
        const { icon: Icon, label } = ICONS[key];
        return (
          <li key={key}>
            <a
              href={socials[key]}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={label}
              className={cn(
                "flex items-center justify-center rounded-full transition-colors",
                size === "sm" ? "size-7" : "size-10",
                tone === "light"
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-secondary text-primary hover:bg-primary hover:text-white",
              )}
            >
              <Icon className={size === "sm" ? "size-3.5" : "size-4"} aria-hidden="true" />
            </a>
          </li>
        );
      })}
    </ul>
  );
}
