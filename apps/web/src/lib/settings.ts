// Site-wide settings managed in Admin → Settings. Each group is stored as one
// JSON row in `site_settings` and merged over these defaults on read, so a new
// field never needs a migration and an empty database still renders a site.
// Client-safe: the CMS forms validate with these same schemas.
import { z } from "zod";
import type { PageSection } from "@aka/db";

// A link is a site path ("/about/history"), an absolute URL, or mailto:/tel:.
const link = z
  .string()
  .trim()
  .max(500)
  .refine(
    (v) => v === "" || /^(\/|#|https?:\/\/|mailto:|tel:)/i.test(v),
    "Use a path like /about or a full URL",
  );
const text = (max: number) => z.string().trim().max(max);

export const QUICK_LINK_ICONS = [
  "apply",
  "portal",
  "elearning",
  "library",
  "calendar",
  "download",
  "fees",
  "news",
  "contact",
  "mobile",
] as const;

export const SOCIAL_PLATFORMS = [
  "facebook",
  "x",
  "instagram",
  "youtube",
  "linkedin",
  "tiktok",
] as const;

export const settingsSchemas = {
  identity: z.object({
    name: text(150).min(2),
    shortName: text(40),
    motto: text(120),
    tagline: text(200),
    footerText: text(600),
  }),
  contact: z.object({
    address: text(300),
    postalAddress: text(200),
    phone: text(60),
    altPhone: text(60),
    email: text(150),
    officeHours: text(120),
    mapQuery: text(200),
  }),
  socials: z.object(
    Object.fromEntries(SOCIAL_PLATFORMS.map((p) => [p, link])) as Record<
      (typeof SOCIAL_PLATFORMS)[number],
      typeof link
    >,
  ),
  notice: z.object({
    enabled: z.boolean(),
    label: text(30),
    title: text(200),
    text: text(400),
    linkLabel: text(40),
    linkUrl: link,
    expiresOn: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]),
  }),
  welcome: z.object({
    eyebrow: text(60),
    title: text(160),
    message: text(3000),
    name: text(120),
    role: text(120),
    photoUrl: link,
    linkLabel: text(40),
    linkUrl: link,
  }),
  stats: z.object({
    title: text(120),
    intro: text(300),
    items: z
      .array(
        z.object({
          value: z.number().int().min(0).max(10_000_000),
          suffix: text(6),
          label: text(60),
          note: text(100),
        }),
      )
      .max(8),
  }),
  quickLinks: z.object({
    items: z
      .array(
        z.object({
          label: text(40).min(1),
          url: link,
          icon: z.enum(QUICK_LINK_ICONS),
          highlight: z.boolean(),
        }),
      )
      .max(10),
  }),
  cta: z.object({
    title: text(120),
    highlight: text(120),
    text: text(400),
    primaryLabel: text(40),
    primaryUrl: link,
    secondaryLabel: text(40),
    secondaryUrl: link,
  }),
  // Staff directory (/directory).
  directory: z.object({
    expertiseTags: z.array(text(80).min(1)).max(30),
    listingEmail: text(150),
    listingRecipients: text(200),
  }),
  // Student mobile app (Akatsico): store links and the direct APK download,
  // shown on /mobile. Empty store URLs show "Coming soon".
  mobileApp: z.object({
    name: text(40).min(1),
    tagline: text(200),
    playStoreUrl: link,
    appStoreUrl: link,
    apkUrl: link,
    apkVersion: text(30),
    supportEmail: text(150),
  }),
  sections: z.object(
    Object.fromEntries(
      (["about", "academics", "admissions", "student-life", "alumni"] as const).map((s) => [
        s,
        z.object({ intro: text(500), imageUrl: link }),
      ]),
    ) as Record<PageSection, z.ZodObject<{ intro: z.ZodString; imageUrl: typeof link }>>,
  ),
};

export type SettingsKey = keyof typeof settingsSchemas;
export const SETTINGS_KEYS = Object.keys(settingsSchemas) as Array<SettingsKey>;
export type SiteSettings = { [TKey in SettingsKey]: z.infer<(typeof settingsSchemas)[TKey]> };

export const DEFAULT_SETTINGS: SiteSettings = {
  identity: {
    name: "Akatsi College of Education",
    shortName: "AKATSICO",
    motto: "Head, Heart, Hands",
    tagline: "Training teachers of character and competence since 1963",
    footerText:
      "A public College of Education in Akatsi, Volta Region of Ghana, preparing professional teachers for basic schools across the nation.",
  },
  contact: {
    address: "Akatsi College of Education\nP.O. Box 32, Akatsi\nVolta Region, Ghana",
    postalAddress: "P.O. Box 32, Akatsi, Volta Region",
    phone: "+233 (0) 362 197 001",
    altPhone: "",
    email: "info@akatsicoe.edu.gh",
    officeHours: "Monday – Friday, 8:00am – 5:00pm",
    mapQuery: "Akatsi College of Education, Akatsi, Ghana",
  },
  socials: { facebook: "", x: "", instagram: "", youtube: "", linkedin: "", tiktok: "" },
  notice: {
    enabled: false,
    label: "Important",
    title: "",
    text: "",
    linkLabel: "Read more",
    linkUrl: "",
    expiresOn: "",
  },
  welcome: {
    eyebrow: "Welcome from the Principal",
    title: "Forming teachers of Head, Heart and Hands",
    message:
      "Welcome to Akatsi College of Education. For over six decades we have prepared dedicated, skilled and compassionate teachers for Ghana's classrooms. Our motto — Head, Heart, Hands — reminds us that great teaching unites knowledge, character and practical skill. Whether you are a prospective student, a parent, an alumnus or a partner, we invite you to discover our story and join us in shaping the future of education.",
    name: "The Principal",
    role: "Principal, Akatsi College of Education",
    photoUrl: "",
    linkLabel: "Office of the Principal",
    linkUrl: "/about/office-of-the-principal",
  },
  stats: {
    title: "Akatsi at a Glance",
    intro: "Six decades of shaping Ghana's teaching profession",
    items: [
      { value: 1963, suffix: "", label: "Founded", note: "Over 60 years of teacher education" },
      { value: 2500, suffix: "+", label: "Student-teachers", note: "Enrolled across all levels" },
      { value: 8, suffix: "", label: "Academic departments", note: "Delivering B.Ed programmes" },
      { value: 20000, suffix: "+", label: "Alumni", note: "Teaching across Ghana and beyond" },
    ],
  },
  quickLinks: {
    items: [
      { label: "Apply Now", url: "/admissions", icon: "apply", highlight: true },
      { label: "Student Portal", url: "#", icon: "portal", highlight: false },
      { label: "E-Learning", url: "#", icon: "elearning", highlight: false },
      {
        label: "Library",
        url: "/student-life/student-services",
        icon: "library",
        highlight: false,
      },
      {
        label: "Academic Calendar",
        url: "/downloads?category=timetable",
        icon: "calendar",
        highlight: false,
      },
      { label: "Downloads", url: "/downloads", icon: "download", highlight: false },
      { label: "Student Mobile App", url: "/mobile", icon: "mobile", highlight: false },
    ],
  },
  cta: {
    title: "Ready to become a",
    highlight: "professional teacher?",
    text: "Applications for the Bachelor of Education programmes open each year. Find out how to apply, the entry requirements and what to expect.",
    primaryLabel: "How to Apply",
    primaryUrl: "/admissions",
    secondaryLabel: "Contact Admissions",
    secondaryUrl: "/about/contact-us",
  },
  directory: {
    expertiseTags: [],
    listingEmail: "",
    listingRecipients: "the Registry, with the ICT Unit copied",
  },
  mobileApp: {
    name: "Akatsico",
    tagline:
      "Your results, course registration, fees, circulars and campus news — in one app for students of Akatsi College of Education.",
    playStoreUrl: "",
    appStoreUrl: "",
    apkUrl: "/apps/akatsico.apk",
    apkVersion: "",
    supportEmail: "",
  },
  sections: {
    about: { intro: "", imageUrl: "" },
    academics: { intro: "", imageUrl: "" },
    admissions: { intro: "", imageUrl: "" },
    "student-life": { intro: "", imageUrl: "" },
    alumni: { intro: "", imageUrl: "" },
  },
};

// Merges a stored (possibly partial or stale) value over the defaults; any
// stored value that no longer validates falls back to the default.
export function mergeSetting<TKey extends SettingsKey>(
  key: TKey,
  stored: unknown,
): SiteSettings[TKey] {
  const defaults = DEFAULT_SETTINGS[key];
  if (!stored || typeof stored !== "object") return defaults;
  const merged = { ...defaults, ...stored };
  const parsed = settingsSchemas[key].safeParse(merged);
  return parsed.success ? (parsed.data as SiteSettings[TKey]) : defaults;
}
