import { preload } from "react-dom";
import type { ImgHTMLAttributes } from "react";
import { imageSrc } from "#/lib/asset";
import { DEFAULT_QUALITY, optimizedSrcSet, optimizedUrl } from "#/lib/image";
import type { ImageQuality } from "#/lib/image";

type Props = Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "srcSet"> & {
  /** CMS image URL (R2) or a public/ path. */
  src: string;
  /**
   * How wide the image renders, as a `sizes` value ("64px", "100vw",
   * "(min-width: 1024px) 33vw, 100vw"). The browser uses it to pick the
   * smallest variant that stays sharp on the screen's pixel density.
   */
  sizes?: string;
  quality?: ImageQuality;
  /** Largest variant worth offering (e.g. an avatar never needs 2560px). */
  maxWidth?: number;
  /** Above-the-fold / LCP image: load eagerly, at high priority, and preload it from <head>. */
  priority?: boolean;
};

// <img> served through the /img optimiser: resized per device, AVIF/WebP,
// cached. Falls back to a plain <img> for SVGs, GIFs and other hosts.
export function OptimizedImage({
  src,
  sizes = "100vw",
  quality = DEFAULT_QUALITY,
  maxWidth = 2560,
  priority = false,
  ...rest
}: Props) {
  const url = imageSrc(src);
  const srcSet = optimizedSrcSet(url, quality, maxWidth);
  const fallback = srcSet ? optimizedUrl(url, Math.min(maxWidth, 1280), quality) : url;

  if (priority) {
    // React hoists this into <head> during SSR, so the browser starts the
    // download before it has even parsed the hero markup.
    preload(fallback, {
      as: "image",
      imageSrcSet: srcSet,
      imageSizes: srcSet ? sizes : undefined,
      fetchPriority: "high",
    });
  }

  return (
    <img
      src={fallback}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      loading={priority ? "eager" : "lazy"}
      decoding={priority ? "sync" : "async"}
      fetchPriority={priority ? "high" : undefined}
      {...rest}
    />
  );
}
