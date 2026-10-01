import { useState } from "react";
import { ArrowRight, ChevronDown, ChevronLeft, ChevronRight, Clock, Info, Mail, MapPin, Phone, Quote, TriangleAlert, CircleCheck, X } from "lucide-react";
import type { Block, BlockOf } from "#/lib/blocks";
import { videoEmbedUrl } from "#/lib/blocks";
import { imageSrc } from "#/lib/asset";
import { cn } from "#/lib/utils";
import { useSiteLayout } from "#/lib/site-layout";
import { DEPARTMENT_KINDS } from "#/lib/content";
import type { ResolvedBlockData } from "#/server/content";
import { documentsKey } from "#/lib/documents-key";
import { RichContent } from "./rich-content";
import { SmartLink } from "./smart-link";
import { CoverImage } from "./cover-image";
import { PeopleGrid } from "./person-card";
import { DocumentList } from "./document-list";
import { ContactForm } from "./contact-form";

// Draws a CMS page's blocks in order. Directory blocks (people, departments,
// downloads) read their rows from `resolved`, fetched server-side.
export function PageBlocks({ blocks, resolved }: { blocks: Array<Block>; resolved: ResolvedBlockData }) {
  return (
    <div className="space-y-14">
      {blocks.map((block) => (
        <BlockView key={block.id} block={block} resolved={resolved} />
      ))}
    </div>
  );
}

function BlockView({ block, resolved }: { block: Block; resolved: ResolvedBlockData }) {
  switch (block.type) {
    case "richText":
      return block.html ? <RichContent html={block.html} /> : null;
    case "imageText":
      return <ImageText block={block} />;
    case "cards":
      return <Cards block={block} />;
    case "stats":
      return <Stats block={block} />;
    case "steps":
      return <Steps block={block} />;
    case "faq":
      return <Faq block={block} />;
    case "callout":
      return <Callout block={block} />;
    case "quote":
      return <QuoteBlock block={block} />;
    case "cta":
      return <Cta block={block} />;
    case "gallery":
      return <Gallery block={block} />;
    case "video":
      return <Video block={block} />;
    case "people": {
      const people = resolved.people[block.group] ?? [];
      return people.length ? (
        <section>
          <BlockTitle title={block.title} intro={block.intro} />
          <PeopleGrid people={people} layout={block.layout} />
        </section>
      ) : null;
    }
    case "departments":
      return <Departments block={block} items={resolved.departments[block.kind] ?? []} />;
    case "documents": {
      const docs = resolved.documents[documentsKey(block.category, block.limit)] ?? [];
      return docs.length ? (
        <section>
          <BlockTitle title={block.title} intro={block.intro} />
          <DocumentList documents={docs} showCategory={!block.category} />
        </section>
      ) : null;
    }
    case "contact":
      return <ContactBlock block={block} />;
  }
}

function BlockTitle({ title, intro }: { title?: string; intro?: string }) {
  if (!title && !intro) return null;
  return (
    <div className="mb-6">
      {title && <h2 className="text-2xl font-extrabold tracking-tight text-primary md:text-3xl">{title}</h2>}
      {intro && <p className="mt-2 max-w-3xl leading-relaxed text-muted-foreground">{intro}</p>}
    </div>
  );
}

function ImageText({ block }: { block: BlockOf<"imageText"> }) {
  return (
    <section
      className={cn(
        "grid items-start gap-8",
        block.imageUrl && (block.imagePosition === "left" ? "md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]" : "md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]"),
      )}
    >
      {block.imageUrl && (
        <div className={cn("relative isolate md:sticky md:top-28", block.imagePosition === "left" ? "md:order-first" : "md:order-last")}>
          <div className="absolute -inset-3 -z-10 rounded-3xl bg-gradient-to-br from-brand-sky/40 to-brand-green/20" aria-hidden="true" />
          <img src={imageSrc(block.imageUrl)} alt={block.imageAlt} loading="lazy" className="max-h-[560px] w-full rounded-2xl object-cover object-top shadow-lg" />
        </div>
      )}
      <div>
        {block.title && <h2 className="mb-4 text-2xl font-extrabold tracking-tight text-primary md:text-3xl">{block.title}</h2>}
        {block.html && <RichContent html={block.html} />}
      </div>
    </section>
  );
}

function Cards({ block }: { block: BlockOf<"cards"> }) {
  const cols = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[block.columns];
  return (
    <section>
      <BlockTitle title={block.title} intro={block.intro} />
      <ul className={cn("grid gap-5", cols)}>
        {block.items.map((item, i) => {
          const inner = (
            <>
              {item.imageUrl && (
                <CoverImage src={item.imageUrl} className="aspect-[16/10]" imgClassName="transition-transform duration-500 group-hover:scale-105" />
              )}
              <div className="flex flex-1 flex-col p-5">
                {!item.imageUrl && <span className="mb-3 block h-1 w-10 rounded-full bg-brand-green" aria-hidden="true" />}
                <h3 className="font-bold text-slate-900 group-hover:text-primary">{item.title}</h3>
                {item.text && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.text}</p>}
                {item.url && (
                  <span className="mt-auto flex items-center gap-1 pt-4 text-sm font-semibold text-primary">
                    Learn more
                    <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" aria-hidden="true" />
                  </span>
                )}
              </div>
            </>
          );
          const className =
            "group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg";
          return (
            <li key={`${item.title}-${i}`}>
              {item.url ? (
                <SmartLink href={item.url} className={className}>
                  {inner}
                </SmartLink>
              ) : (
                <div className={className}>{inner}</div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function Stats({ block }: { block: BlockOf<"stats"> }) {
  return (
    <section className="relative overflow-hidden rounded-3xl bg-primary px-6 py-10 text-white md:px-10">
      <div className="dot-grid absolute inset-0 opacity-60" aria-hidden="true" />
      <div className="relative">
        {block.title && <h2 className="mb-8 text-center text-2xl font-extrabold">{block.title}</h2>}
        <dl className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {block.items.map((item, i) => (
            <div key={`${item.label}-${i}`} className="flex flex-col-reverse text-center">
              <dt className="mt-1 text-sm text-white/75">{item.label}</dt>
              <dd className="text-3xl font-extrabold text-brand-sky md:text-4xl">{item.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

function Steps({ block }: { block: BlockOf<"steps"> }) {
  return (
    <section>
      <BlockTitle title={block.title} intro={block.intro} />
      <ol className="relative space-y-6 border-l-2 border-dashed border-brand-green/40 pl-8">
        {block.items.map((item, i) => (
          <li key={`${item.title}-${i}`} className="relative">
            <span className="absolute top-0 -left-[49px] flex size-9 items-center justify-center rounded-full bg-brand-green text-sm font-extrabold text-white ring-4 ring-white">
              {i + 1}
            </span>
            <h3 className="font-bold text-slate-900">{item.title}</h3>
            {item.text && <p className="mt-1 leading-relaxed whitespace-pre-line text-muted-foreground">{item.text}</p>}
          </li>
        ))}
      </ol>
    </section>
  );
}

function Faq({ block }: { block: BlockOf<"faq"> }) {
  return (
    <section>
      <BlockTitle title={block.title} />
      <div className="divide-y divide-border overflow-hidden rounded-2xl border border-border bg-white">
        {block.items.map((item, i) => (
          <details key={`${item.question}-${i}`} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 font-semibold text-slate-900 hover:bg-secondary/60 [&::-webkit-details-marker]:hidden">
              {item.question}
              <ChevronDown className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <p className="px-5 pb-5 leading-relaxed whitespace-pre-line text-muted-foreground">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

const CALLOUT_TONES = {
  info: { icon: Info, box: "border-blue-200 bg-blue-50", iconClass: "text-blue-700" },
  success: { icon: CircleCheck, box: "border-emerald-200 bg-emerald-50", iconClass: "text-brand-green" },
  warning: { icon: TriangleAlert, box: "border-amber-200 bg-amber-50", iconClass: "text-amber-700" },
} as const;

function Callout({ block }: { block: BlockOf<"callout"> }) {
  const tone = CALLOUT_TONES[block.tone];
  return (
    <aside className={cn("flex gap-4 rounded-2xl border p-5", tone.box)}>
      <tone.icon className={cn("mt-0.5 size-5 shrink-0", tone.iconClass)} aria-hidden="true" />
      <div>
        {block.title && <p className="font-bold text-slate-900">{block.title}</p>}
        {block.text && <p className="mt-1 leading-relaxed whitespace-pre-line text-slate-700">{block.text}</p>}
      </div>
    </aside>
  );
}

function QuoteBlock({ block }: { block: BlockOf<"quote"> }) {
  return (
    <figure className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-secondary to-accent p-8 md:p-10">
      <Quote className="absolute top-6 right-6 size-16 text-primary/10" aria-hidden="true" />
      <div className="flex flex-col gap-6 md:flex-row md:items-center">
        {block.imageUrl && (
          <img src={imageSrc(block.imageUrl)} alt={block.author} className="size-28 shrink-0 rounded-2xl object-cover shadow-md md:size-36" />
        )}
        <div>
          <blockquote className="font-serif text-xl leading-relaxed text-slate-800 md:text-2xl">“{block.quote}”</blockquote>
          {(block.author || block.role) && (
            <figcaption className="mt-4">
              <span className="font-bold text-primary">{block.author}</span>
              {block.role && <span className="block text-sm text-muted-foreground">{block.role}</span>}
            </figcaption>
          )}
        </div>
      </div>
    </figure>
  );
}

const CTA_TONES = {
  navy: "bg-primary text-white",
  green: "bg-brand-green text-white",
  sky: "bg-brand-sky/30 text-primary",
} as const;

function Cta({ block }: { block: BlockOf<"cta"> }) {
  return (
    <section className={cn("relative overflow-hidden rounded-3xl px-6 py-10 md:px-12", CTA_TONES[block.tone])}>
      {block.tone !== "sky" && <div className="line-grid absolute inset-0" aria-hidden="true" />}
      <div className="relative flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-extrabold md:text-3xl">{block.title}</h2>
          {block.text && <p className={cn("mt-2 leading-relaxed", block.tone === "sky" ? "text-slate-700" : "text-white/80")}>{block.text}</p>}
        </div>
        {block.buttonLabel && block.buttonUrl && (
          <SmartLink
            href={block.buttonUrl}
            className={cn(
              "inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-7 py-3.5 font-bold transition",
              block.tone === "sky" ? "bg-primary text-white hover:bg-primary-dark" : "bg-white text-primary hover:bg-brand-sky",
            )}
          >
            {block.buttonLabel}
            <ArrowRight className="size-4" aria-hidden="true" />
          </SmartLink>
        )}
      </div>
    </section>
  );
}

function Gallery({ block }: { block: BlockOf<"gallery"> }) {
  const [index, setIndex] = useState<number | null>(null);
  const count = block.images.length;
  const current = index === null ? null : block.images[index];
  return (
    <section>
      <BlockTitle title={block.title} />
      <ul className="grid grid-cols-2 gap-3 md:grid-cols-3">
        {block.images.map((img, i) => (
          <li key={`${img.url}-${i}`} className={cn(i % 5 === 0 && "md:col-span-2 md:row-span-2")}>
            <button
              type="button"
              onClick={() => setIndex(i)}
              className="group relative block size-full overflow-hidden rounded-xl"
              aria-label={img.caption || `Open photo ${i + 1}`}
            >
              <img
                src={imageSrc(img.url)}
                alt={img.caption}
                loading="lazy"
                className="aspect-square size-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              {img.caption && (
                <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-3 text-left text-sm text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {img.caption}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {current && index !== null && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/90 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          onKeyDown={(e) => {
            if (e.key === "Escape") setIndex(null);
            if (e.key === "ArrowRight") setIndex((index + 1) % count);
            if (e.key === "ArrowLeft") setIndex((index - 1 + count) % count);
          }}
        >
          <button type="button" autoFocus onClick={() => setIndex(null)} className="absolute top-4 right-4 rounded-full bg-white/10 p-2.5 text-white hover:bg-white/20" aria-label="Close">
            <X className="size-6" />
          </button>
          {count > 1 && (
            <>
              <button type="button" onClick={() => setIndex((index - 1 + count) % count)} className="absolute left-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Previous photo">
                <ChevronLeft className="size-6" />
              </button>
              <button type="button" onClick={() => setIndex((index + 1) % count)} className="absolute right-4 rounded-full bg-white/10 p-3 text-white hover:bg-white/20" aria-label="Next photo">
                <ChevronRight className="size-6" />
              </button>
            </>
          )}
          <figure className="max-h-full max-w-5xl">
            <img src={imageSrc(current.url)} alt={current.caption} className="max-h-[80vh] w-auto rounded-lg object-contain" />
            {current.caption && <figcaption className="mt-3 text-center text-sm text-white/80">{current.caption}</figcaption>}
          </figure>
        </div>
      )}
    </section>
  );
}

function Video({ block }: { block: BlockOf<"video"> }) {
  const embed = videoEmbedUrl(block.url);
  if (!embed) return null;
  return (
    <section>
      <BlockTitle title={block.title} />
      <div className="aspect-video overflow-hidden rounded-2xl bg-black shadow-lg">
        <iframe
          src={embed}
          title={block.title || "Video"}
          className="size-full"
          loading="lazy"
          allow="accelerometer; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
      {block.caption && <p className="mt-3 text-sm text-muted-foreground">{block.caption}</p>}
    </section>
  );
}

function Departments({ block, items }: { block: BlockOf<"departments">; items: ResolvedBlockData["departments"][string] }) {
  if (items.length === 0) return null;
  const base = DEPARTMENT_KINDS[block.kind].path;
  return (
    <section>
      <BlockTitle title={block.title} intro={block.intro} />
      <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((d) => (
          <li key={d.id}>
            <SmartLink
              href={`${base}/${d.slug}`}
              className="group flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-primary/10"
            >
              <CoverImage src={d.image_url} className="aspect-[16/9]" imgClassName="transition-transform duration-500 group-hover:scale-105" />
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-bold text-slate-900 group-hover:text-primary">{d.name}</h3>
                {d.summary && <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{d.summary}</p>}
                {d.head_name && (
                  <p className="mt-auto pt-4 text-xs text-muted-foreground">
                    <span className="font-semibold text-slate-700">{d.head_name}</span>
                    {d.head_title && ` · ${d.head_title}`}
                  </p>
                )}
              </div>
            </SmartLink>
          </li>
        ))}
      </ul>
    </section>
  );
}

function ContactBlock({ block }: { block: BlockOf<"contact"> }) {
  const { settings } = useSiteLayout();
  const { contact } = settings;
  const rows = [
    { icon: MapPin, label: "Address", value: contact.address },
    { icon: Phone, label: "Phone", value: [contact.phone, contact.altPhone].filter(Boolean).join("\n"), href: contact.phone ? `tel:${contact.phone.replace(/[^\d+]/g, "")}` : undefined },
    { icon: Mail, label: "Email", value: contact.email, href: contact.email ? `mailto:${contact.email}` : undefined },
    { icon: Clock, label: "Office hours", value: contact.officeHours },
  ].filter((r) => r.value);

  return (
    <section>
      <BlockTitle title={block.title} intro={block.intro} />
      <div className={cn("grid gap-8", block.showForm && "lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]")}>
        <div className="space-y-4">
          {rows.map((row) => (
            <div key={row.label} className="flex gap-4 rounded-2xl border border-border bg-white p-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary text-white">
                <row.icon className="size-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">{row.label}</p>
                {row.href ? (
                  <a href={row.href} className="mt-1 block font-semibold whitespace-pre-line text-slate-900 hover:text-primary">
                    {row.value}
                  </a>
                ) : (
                  <p className="mt-1 font-semibold whitespace-pre-line text-slate-900">{row.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>
        {block.showForm && (
          <div className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
            <h3 className="mb-5 text-xl font-extrabold text-primary">Send us a message</h3>
            <ContactForm />
          </div>
        )}
      </div>
      {block.showMap && contact.mapQuery && (
        <div className="mt-8 aspect-[16/7] min-h-72 overflow-hidden rounded-3xl border border-border bg-muted">
          <iframe
            title="Map"
            className="size-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            src={`https://www.google.com/maps?q=${encodeURIComponent(contact.mapQuery)}&output=embed`}
          />
        </div>
      )}
    </section>
  );
}
