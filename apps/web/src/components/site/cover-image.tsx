import { asset, imageSrc } from "#/lib/asset";
import { cn } from "#/lib/utils";

// A CMS image, or a branded crest tile when none was uploaded.
export function CoverImage({
  src,
  alt = "",
  className,
  imgClassName,
  eager = false,
}: {
  src: string | null | undefined;
  alt?: string;
  className?: string;
  imgClassName?: string;
  eager?: boolean;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-primary", className)}>
      {src ? (
        <img
          src={imageSrc(src)}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className={cn("size-full object-cover", imgClassName)}
        />
      ) : (
        <div className="flex size-full items-center justify-center bg-gradient-to-br from-primary via-primary to-brand-green/80">
          <div className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
          <img src={asset("logo-sm.webp")} alt="" className="relative h-1/2 max-h-24 w-auto opacity-25 grayscale-[30%]" />
        </div>
      )}
    </div>
  );
}
