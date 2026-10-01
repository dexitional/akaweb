// The page builder: every CMS page is an optional rich-text body followed by
// an ordered list of blocks. This module is the single definition of each
// block's shape — the CMS editor builds them, the API validates (and
// sanitises the HTML fields of) them, and the public renderer draws them.
// Client-safe.
import { z } from "zod";
import { DOCUMENT_CATEGORY_KEYS, PERSON_GROUP_KEYS } from "./content";

const text = (max: number) => z.string().trim().max(max);
const link = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^(\/|#|https?:\/\/|mailto:|tel:)/i.test(v),
    "Use a path like /about or a full URL",
  );
const html = z.string().max(300_000);
const id = z.string().min(1).max(64);

export const blockSchemas = {
  richText: z.object({ id, type: z.literal("richText"), html }),
  imageText: z.object({
    id,
    type: z.literal("imageText"),
    title: text(200),
    html,
    imageUrl: link,
    imageAlt: text(200),
    imagePosition: z.enum(["left", "right"]),
  }),
  cards: z.object({
    id,
    type: z.literal("cards"),
    title: text(200),
    intro: text(600),
    columns: z.union([z.literal(2), z.literal(3), z.literal(4)]),
    items: z
      .array(z.object({ title: text(150), text: text(600), imageUrl: link, url: link }))
      .max(24),
  }),
  stats: z.object({
    id,
    type: z.literal("stats"),
    title: text(200),
    items: z.array(z.object({ value: text(30), label: text(100) })).max(8),
  }),
  steps: z.object({
    id,
    type: z.literal("steps"),
    title: text(200),
    intro: text(600),
    items: z.array(z.object({ title: text(150), text: text(800) })).max(20),
  }),
  faq: z.object({
    id,
    type: z.literal("faq"),
    title: text(200),
    items: z.array(z.object({ question: text(300), answer: text(3000) })).max(40),
  }),
  callout: z.object({
    id,
    type: z.literal("callout"),
    tone: z.enum(["info", "success", "warning"]),
    title: text(200),
    text: text(1000),
  }),
  quote: z.object({
    id,
    type: z.literal("quote"),
    quote: text(1500),
    author: text(120),
    role: text(150),
    imageUrl: link,
  }),
  cta: z.object({
    id,
    type: z.literal("cta"),
    title: text(200),
    text: text(600),
    buttonLabel: text(40),
    buttonUrl: link,
    tone: z.enum(["navy", "green", "sky"]),
  }),
  gallery: z.object({
    id,
    type: z.literal("gallery"),
    title: text(200),
    images: z.array(z.object({ url: link, caption: text(200) })).max(60),
  }),
  video: z.object({
    id,
    type: z.literal("video"),
    title: text(200),
    url: link,
    caption: text(300),
  }),
  people: z.object({
    id,
    type: z.literal("people"),
    title: text(200),
    intro: text(600),
    group: z.enum(PERSON_GROUP_KEYS),
    layout: z.enum(["grid", "list"]),
  }),
  departments: z.object({
    id,
    type: z.literal("departments"),
    title: text(200),
    intro: text(600),
    kind: z.enum(["department", "unit"]),
  }),
  documents: z.object({
    id,
    type: z.literal("documents"),
    title: text(200),
    intro: text(600),
    category: z.union([z.enum(DOCUMENT_CATEGORY_KEYS), z.literal("")]),
    limit: z.number().int().min(1).max(50),
  }),
  contact: z.object({
    id,
    type: z.literal("contact"),
    title: text(200),
    intro: text(600),
    showForm: z.boolean(),
    showMap: z.boolean(),
  }),
} as const;

export type BlockType = keyof typeof blockSchemas;
export type Block = { [K in BlockType]: z.infer<(typeof blockSchemas)[K]> }[BlockType];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

export const blockSchema = z.discriminatedUnion("type", [
  blockSchemas.richText,
  blockSchemas.imageText,
  blockSchemas.cards,
  blockSchemas.stats,
  blockSchemas.steps,
  blockSchemas.faq,
  blockSchemas.callout,
  blockSchemas.quote,
  blockSchemas.cta,
  blockSchemas.gallery,
  blockSchemas.video,
  blockSchemas.people,
  blockSchemas.departments,
  blockSchemas.documents,
  blockSchemas.contact,
]);
export const blocksSchema = z.array(blockSchema).max(60);

export interface BlockMeta {
  type: BlockType;
  label: string;
  description: string;
  group: "Content" | "Media" | "Directory" | "Engagement";
}

export const BLOCK_CATALOG: Array<BlockMeta> = [
  {
    type: "richText",
    label: "Rich text",
    description: "Formatted text with headings, lists, links and images.",
    group: "Content",
  },
  {
    type: "imageText",
    label: "Image & text",
    description: "A picture beside a block of text.",
    group: "Content",
  },
  {
    type: "cards",
    label: "Card grid",
    description: "A grid of linked cards with optional images.",
    group: "Content",
  },
  {
    type: "steps",
    label: "Steps",
    description: "A numbered process, e.g. how to apply.",
    group: "Content",
  },
  { type: "faq", label: "FAQ", description: "Expandable questions and answers.", group: "Content" },
  { type: "callout", label: "Callout", description: "A highlighted notice box.", group: "Content" },
  { type: "stats", label: "Figures", description: "Key numbers in large type.", group: "Content" },
  {
    type: "quote",
    label: "Quote",
    description: "A testimonial or message with a photo.",
    group: "Content",
  },
  {
    type: "gallery",
    label: "Gallery",
    description: "A grid of photos with a lightbox.",
    group: "Media",
  },
  {
    type: "video",
    label: "Video",
    description: "An embedded YouTube or Vimeo video.",
    group: "Media",
  },
  {
    type: "people",
    label: "People",
    description: "Profiles from a people group, e.g. Management.",
    group: "Directory",
  },
  {
    type: "departments",
    label: "Departments / Units",
    description: "Cards linking to every department or unit.",
    group: "Directory",
  },
  {
    type: "documents",
    label: "Downloads",
    description: "A list of documents from the library.",
    group: "Directory",
  },
  {
    type: "cta",
    label: "Call to action",
    description: "A coloured band with a button.",
    group: "Engagement",
  },
  {
    type: "contact",
    label: "Contact details",
    description: "Contact information, map and enquiry form.",
    group: "Engagement",
  },
];

export function blockLabel(type: BlockType) {
  return BLOCK_CATALOG.find((b) => b.type === type)?.label ?? type;
}

function newId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 12)
    : Math.random().toString(36).slice(2, 14);
}

// A fresh, valid block of the given type with sensible empty values.
export function createBlock(type: BlockType): Block {
  const base = { id: newId() };
  switch (type) {
    case "richText":
      return { ...base, type, html: "" };
    case "imageText":
      return {
        ...base,
        type,
        title: "",
        html: "",
        imageUrl: "",
        imageAlt: "",
        imagePosition: "right",
      };
    case "cards":
      return { ...base, type, title: "", intro: "", columns: 3, items: [] };
    case "stats":
      return { ...base, type, title: "", items: [] };
    case "steps":
      return { ...base, type, title: "", intro: "", items: [] };
    case "faq":
      return { ...base, type, title: "Frequently asked questions", items: [] };
    case "callout":
      return { ...base, type, tone: "info", title: "", text: "" };
    case "quote":
      return { ...base, type, quote: "", author: "", role: "", imageUrl: "" };
    case "cta":
      return { ...base, type, title: "", text: "", buttonLabel: "", buttonUrl: "", tone: "navy" };
    case "gallery":
      return { ...base, type, title: "", images: [] };
    case "video":
      return { ...base, type, title: "", url: "", caption: "" };
    case "people":
      return { ...base, type, title: "", intro: "", group: "management", layout: "grid" };
    case "departments":
      return { ...base, type, title: "", intro: "", kind: "department" };
    case "documents":
      return { ...base, type, title: "Downloads", intro: "", category: "", limit: 10 };
    case "contact":
      return { ...base, type, title: "Get in touch", intro: "", showForm: true, showMap: true };
  }
}

export function duplicateBlock(block: Block): Block {
  return { ...structuredClone(block), id: newId() };
}

// YouTube / Vimeo watch or share URL → privacy-friendly embed URL, or null.
export function videoEmbedUrl(url: string): string | null {
  const yt = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  if (yt) return `https://www.youtube-nocookie.com/embed/${yt[1]}`;
  const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}
