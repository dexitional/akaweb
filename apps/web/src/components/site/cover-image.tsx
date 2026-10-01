import { asset } from "#/lib/asset";
import { cn } from "#/lib/utils";
import { OptimizedImage } from "#/components/site/optimized-image";

// A CMS image, or a branded crest tile when none was uploaded.
export function CoverImage({
  src,
  alt = "",
  className,
  imgClassName,
  eager = false,
  sizes = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw",
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
  /** Rendered width, for picking the image variant — see OptimizedImage. */
  sizes?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-primary", className)}>
      {src ? (
        <OptimizedImage
          src={src}
          alt={alt}
          sizes={sizes}
          priority={eager}
          className={cn("size-full object-cover", imgClassName)}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary via-primary to-brand-green/80">
          <div className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
          <OptimizedImage
            src={asset("logo-sm.webp")}
            alt=""
            sizes="96px"
            className="relative h-1/2 max-h-24 w-auto opacity-25 grayscale-[30%]"
          />
        </div>
      )}
    </div>
  );
}
