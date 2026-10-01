// The staff directory's content model, shared by the public directory, the
// CMS and the API. Client-safe. Ported from the my-clone directory system
// (Sanity) onto akaweb's departments/people tables.
import { z } from "zod";

// The kinds of unit in the directory, in display order. A fixed list: the
// department editor offers these as its Directory category, and the site reads
// names, plurals and icons from here (icon = key in unitCategoryIcons.ts).
export const UNIT_CATEGORIES = [
  { value: "department", title: "Department", plural: "Departments", icon: "landmark" },
  { value: "unit", title: "Unit", plural: "Units", icon: "boxes" },
  { value: "office", title: "Office", plural: "Offices", icon: "briefcase" },
  { value: "directorate", title: "Directorate", plural: "Directorates", icon: "boxes" },
  { value: "section", title: "Section", plural: "Sections", icon: "layout-grid" },
  { value: "centre", title: "Centre", plural: "Centres", icon: "layout-grid" },
  { value: "hall", title: "Hall", plural: "Halls", icon: "home" },
  { value: "library", title: "Library", plural: "Libraries", icon: "book-open" },
] as const;

export type UnitCategoryValue = (typeof UNIT_CATEGORIES)[number]["value"];
export const UNIT_CATEGORY_VALUES = UNIT_CATEGORIES.map((c) => c.value) as [
  UnitCategoryValue,
  ...Array<UnitCategoryValue>,
];

export function findUnitCategory(value: string | null | undefined) {
  return UNIT_CATEGORIES.find((category) => category.value === value);
}

export const STAFF_STATUSES = [
  { value: "active", label: "Active" },
  { value: "post-retirement", label: "Post-retirement" },
  { value: "on-secondment", label: "On secondment" },
  { value: "in-memoriam", label: "In memoriam" },
  { value: "exited", label: "Exited (hidden)" },
] as const;

// People groups whose members are staff, and so get a directory profile.
// Students (SRC) and alumni executives are not staff.
export const DIRECTORY_GROUPS = ["staff", "management", "principal_office", "governing_council"];

const NAME_PREFIX = /^(dr|mr|mrs|ms|miss|prof|rev|very rev|hon|ing|sir)\.?$/i;

/** Profile address from a name: "Dr. Mark Mishiwo" → "mark-mishiwo". */
export function personSlug(name: string): string {
  const words = name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NAME_PREFIX.test(w));
  return (
    words
      .join(" ")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 150) || "staff"
  );
}

// ---- Academic profile (staff_profiles.details) -------------------------------------------------

const text = (max: number) => z.string().trim().max(max);
const url = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || /^https?:\/\//i.test(v), "Use a full https:// address");

export const profileDetailsSchema = z.object({
  externalLinks: z
    .array(z.object({ label: text(60).min(1), url }))
    .max(10)
    .default([]),
  specializations: z.array(text(80).min(1)).max(20).default([]),
  academicInterests: z.array(text(80).min(1)).max(20).default([]),
  spotlightTags: z.array(text(80).min(1)).max(3).default([]),
  education: z
    .array(
      z.object({
        degree: text(120).min(1),
        field: text(150),
        institution: text(150),
        year: text(10),
      }),
    )
    .max(20)
    .default([]),
  careerPositions: z
    .array(
      z.object({
        position: text(150).min(1),
        organization: text(150),
        startYear: text(10),
        endYear: text(10),
      }),
    )
    .max(30)
    .default([]),
  teachingPhilosophy: text(2000).default(""),
  projects: z
    .array(
      z.object({
        title: text(300).min(1),
        role: text(100),
        startDate: text(10),
        endDate: text(10),
        url,
      }),
    )
    .max(30)
    .default([]),
  orcid: text(60).default(""),
  publications: z
    .array(
      z.object({
        title: text(400).min(1),
        year: z.number().int().min(1900).max(2100).nullable(),
        url,
        authors: text(600), // comma-separated; the person's own name is bolded on the site
        venue: text(200),
        type: text(40),
        citations: z.number().int().min(0).nullable(),
      }),
    )
    .max(300)
    .default([]),
  conferences: z
    .array(
      z.object({
        name: text(200).min(1),
        role: text(60),
        location: text(120),
        year: z.number().int().min(1900).max(2100).nullable(),
        url,
      }),
    )
    .max(50)
    .default([]),
  honors: z
    .array(z.object({ title: text(200).min(1), description: text(200) }))
    .max(30)
    .default([]),
});

export type ProfileDetails = z.infer<typeof profileDetailsSchema>;

export function parseProfileDetails(value: unknown): ProfileDetails {
  const parsed = profileDetailsSchema.safeParse(value ?? {});
  return parsed.success ? parsed.data : profileDetailsSchema.parse({});
}

export const PUBLICATION_TYPES = [
  "Article",
  "Preprint",
  "Book",
  "Book chapter",
  "Conference paper",
  "Dissertation",
  "Peer review",
  "Other",
];
export const CONFERENCE_ROLES = [
  "Attendee",
  "Participant",
  "Presenter",
  "Facilitator",
  "Keynote speaker",
  "Panelist",
  "Session chair",
  "Organiser",
];
