// Responsive, optimised images. Client-safe: builds URLs for the /img
// optimiser (server/img-handler.ts → server/image-optimizer.ts), which resizes CMS and
// public images, re-encodes them as AVIF/WebP and caches every variant.
import { asset } from "./asset";

// The only widths the optimiser renders, so the cache stays bounded and
// browsers/CDNs share variants. Requests snap up to the next one.
export const IMAGE_WIDTHS = [
  64, 96, 128, 192, 256, 384, 512, 640, 768, 1024, 1280, 1600, 1920, 2560,
] as const;
export const IMAGE_QUALITIES = [50, 60, 75, 85] as const;
export const DEFAULT_QUALITY = 75;

export type ImageQuality = (typeof IMAGE_QUALITIES)[number];

// Opt out (e.g. while debugging) with VITE_IMAGE_OPTIMIZATION=false.
// (import.meta.env is undefined outside Vite, e.g. in tsx scripts.)
const env = import.meta.env as Partial<ImportMetaEnv> | undefined;
const enabled = env?.VITE_IMAGE_OPTIMIZATION !== "false";

/**
 * Hosts the optimiser may fetch from: R2_PUBLIC_DOMAIN plus the comma-separated
 * IMAGE_REMOTE_HOSTS. Entries may be bare hosts or URLs; matching is on the
 * exact host (including any port). Used by the server and, via the
 * build-time __IMAGE_HOSTS__ constant (vite.config.ts), by the browser.
 */
export function parseImageHosts(
  r2PublicDomain: string | undefined,
  remoteHosts: string | undefined,
): Array<string> {
  const hosts = new Set<string>();
  for (const value of [r2PublicDomain, ...(remoteHosts ?? "").split(",")]) {
    const v = value?.trim();
    if (!v) continue;
    try {
      hosts.add(new URL(v.includes("://") ? v : `https://${v}`).host);
    } catch {
      // Ignore malformed entries.
    }
  }
  return [...hosts];
}

// Undefined outside a Vite build (e.g. tsx scripts) — then no remote host is optimised.
const IMAGE_HOSTS = new Set<string>(typeof __IMAGE_HOSTS__ === "undefined" ? [] : __IMAGE_HOSTS__);

/**
 * Local files and images on an allowed host go through /img. Anything else
 * (an image pasted from another site) loads directly, so it never breaks.
 * Vector and animated images are always served as they are.
 */
export function canOptimize(src: string | null | undefined): src is string {
  if (!enabled || !src) return false;
  if (/\.(svg|gif)(\?|#|$)/i.test(src)) return false;
  if (/^\/(?!\/)/.test(src)) return true;
  if (!/^https?:\/\//i.test(src)) return false;
  try {
    return IMAGE_HOSTS.has(new URL(src).host);
  } catch {
    return false;
  }
}

export function snapWidth(width: number): number {
  return IMAGE_WIDTHS.find((w) => w >= width) ?? 2560;
}

export function optimizedUrl(
  src: string,
  width: number,
  quality: ImageQuality = DEFAULT_QUALITY,
): string {
  if (!canOptimize(src)) return src;
  return `${asset("img")}?src=${encodeURIComponent(src)}&w=${snapWidth(width)}&q=${quality}`;
}

/** `srcset` with every width up to `maxWidth` — the browser picks using `sizes`. */
export function optimizedSrcSet(
  src: string,
  quality: ImageQuality = DEFAULT_QUALITY,
  maxWidth = 2560,
): string | undefined {
  if (!canOptimize(src)) return undefined;
  return IMAGE_WIDTHS.filter((w) => w <= maxWidth)
    .map((w) => `${optimizedUrl(src, w, quality)} ${w}w`)
    .join(", ");
}

const PROSE_SIZES = "(min-width: 768px) 720px, 100vw";

// Rich text from the CMS (already sanitised server-side): give its images a
// srcset and lazy loading. sanitize-html always writes double-quoted attributes.
export function optimizeHtmlImages(html: string): string {
  return html.replace(/<img\s([^>]*?)\/?>/gi, (tag: string, attrs: string) => {
    const match = /\ssrc="([^"]+)"/.exec(` ${attrs}`);
    if (!match?.[1] || /\ssrcset=/i.test(` ${attrs}`)) return tag;
    const src = match[1].replace(/&amp;/g, "&");
    const extra = [
      /\sloading=/i.test(` ${attrs}`) ? "" : 'loading="lazy"',
      'decoding="async"',
      canOptimize(src)
        ? `srcset="${optimizedSrcSet(src, DEFAULT_QUALITY, 1600)!.replace(/&/g, "&amp;")}" sizes="${PROSE_SIZES}"`
        : "",
    ]
      .filter(Boolean)
      .join(" ");
    return `<img ${attrs.trim()} ${extra} />`;
  });
}
