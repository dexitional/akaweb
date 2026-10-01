// Shapes the directory pages render (ported from the my-clone directory
// components). Client-safe; filled by server/directory.ts.
import type { StaffStatus, StaffType } from "@aka/db";

export interface UnitPerson {
  slug?: string;
  name: string;
  title?: string;
  photoUrl?: string;
  staffType?: StaffType;
  department?: string;
  departmentSlug?: string;
  email?: string;
}

export interface UnitLeader extends UnitPerson {
  role?: string; // their role within this unit, e.g. "Head of Department"
}

export interface RelatedUnit {
  name: string;
  slug: string;
}

export interface UnitCategory {
  name: string;
  pluralName: string;
  slug: string;
  icon?: string;
  unitCount: number;
}

export interface DirectoryUnit {
  name: string;
  code?: string;
  slug: string;
  websiteUrl?: string;
  email?: string;
  phone?: string;
  categorySlug?: string;
  categoryName?: string;
  staffCount: number;
}

export interface UnitDetail {
  slug: string;
  name: string;
  code?: string;
  category?: { name: string; pluralName: string; slug: string };
  leaders: Array<UnitLeader>;
  staff: Array<UnitPerson>; // this unit's staff, leaders excluded
  relatedUnits: Array<RelatedUnit>;
  summary?: string;
  pageHref?: string; // the unit's full page on the main site
}

export interface RankedProfile {
  rank: number;
  name: string;
  title: string;
  deptCode?: string;
  slug: string;
  photoUrl?: string;
  views: number;
}

export interface FeaturedDepartment {
  name: string;
  head: string;
  staff: number;
  slug: string;
}

export interface NewFace {
  name: string;
  title: string;
  department: string;
  joined: string;
  slug: string;
  photoUrl?: string;
}

export interface ResearcherSpotlight {
  name: string;
  role: string;
  department: string;
  tags: Array<string>;
  slug: string;
  photoUrl?: string;
}

export interface AppointedHead {
  name: string;
  role: string;
  department?: string;
  departmentSlug?: string;
  slug: string;
  since?: string;
}

export interface DirectoryStats {
  staff: number;
  departments: number;
  units: number;
  offices: number;
}

export interface DirectorySearchResults {
  people: Array<UnitPerson>;
  units: Array<{ name: string; code?: string; slug: string; category?: string }>;
  categories: Array<UnitCategory>;
  expertise: Array<{ label: string; count: number }>;
}

// ---- Profile page ---------------------------------------------------------------

export interface EducationEntry {
  degree: string;
  field: string;
  institution: string;
  year: string;
}

export interface CareerPosition {
  position: string;
  organization?: string;
  startYear?: string;
  endYear?: string; // empty = current role
}

export interface ExternalLink {
  label: string;
  url?: string;
}

export interface Publication {
  title: string;
  url?: string;
  year?: number;
  authorsWithSelfBold: Array<{ text: string; bold?: boolean }>;
  metaLine: string;
}

export interface Colleague {
  slug: string;
  name: string;
  title?: string;
  department?: string;
  photoUrl?: string;
  tags?: Array<string>;
}

export interface ColleagueGroup {
  label: string;
  colleagues: Array<Colleague>;
}

export interface ColleagueTab {
  id: "dept" | "interest" | "spec" | "coview";
  label: string;
  count: number;
  colleagues: Array<Colleague>;
  groups?: Array<ColleagueGroup>;
}

export interface Project {
  title: string;
  role?: string;
  period?: string;
  url?: string;
}

export interface Conference {
  name: string;
  role?: string;
  location?: string;
  year?: number;
  url?: string;
}

export interface ProfileData {
  slug: string;
  name: string;
  firstName: string;
  role: string;
  staffStatus?: StaffStatus;
  department: string;
  departmentName?: string;
  departmentSlug?: string;
  photoUrl?: string;
  email?: string;
  phone?: string;
  externalLinks: Array<ExternalLink>;
  updatedAgo: string;
  stats: { profileViews: number; shares: number; colleaguesShareInterest: number };
  aboutParagraphs: Array<string>;
  specializations: Array<string>;
  academicInterests: Array<{ label: string; count: number }>;
  education: Array<EducationEntry>;
  careerPositions: Array<CareerPosition>;
  teachingPhilosophy?: string;
  projects: Array<Project>;
  publications?: { orcid?: string; shown: Array<Publication> };
  honors: Array<{ title: string; org: string; year: string }>;
  conferences: Array<Conference>;
  colleagueTabs: Array<ColleagueTab>;
  organization: string; // for the vCard ORG field
  topInterest?: string;
}

// ---- Contacts --------------------------------------------------------------------

export interface ContactCard {
  name: string;
  tag?: { label: string; color: "primary" | "international" | "regional" };
  description?: string;
  email?: string;
  website?: { label: string; href: string };
  phone?: string;
  code?: string;
  href?: string; // the unit's directory page
  category?: string; // unit category value, for the filter tabs
}

export interface ContactGroup {
  key: string;
  heading: string;
  subtext?: string;
  contacts: Array<ContactCard>;
}

export type ViewPeriod = "today" | "week" | "month" | "year";

export interface RankedProfileFull {
  rank: number;
  name: string;
  title: string;
  deptCode?: string;
  department?: string;
  departmentSlug?: string;
  slug: string;
  photoUrl?: string;
  views: number;
  createdAt: string;
}
