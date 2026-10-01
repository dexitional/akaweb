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

/** Vector and animated images are served as they are. */
export function canOptimize(src: string | null | undefined): src is string {
  if (!enabled || !src) return false;
  if (!/^(https?:\/\/|\/(?!\/))/i.test(src)) return false;
  return !/\.(svg|gif)(\?|#|$)/i.test(src);
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
