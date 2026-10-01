// The site's content model, shared by the public site, the CMS and the API.
// Client-safe: no server imports.
import type { DepartmentKind, PageSection, PostType } from "@aka/db";

export interface SectionDef {
  key: PageSection;
  label: string;
  path: string;
  eyebrow: string;
  intro: string;
}

// The five CMS-driven sections of the main navigation. Each section's pages
// live in the `pages` table; News & Media is built from posts and documents.
export const SECTIONS: Array<SectionDef> = [
  {
    key: "about",
    label: "About Us",
    path: "/about",
    eyebrow: "Who we are",
    intro:
      "Since 1963, Akatsi College of Education has trained teachers who lead with the head, the heart and the hands.",
  },
  {
    key: "academics",
    label: "Academics",
    path: "/academics",
    eyebrow: "Teaching & learning",
    intro:
      "Our departments and units deliver the four-year Bachelor of Education programmes and support every student-teacher to excel.",
  },
  {
    key: "admissions",
    label: "Admissions",
    path: "/admissions",
    eyebrow: "Join us",
    intro:
      "Everything you need to apply, from entry requirements to fees and the reporting checklist.",
  },
  {
    key: "student-life",
    label: "Student Life",
    path: "/student-life",
    eyebrow: "Beyond the classroom",
    intro: "Leadership, welfare, clubs, sports and the services that make campus home.",
  },
  {
    key: "alumni",
    label: "Alumni",
    path: "/alumni",
    eyebrow: "Old students",
    intro: "Stay connected with the Akatsi family and give back to the college that shaped you.",
  },
];

export const SECTION_KEYS = SECTIONS.map((s) => s.key) as [PageSection, ...Array<PageSection>];

export function sectionDef(key: string): SectionDef | undefined {
  return SECTIONS.find((s) => s.key === key);
}

export interface PostTypeDef {
  type: PostType;
  label: string;
  singular: string;
  path: string;
  categories: Array<string>;
}

export const POST_TYPES: Array<PostTypeDef> = [
  {
    type: "news",
    label: "News",
    singular: "News story",
    path: "/news",
    categories: [
      "College News",
      "Academics",
      "Student Life",
      "Sports",
      "Research",
      "Community",
      "Alumni",
    ],
  },
  {
    type: "event",
    label: "Events",
    singular: "Event",
    path: "/events",
    categories: [
      "Academic",
      "Ceremony",
      "Conference",
      "Workshop",
      "Sports",
      "Cultural",
      "Religious",
    ],
  },
  {
    type: "announcement",
    label: "Announcements",
    singular: "Announcement",
    path: "/announcements",
    categories: ["General", "Important", "Admissions", "Examinations", "Press Release", "Vacancy"],
  },
];

export function postTypeDef(type: PostType): PostTypeDef {
  return POST_TYPES.find((t) => t.type === type)!;
}

export const DEPARTMENT_KINDS: Record<
  DepartmentKind,
  { label: string; plural: string; path: string }
> = {
  department: {
    label: "Department",
    plural: "Academic Departments",
    path: "/academics/departments",
  },
  unit: { label: "Unit", plural: "Units of the College", path: "/academics/units" },
};

// People directory groups, shown on pages through the "People" block.
export const PERSON_GROUPS = [
  { key: "principal_office", label: "Office of the Principal" },
  { key: "management", label: "College Management" },
  { key: "governing_council", label: "Governing Council" },
  { key: "student_leadership", label: "Student Leadership (SRC)" },
  { key: "alumni_executive", label: "Alumni Executives" },
  { key: "staff", label: "Teaching & Administrative Staff" },
] as const;

export type PersonGroup = (typeof PERSON_GROUPS)[number]["key"];
export const PERSON_GROUP_KEYS = PERSON_GROUPS.map((g) => g.key) as [
  PersonGroup,
  ...Array<PersonGroup>,
];

export function personGroupLabel(key: string) {
  return PERSON_GROUPS.find((g) => g.key === key)?.label ?? key;
}

export const DOCUMENT_CATEGORIES = [
  { key: "guide", label: "Guides" },
  { key: "form", label: "Forms" },
  { key: "handbook", label: "Handbooks" },
  { key: "policy", label: "Policies" },
  { key: "admissions", label: "Admissions" },
  { key: "timetable", label: "Timetables & Calendars" },
  { key: "report", label: "Reports & Publications" },
  { key: "other", label: "Other" },
] as const;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number]["key"];
export const DOCUMENT_CATEGORY_KEYS = DOCUMENT_CATEGORIES.map((c) => c.key) as [
  DocumentCategory,
  ...Array<DocumentCategory>,
];

export function documentCategoryLabel(key: string) {
  return DOCUMENT_CATEGORIES.find((c) => c.key === key)?.label ?? key;
}
