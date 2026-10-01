import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Pause, Play } from "lucide-react";
import type { HeroSlide } from "#/server/content";
import { asset, imageSrc } from "#/lib/asset";
import { cn } from "#/lib/utils";
import { useSiteLayout } from "#/lib/site-layout";
import { SmartLink } from "./smart-link";

const INTERVAL_MS = 6500;
const SWIPE_THRESHOLD_PX = 50;

// The home page spotlight: full-bleed crossfading slides managed in
// Admin → Spotlights. Autoplays (paused on hover/focus and for reduced
// motion), with arrows, play/pause, dots, keyboard and swipe.
// How a slide's picture fills the banner on wider screens:
//   cover   — landscape photos fill it, cropped from slightly above centre
//   side    — near-square photos sit whole on the right, text on the left
//   poster  — images carrying their own text are shown whole, centred
// On phones every picture is shown whole at the top, with the text below.
// Whole pictures float over a blurred copy of themselves.
type Fit = "cover" | "side" | "poster";

function fitFor(slide: HeroSlide): Fit {
  if (!slide.show_text) return "poster";
  const ratio = slide.image_width && slide.image_height ? slide.image_width / slide.image_height : 1.6;
  return ratio < 1.25 ? "side" : "cover";
}

export function HeroCarousel({ slides }: { slides: Array<HeroSlide> }) {
  const { settings } = useSiteLayout();
  const [current, setCurrent] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [hovered, setHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback((index: number) => setCurrent(((index % count) + count) % count), [count]);
  const next = useCallback(() => go(current + 1), [go, current]);
  const previous = useCallback(() => go(current - 1), [go, current]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) setPlaying(false);
  }, []);

  useEffect(() => {
    if (!playing || hovered || count < 2) return;
    const timer = setTimeout(next, INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [playing, hovered, count, next]);

  // No spotlights yet: a branded welcome banner instead of an empty hero.
  if (count === 0) {
    return (
      <section className="relative isolate overflow-hidden bg-primary text-white">
        <div className="dot-grid absolute inset-0 -z-10 opacity-70" aria-hidden="true" />
        <div className="absolute -right-20 -bottom-40 -z-10 size-[520px] rounded-full bg-brand-green/25 blur-3xl" aria-hidden="true" />
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-20 md:grid-cols-[1fr_auto] md:px-8 md:py-28">
          <div>
            <p className="text-xs font-bold tracking-[0.2em] text-brand-sky uppercase">{settings.identity.motto}</p>
            <h1 className="mt-3 max-w-3xl text-4xl font-extrabold tracking-tight text-balance md:text-6xl">
              {settings.identity.name}
            </h1>
            <p className="mt-5 max-w-xl text-lg text-white/80">{settings.identity.tagline}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <SmartLink href="/admissions" className="inline-flex items-center gap-2 rounded-full bg-brand-green px-7 py-3.5 font-bold hover:bg-[#00703f]">
                Apply now <ArrowRight className="size-4" aria-hidden="true" />
              </SmartLink>
              <SmartLink href="/about" className="inline-flex items-center gap-2 rounded-full bg-white/10 px-7 py-3.5 font-semibold ring-1 ring-white/25 hover:bg-white/20">
                Discover Akatsi
              </SmartLink>
            </div>
          </div>
          <img src={asset("logo.webp")} alt="" className="hidden h-72 w-auto drop-shadow-2xl md:block" />
        </div>
      </section>
    );
  }

  return (
    <section
      className="relative isolate h-[54svh] min-h-[360px] w-full overflow-hidden bg-primary-dark md:h-[60svh] md:max-h-[600px] md:min-h-[440px]"
      role="region"
      aria-roledescription="carousel"
      aria-label="Spotlight"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setHovered(true)}
      onBlur={() => setHovered(false)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") previous();
        if (e.key === "ArrowRight") next();
      }}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const start = touchStartX.current;
        const end = e.changedTouches[0]?.clientX;
        touchStartX.current = null;
        if (start == null || end == null || Math.abs(end - start) < SWIPE_THRESHOLD_PX) return;
        if (end < start) next();
        else previous();
      }}
    >
      {slides.map((slide, i) => {
        const active = i === current;
        const fit = fitFor(slide);
        return (
          <div
            key={slide.id}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            inert={!active}
            className={cn("absolute inset-0 transition-opacity duration-1000 ease-in-out", active ? "z-10 opacity-100" : "z-0 opacity-0")}
          >
            <img
              src={imageSrc(slide.image_url)}
              alt=""
              aria-hidden="true"
              loading={i === 0 ? "eager" : "lazy"}
              className={cn("absolute inset-0 size-full scale-110 object-cover opacity-70 blur-2xl", fit === "cover" && "md:hidden")}
            />
            <img
              src={imageSrc(slide.image_url)}
              alt=""
              loading={i === 0 ? "eager" : "lazy"}
              decoding="async"
              className={cn(
                "absolute inset-0 size-full object-contain object-top transition-transform duration-[7000ms] ease-out",
                fit === "cover" && "md:object-cover md:object-[center_35%]",
                fit === "side" && "md:object-right",
                // Leave room under posters for the button, dots and controls.
                fit === "poster" && "pb-24 md:object-center md:pt-6 md:pb-36",
                fit === "cover" && active ? "md:scale-[1.04]" : "scale-100",
              )}
            />
            {slide.show_text ? (
              <>
                <div className="absolute inset-0 bg-gradient-to-r from-primary-dark/90 via-primary/60 to-transparent" aria-hidden="true" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary-dark/80 via-transparent to-transparent" aria-hidden="true" />
              </>
            ) : (
              // Poster slides carry their own text: just keep the controls legible.
              <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-primary-dark/80 to-transparent" aria-hidden="true" />
            )}

            {!slide.show_text ? (
              <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-24 md:px-8">
                <h2 className="sr-only">{slide.title}</h2>
                {slide.cta_label && slide.cta_url && (
                  <SmartLink
                    href={slide.cta_url}
                    className="inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-primary shadow-lg transition hover:bg-brand-sky"
                  >
                    {slide.cta_label}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </SmartLink>
                )}
              </div>
            ) : (
            <div className="relative mx-auto flex h-full max-w-7xl items-end px-4 pb-24 md:items-center md:px-8 md:pb-0">
              <div className={cn("max-w-2xl text-white transition-all delay-200 duration-700", active ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0")}>
                {slide.eyebrow && (
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-green px-3.5 py-1 text-xs font-bold tracking-wider uppercase">
                    <span className="size-1.5 rounded-full bg-white" aria-hidden="true" />
                    {slide.eyebrow}
                  </span>
                )}
                <h2 className="mt-4 text-3xl leading-[1.1] font-extrabold tracking-tight text-balance md:text-5xl lg:text-6xl">
                  {slide.title}
                </h2>
                <span className="mt-5 block h-1 w-16 rounded-full bg-brand-sky" aria-hidden="true" />
                {slide.caption && <p className="mt-5 line-clamp-3 text-base text-white/85 md:text-lg">{slide.caption}</p>}
                {slide.cta_label && slide.cta_url && (
                  <SmartLink
                    href={slide.cta_url}
                    className="mt-7 inline-flex items-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-bold text-primary shadow-lg transition hover:bg-brand-sky"
                  >
                    {slide.cta_label}
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </SmartLink>
                )}
              </div>
            </div>
            )}
          </div>
        );
      })}

      {count > 1 && (
        <div className="absolute inset-x-0 bottom-0 z-20">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 pb-6 md:px-8 md:pb-8">
            <div className="flex items-center gap-2" role="group" aria-label="Choose slide">
              {slides.map((slide, i) => (
                <button
                  key={slide.id}
                  type="button"
                  onClick={() => {
                    setPlaying(false);
                    go(i);
                  }}
                  aria-label={`Go to slide ${i + 1}: ${slide.title}`}
                  aria-current={i === current}
                  className="group flex h-6 items-center"
                >
                  <span
                    className={cn(
                      "block h-1.5 rounded-full transition-all duration-300",
                      i === current ? "w-10 bg-brand-sky" : "w-5 bg-white/40 group-hover:bg-white/70",
                    )}
                  />
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              {[
                { label: "Previous slide", onClick: previous, icon: ChevronLeft },
                { label: playing ? "Pause slideshow" : "Play slideshow", onClick: () => setPlaying((v) => !v), icon: playing ? Pause : Play },
                { label: "Next slide", onClick: next, icon: ChevronRight },
              ].map((control) => (
                <button
                  key={control.label}
                  type="button"
                  onClick={control.onClick}
                  aria-label={control.label}
                  className="flex size-10 items-center justify-center rounded-full bg-white/10 text-white ring-1 ring-white/20 backdrop-blur transition-colors hover:bg-white/25 md:size-11"
                >
                  <control.icon className="size-5" aria-hidden="true" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
