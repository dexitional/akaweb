// Data access for the staff directory (/directory). Server-only — reached
// through server/directory-fns.ts and the /api/directory routes.
//
// Port of my-clone's src/lib/api/directory.ts from Sanity/GROQ to MySQL:
// a person's directory profile is the set of `people` rows sharing a
// profile_slug (their affiliations) plus one staff_profiles row (person-level
// data). Staff counts, rankings, shared-interest counts and colleague lists
// are computed here from live data, never stored — so they can't drift.
// The college is small, so the directory is loaded once per request and
// searched and ranked in memory.
import { getPool } from "@aka/db";
import type { StaffStatus, StaffType } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import { UNIT_CATEGORIES, findUnitCategory, parseProfileDetails } from "#/lib/directory";
import type { ProfileDetails } from "#/lib/directory";
import type {
  AppointedHead,
  ColleagueTab,
  ContactGroup,
  DirectorySearchResults,
  DirectoryStats,
  DirectoryUnit,
  FeaturedDepartment,
  NewFace,
  ProfileData,
  RankedProfile,
  RankedProfileFull,
  ResearcherSpotlight,
  UnitCategory,
  UnitDetail,
  UnitPerson,
  ViewPeriod,
} from "#/lib/directory-types";
import { getAllSettings } from "./api/modules/settings/service.js";

interface Membership {
  groupKey: string;
  name: string;
  title: string;
  unitRole: string | null;
  sortOrder: number;
  deptId: number | null;
  deptSlug: string | null;
  deptName: string | null;
  deptCode: string | null;
  deptKind: "department" | "unit" | null;
  deptPublished: boolean;
  photoUrl: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  updatedAt: string;
  createdAt: string;
}

interface Profile {
  id: number | null; // staff_profiles.id (null until first tracked/edited)
  slug: string;
  name: string;
  title: string;
  roles: Array<string>;
  primary: Membership;
  memberships: Array<Membership>;
  photoUrl?: string;
  staffType?: StaffType;
  status: StaffStatus;
  email?: string;
  phone?: string;
  about?: string;
  details: ProfileDetails;
  views: number;
  shares: number;
  newFace: boolean;
  joinedOn: string | null;
  appointedHead: boolean;
  appointedOn: string | null;
  createdAt: string;
  updatedAt: string;
}

interface Unit {
  id: number;
  kind: "department" | "unit";
  slug: string;
  name: string;
  code?: string;
  category: string;
  summary?: string;
  headName?: string;
  email?: string;
  phone?: string;
  websiteUrl?: string;
  featured: boolean;
  relatedIds: Array<number>;
}

interface Directory {
  profiles: Array<Profile>;
  bySlug: Map<string, Profile>;
  units: Array<Unit>;
}

const hasText = (v: string | null | undefined): v is string =>
  typeof v === "string" && v.trim().length > 0;

// ---- Loading ------------------------------------------------------------------------

async function loadDirectory(): Promise<Directory> {
  const pool = getPool();
  const [[rows], [unitRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT p.group_key, p.name, p.title, p.profile_slug, p.unit_role, p.sort_order, p.photo_url, p.bio, p.email, p.phone,
              p.created_at, p.updated_at,
              d.id AS dept_id, d.slug AS dept_slug, d.name AS dept_name, d.code AS dept_code, d.kind AS dept_kind,
              d.is_published AS dept_published,
              sp.id AS sp_id, sp.staff_type, sp.staff_status, sp.photo_url AS sp_photo, sp.about, sp.details,
              sp.is_new_face, sp.joined_on, sp.is_appointed_head, sp.appointed_on, sp.profile_views, sp.shares,
              sp.updated_at AS sp_updated
       FROM people p
       LEFT JOIN departments d ON d.id = p.department_id
       LEFT JOIN staff_profiles sp ON sp.slug = p.profile_slug
       WHERE p.profile_slug IS NOT NULL AND p.is_active = 1
       ORDER BY p.sort_order, p.id`,
    ),
    pool.query<RowDataPacket[]>(
      `SELECT id, kind, slug, name, code, COALESCE(directory_category, kind) AS category, summary, head_name,
              email, phone, website_url, is_featured_directory, related_ids
       FROM departments WHERE is_published = 1 ORDER BY sort_order, name`,
    ),
  ]);

  const grouped = new Map<string, Array<RowDataPacket>>();
  for (const r of rows) {
    const list = grouped.get(r.profile_slug) ?? [];
    list.push(r);
    grouped.set(r.profile_slug, list);
  }

  const profiles: Array<Profile> = [];
  for (const [slug, list] of grouped) {
    const first = list[0]!;
    if ((first.staff_status ?? "active") === "exited") continue;
    const memberships: Array<Membership> = list.map((r) => ({
      groupKey: r.group_key,
      name: r.name,
      title: r.title,
      unitRole: r.unit_role,
      sortOrder: r.sort_order,
      deptId: r.dept_id,
      deptSlug: r.dept_slug,
      deptName: r.dept_name,
      deptCode: r.dept_code,
      deptKind: r.dept_kind,
      deptPublished: Number(r.dept_published) === 1,
      photoUrl: r.photo_url,
      bio: r.bio,
      email: r.email,
      phone: r.phone,
      updatedAt: r.updated_at,
      createdAt: r.created_at,
    }));
    // Primary affiliation: an academic department, then a unit, then any.
    const rank = (m: Membership) =>
      m.deptKind === "department" && m.deptPublished
        ? 0
        : m.deptKind === "unit" && m.deptPublished
          ? 1
          : 2;
    const primary = [...memberships].sort((a, b) => rank(a) - rank(b))[0]!;
    const roles = [
      ...new Set(
        memberships
          .flatMap((m) => [m.unitRole, m === primary ? null : m.title])
          .filter((t): t is string => hasText(t) && t !== primary.title),
      ),
    ];
    const bios = memberships.map((m) => m.bio).filter(hasText);
    const derivedType: StaffType | undefined = memberships.some((m) => m.deptKind === "department")
      ? "teaching"
      : memberships.some((m) => m.deptKind === "unit")
        ? "non-teaching"
        : undefined;
    const updated = [...memberships.map((m) => m.updatedAt), first.sp_updated]
      .filter(Boolean)
      .sort()
      .pop() as string;
    profiles.push({
      id: first.sp_id ?? null,
      slug,
      name: primary.name,
      title: primary.title,
      roles,
      primary,
      memberships,
      photoUrl:
        first.sp_photo ??
        primary.photoUrl ??
        memberships.find((m) => m.photoUrl)?.photoUrl ??
        undefined,
      staffType: first.staff_type ?? derivedType,
      status: first.staff_status ?? "active",
      email: memberships.find((m) => m.email)?.email ?? undefined,
      phone: memberships.find((m) => m.phone)?.phone ?? undefined,
      about: hasText(first.about) ? first.about : bios.sort((a, b) => b.length - a.length)[0],
      details: parseProfileDetails(first.details),
      views: Number(first.profile_views ?? 0),
      shares: Number(first.shares ?? 0),
      newFace: Number(first.is_new_face) === 1,
      joinedOn: first.joined_on ?? null,
      appointedHead: Number(first.is_appointed_head) === 1,
      appointedOn: first.appointed_on ?? null,
      createdAt: memberships.map((m) => m.createdAt).sort()[0]!,
      updatedAt: updated,
    });
  }

  const units: Array<Unit> = unitRows.map((u) => ({
    id: u.id,
    kind: u.kind,
    slug: u.slug,
    name: u.name,
    code: hasText(u.code) ? u.code.trim() : undefined,
    category: u.category,
    summary: u.summary ?? undefined,
    headName: u.head_name ?? undefined,
    email: hasText(u.email) ? u.email.trim() : undefined,
    phone: hasText(u.phone) ? u.phone.trim() : undefined,
    websiteUrl: hasText(u.website_url) ? u.website_url.trim() : undefined,
    featured: Number(u.is_featured_directory) === 1,
    relatedIds: Array.isArray(u.related_ids) ? u.related_ids.map(Number) : [],
  }));

  return { profiles, bySlug: new Map(profiles.map((p) => [p.slug, p])), units };
}

function department(p: Profile) {
  return p.primary.deptPublished ? p.primary : undefined;
}

function toUnitPerson(p: Profile): UnitPerson {
  const dept = department(p);
  return {
    slug: p.slug,
    name: p.name,
    title: hasText(p.title) ? p.title : undefined,
    photoUrl: p.photoUrl,
    staffType: p.staffType,
    department: dept?.deptName ?? undefined,
    departmentSlug: dept?.deptSlug ?? undefined,
    email: p.email,
  };
}

function staffOfUnit(dir: Directory, unitId: number) {
  return dir.profiles.filter((p) => p.memberships.some((m) => m.deptId === unitId));
}

const byViewsThenName = (a: Profile, b: Profile) =>
  b.views - a.views || a.name.localeCompare(b.name);

// ---- Views by period ------------------------------------------------------------------

const PERIOD_DAYS: Record<ViewPeriod, number> = { today: 1, week: 7, month: 30, year: 365 };

async function periodViews(period: ViewPeriod): Promise<Map<string, number>> {
  const [rows] = await getPool().query<RowDataPacket[]>(
    `SELECT sp.slug, SUM(v.views) AS views FROM profile_views v JOIN staff_profiles sp ON sp.id = v.profile_id
     WHERE v.viewed_on > CURDATE() - INTERVAL ? DAY GROUP BY sp.slug`,
    [PERIOD_DAYS[period]],
  );
  return new Map(rows.map((r) => [r.slug as string, Number(r.views)]));
}

// Ranked by views in the period, then all-time views; people with a photo
// break remaining ties so a quiet week still shows a presentable grid.
function rankProfiles(profiles: Array<Profile>, views: Map<string, number>) {
  return [...profiles].sort(
    (a, b) =>
      (views.get(b.slug) ?? 0) - (views.get(a.slug) ?? 0) ||
      b.views - a.views ||
      Number(Boolean(b.photoUrl)) - Number(Boolean(a.photoUrl)) ||
      a.name.localeCompare(b.name),
  );
}

// ---- Home -----------------------------------------------------------------------------

const MONTHS_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
function monthYearShort(date: string | null): string {
  const m = date?.match(/^(\d{4})-(\d{2})/);
  return m ? `${MONTHS_SHORT[Number(m[2]) - 1]} ${m[1]}` : "";
}

function unitCategories(dir: Directory): Array<UnitCategory> {
  return UNIT_CATEGORIES.map((c) => ({
    name: c.title,
    pluralName: c.plural,
    slug: c.value,
    icon: c.icon,
    unitCount: dir.units.filter((u) => u.category === c.value).length,
  }));
}

function directoryStats(dir: Directory): DirectoryStats {
  return {
    staff: dir.profiles.length,
    departments: dir.units.filter((u) => u.category === "department").length,
    units: dir.units.filter((u) => u.category === "unit").length,
    offices: dir.units.filter((u) => u.category === "office").length,
  };
}

// "Meet a researcher": one teaching-staff profile per UTC day, walking a
// seeded shuffle so everyone gets a turn before anyone repeats.
function dailyResearcher(dir: Directory): ResearcherSpotlight | null {
  const candidates = dir.profiles
    .filter((p) => p.status !== "in-memoriam")
    .sort((a, b) => a.slug.localeCompare(b.slug));
  const teaching = candidates.filter((p) => p.staffType === "teaching");
  const pool = teaching.length > 0 ? teaching : candidates;
  if (pool.length === 0) return null;
  const pick = pool[dailyRotationIndex(new Date(), pool.length)]!;
  const tags =
    [pick.details.spotlightTags, pick.details.academicInterests, pick.details.specializations].find(
      (l) => l.length > 0,
    ) ?? [];
  const dept = department(pick);
  return {
    name: pick.name,
    role: pick.title,
    department: dept?.deptName ?? "",
    slug: pick.slug,
    photoUrl: pick.photoUrl,
    tags: tags.slice(0, 3),
  };
}

function dailyRotationIndex(date: Date, size: number): number {
  const day = Math.floor(date.getTime() / 86_400_000);
  const cycle = Math.floor(day / size);
  const order = Array.from({ length: size }, (_, i) => i);
  const random = mulberry32(cycle);
  for (let i = size - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order[day % size]!;
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), a | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function unitLeaders(dir: Directory, unit: Unit) {
  return dir.profiles
    .flatMap((p) =>
      p.memberships
        .filter((m) => m.deptId === unit.id && hasText(m.unitRole))
        .map((m) => ({ profile: p, membership: m })),
    )
    .sort((a, b) => a.membership.sortOrder - b.membership.sortOrder);
}

export async function getDirectoryHome() {
  const [dir, settings, weekViews] = await Promise.all([
    loadDirectory(),
    getAllSettings(),
    periodViews("week"),
  ]);

  const mostViewed: Array<RankedProfile> = rankProfiles(dir.profiles, weekViews)
    .slice(0, 8)
    .map((p, i) => ({
      rank: i + 1,
      name: p.name,
      title: p.title,
      deptCode: department(p)?.deptCode ?? undefined,
      slug: p.slug,
      photoUrl: p.photoUrl,
      views: weekViews.get(p.slug) ?? 0,
    }));

  const newFaces: Array<NewFace> = dir.profiles
    .filter((p) => p.newFace)
    .sort((a, b) => (b.joinedOn ?? "").localeCompare(a.joinedOn ?? ""))
    .slice(0, 6)
    .map((p) => ({
      name: p.name,
      title: p.title,
      department: department(p)?.deptName ?? "",
      joined: monthYearShort(p.joinedOn ?? p.createdAt),
      slug: p.slug,
      photoUrl: p.photoUrl,
    }));

  const appointedHeads: Array<AppointedHead> = dir.profiles
    .filter((p) => p.appointedHead)
    .sort((a, b) => (b.appointedOn ?? "").localeCompare(a.appointedOn ?? ""))
    .slice(0, 5)
    .map((p) => {
      const lead = p.memberships.find((m) => hasText(m.unitRole));
      return {
        name: p.name,
        role: lead?.unitRole ?? p.title,
        department: lead?.deptName ?? department(p)?.deptName ?? undefined,
        departmentSlug: lead?.deptSlug ?? department(p)?.deptSlug ?? undefined,
        slug: p.slug,
        since: p.appointedOn ? monthYearShort(p.appointedOn) : undefined,
      };
    });

  // Featured on the directory home; until any are flagged, the largest
  // academic departments stand in.
  const flagged = dir.units.filter((u) => u.featured);
  const featuredUnits = (
    flagged.length > 0
      ? flagged
      : dir.units
          .filter((u) => u.category === "department")
          .sort((a, b) => staffOfUnit(dir, b.id).length - staffOfUnit(dir, a.id).length)
          .slice(0, 4)
  ).slice(0, 6);
  const featuredDepartments: Array<FeaturedDepartment> = featuredUnits.map((u) => ({
    name: u.name,
    head: unitLeaders(dir, u)[0]?.profile.name ?? u.headName ?? "",
    staff: staffOfUnit(dir, u.id).length,
    slug: u.slug,
  }));

  return {
    stats: directoryStats(dir),
    mostViewed,
    newFaces,
    researcher: dailyResearcher(dir),
    appointedHeads,
    featuredDepartments,
    categories: unitCategories(dir),
    expertiseTags: expertiseTags(dir, settings.directory.expertiseTags),
    listing: {
      email: settings.directory.listingEmail || settings.contact.email,
      recipients: settings.directory.listingRecipients,
    },
  };
}

// Curated in Admin → Settings → Directory; otherwise the most common
// interests and specialisations across profiles.
function expertiseTags(dir: Directory, curated: Array<string>): Array<string> {
  if (curated.length > 0) return curated;
  const counts = new Map<string, { label: string; n: number }>();
  for (const p of dir.profiles) {
    for (const label of new Set([...p.details.academicInterests, ...p.details.specializations])) {
      const key = label.toLowerCase();
      const entry = counts.get(key) ?? { label, n: 0 };
      entry.n++;
      counts.set(key, entry);
    }
  }
  return [...counts.values()]
    .sort((a, b) => b.n - a.n || a.label.localeCompare(b.label))
    .slice(0, 12)
    .map((e) => e.label);
}

export async function getDirectoryStats() {
  return directoryStats(await loadDirectory());
}

// ---- Search ---------------------------------------------------------------------------

function singular(word: string): string {
  if (word.length > 4 && word.endsWith("ies")) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith("s") && !word.endsWith("ss")) return word.slice(0, -1);
  return word;
}

// "senior lect" → ["senior", "lect"]: every word must prefix-match somewhere.
function searchPrefixes(query: string): Array<string> {
  return query
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s'-]/gu, " ")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 6)
    .map(singular);
}

const wordsOf = (text?: string | null) =>
  (text ?? "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
const allMatch = (prefixes: Array<string>, text: string) => {
  const words = wordsOf(text);
  return prefixes.every((prefix) => words.some((w) => w.startsWith(prefix)));
};

export async function searchDirectory(
  query: string,
  limits = { people: 6, units: 4, categories: 3, expertise: 4 },
): Promise<DirectorySearchResults> {
  const prefixes = searchPrefixes(query);
  if (prefixes.length === 0) return { people: [], units: [], categories: [], expertise: [] };
  const dir = await loadDirectory();

  const categoryValues = UNIT_CATEGORIES.filter((c) =>
    allMatch(prefixes, `${c.title} ${c.plural}`),
  ).map((c) => c.value as string);

  const people = dir.profiles.filter((p) => {
    const tags = [...p.details.academicInterests, ...p.details.specializations].join(" ");
    const haystack = [p.name, p.title, ...p.roles, department(p)?.deptName, tags].join(" ");
    return allMatch(prefixes, haystack);
  });
  // Relevance: every word in the name > some word in the name > designation
  // or department > interests only. Ties: most viewed, then name.
  const hits = (text?: string | null) =>
    prefixes.filter((prefix) => wordsOf(text).some((w) => w.startsWith(prefix))).length;
  const score = (p: Profile) => {
    const nameHits = hits(p.name);
    if (nameHits === prefixes.length) return 3;
    if (nameHits > 0) return 2;
    return hits(`${p.title} ${p.roles.join(" ")} ${department(p)?.deptName ?? ""}`) > 0 ? 1 : 0;
  };
  const rankedPeople = people
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || byViewsThenName(a.p, b.p))
    .slice(0, limits.people)
    .map(({ p }) => toUnitPerson(p));

  const units = dir.units
    .filter(
      (u) => allMatch(prefixes, `${u.name} ${u.code ?? ""}`) || categoryValues.includes(u.category),
    )
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, limits.units)
    .map((u) => ({
      name: u.name,
      code: u.code,
      slug: u.slug,
      category: findUnitCategory(u.category)?.title,
    }));

  const counts = new Map<string, { label: string; count: number }>();
  for (const p of dir.profiles) {
    for (const label of new Set([...p.details.academicInterests, ...p.details.specializations])) {
      if (!allMatch(prefixes, label)) continue;
      const key = label.trim().toLowerCase();
      const entry = counts.get(key) ?? { label: label.trim(), count: 0 };
      entry.count++;
      counts.set(key, entry);
    }
  }

  return {
    people: rankedPeople,
    units,
    categories: unitCategories(dir)
      .filter((c) => categoryValues.includes(c.slug))
      .slice(0, limits.categories),
    expertise: [...counts.values()]
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, limits.expertise),
  };
}

const NAME_PREFIXES = /^(dr|mr|mrs|ms|miss|prof|rev|sir|hon|ing)\.?$/i;

/** Surname initial: the last name word, ignoring titles like "Dr." and bracketed bits like "(Mrs.)". */
export function surnameInitial(name: string): string {
  const words = name
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NAME_PREFIXES.test(w));
  return (words[words.length - 1] ?? "").charAt(0).toUpperCase();
}

export async function getStaffByInitial(letter: string): Promise<Array<UnitPerson>> {
  const dir = await loadDirectory();
  return dir.profiles
    .filter((p) => surnameInitial(p.name) === letter.toUpperCase())
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(toUnitPerson);
}

// ---- Units ----------------------------------------------------------------------------

function directoryUnits(dir: Directory): Array<DirectoryUnit> {
  return dir.units
    .map((u) => ({
      name: u.name,
      code: u.code,
      slug: u.slug,
      websiteUrl: u.websiteUrl,
      email: u.email,
      phone: u.phone,
      categorySlug: u.category,
      categoryName: findUnitCategory(u.category)?.title,
      staffCount: staffOfUnit(dir, u.id).length,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getUnitList() {
  const dir = await loadDirectory();
  return { categories: unitCategories(dir), units: directoryUnits(dir) };
}

export async function getUnit(
  slug: string,
): Promise<{ unit: UnitDetail; directoryStaff: Array<UnitPerson> } | null> {
  const dir = await loadDirectory();
  // Departments win a (rare) slug clash with a unit.
  const unit = dir.units
    .filter((u) => u.slug === slug)
    .sort((a) => (a.kind === "department" ? -1 : 1))[0];
  if (!unit) return null;

  const leaders = unitLeaders(dir, unit);
  const leaderSlugs = new Set(leaders.map((l) => l.profile.slug));
  const staff = staffOfUnit(dir, unit.id)
    .filter((p) => !leaderSlugs.has(p.slug))
    .sort((a, b) => {
      const order = (p: Profile) => p.memberships.find((m) => m.deptId === unit.id)?.sortOrder ?? 0;
      return order(a) - order(b) || a.name.localeCompare(b.name);
    });
  const category = findUnitCategory(unit.category);

  return {
    unit: {
      slug: unit.slug,
      name: unit.name,
      code: unit.code,
      category: category
        ? { name: category.title, pluralName: category.plural, slug: category.value }
        : undefined,
      leaders: leaders.map(({ profile, membership }) => ({
        ...toUnitPerson(profile),
        role: membership.unitRole ?? undefined,
      })),
      staff: staff.map(toUnitPerson),
      relatedUnits: dir.units
        .filter((u) => unit.relatedIds.includes(u.id))
        .map((u) => ({ name: u.name, slug: u.slug })),
      summary: unit.summary,
      pageHref: `/academics/${unit.kind === "unit" ? "units" : "departments"}/${unit.slug}`,
    },
    directoryStaff: [...dir.profiles]
      .sort((a, b) => a.name.localeCompare(b.name))
      .map(toUnitPerson),
  };
}

// ---- Profiles ---------------------------------------------------------------------------

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
function monthYear(date: string | undefined): string | undefined {
  const m = date?.match(/^(\d{4})(?:-(\d{2}))?/);
  if (!m) return undefined;
  return m[2] ? `${MONTHS[Number(m[2]) - 1]} ${m[1]}` : m[1];
}

function projectPeriod(start?: string, end?: string): string | undefined {
  const from = monthYear(start);
  const to = monthYear(end);
  if (from) return `${from} - ${to ?? "Present"}`;
  return to ? `Until ${to}` : undefined;
}

function timeAgo(value: string | undefined): string {
  if (!value) return "";
  const then = Date.parse(value.replace(" ", "T") + (value.includes("Z") ? "" : "Z"));
  if (Number.isNaN(then)) return "";
  const seconds = Math.max(0, (Date.now() - then) / 1000);
  const units: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["year", 31_536_000],
    ["month", 2_592_000],
    ["week", 604_800],
    ["day", 86_400],
    ["hour", 3600],
    ["minute", 60],
  ];
  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  for (const [unit, size] of units)
    if (seconds >= size) return format.format(-Math.floor(seconds / size), unit);
  return "just now";
}

function firstName(fullName: string): string {
  const words = fullName
    .replace(/\([^)]*\)/g, " ")
    .split(/\s+/)
    .filter((w) => w && !NAME_PREFIXES.test(w));
  return words[0] ?? fullName;
}

function toColleague(p: Profile, tags?: Array<string>) {
  const dept = department(p);
  return {
    slug: p.slug,
    name: p.name,
    title: p.title,
    department: dept?.deptName ?? undefined,
    photoUrl: p.photoUrl,
    ...(tags && tags.length ? { tags } : {}),
  };
}

const COLLEAGUE_TAB_LIMIT = 8;

export async function getProfile(slug: string): Promise<ProfileData | null> {
  const dir = await loadDirectory();
  const p = dir.bySlug.get(slug);
  if (!p) return null;
  const others = dir.profiles.filter((o) => o.slug !== p.slug);
  const lower = (list: Array<string>) => list.map((x) => x.toLowerCase());
  const dept = department(p);
  const settings = await getAllSettings();

  // How many other staff share each interest — live, never stored.
  const interests = p.details.academicInterests.map((label) => ({
    label,
    count: others.filter((o) => lower(o.details.academicInterests).includes(label.toLowerCase()))
      .length,
  }));

  const selfWords = new Set(wordsOf(p.name).filter((w) => !NAME_PREFIXES.test(w)));
  const isSelf = (author: string) => {
    const words = wordsOf(author);
    return words.length > 1 && words.filter((w) => selfWords.has(w)).length >= 2;
  };

  // Colleague tabs.
  const deptColleagues = dept
    ? others
        .filter((o) => o.memberships.some((m) => m.deptId === dept.deptId))
        .sort(byViewsThenName)
    : [];
  const interestGroups = p.details.academicInterests
    .map((label) => ({
      label,
      colleagues: others
        .filter((o) => lower(o.details.academicInterests).includes(label.toLowerCase()))
        .sort(byViewsThenName)
        .slice(0, COLLEAGUE_TAB_LIMIT)
        .map((o) => toColleague(o)),
    }))
    .filter((g) => g.colleagues.length > 0);
  const interestTotal = new Set(interestGroups.flatMap((g) => g.colleagues.map((c) => c.slug)))
    .size;
  const mySpecs = lower(p.details.specializations);
  const specColleagues = others
    .map((o) => ({
      o,
      shared: o.details.specializations.filter((s) => mySpecs.includes(s.toLowerCase())),
    }))
    .filter((x) => x.shared.length > 0)
    .sort((a, b) => byViewsThenName(a.o, b.o));

  let coviews: Array<{ slug: string; views: number }> = [];
  if (p.id) {
    const [rows] = await getPool().query<RowDataPacket[]>(
      `SELECT sp.slug, c.views FROM profile_coviews c
       JOIN staff_profiles sp ON sp.id = IF(c.profile_a = ?, c.profile_b, c.profile_a)
       WHERE c.profile_a = ? OR c.profile_b = ? ORDER BY c.views DESC`,
      [p.id, p.id, p.id],
    );
    coviews = rows
      .map((r) => ({ slug: r.slug as string, views: Number(r.views) }))
      .filter((c) => dir.bySlug.has(c.slug));
  }

  const tabs: Array<ColleagueTab> = [
    {
      id: "dept",
      label: dept?.deptName ? `In ${dept.deptName}` : "In department",
      count: deptColleagues.length,
      colleagues: deptColleagues.slice(0, COLLEAGUE_TAB_LIMIT).map((o) => toColleague(o)),
    },
    {
      id: "interest",
      label: "Shared research interests",
      count: interestTotal,
      colleagues: [],
      groups: interestGroups,
    },
    {
      id: "spec",
      label: "Shared specialisations",
      count: specColleagues.length,
      colleagues: specColleagues
        .slice(0, COLLEAGUE_TAB_LIMIT)
        .map((x) => toColleague(x.o, x.shared)),
    },
    {
      id: "coview",
      label: "Frequently viewed",
      count: coviews.length,
      colleagues: coviews
        .slice(0, COLLEAGUE_TAB_LIMIT)
        .map((c) => toColleague(dir.bySlug.get(c.slug)!)),
    },
  ];

  const d = p.details;
  const publications = d.publications.map((pub) => {
    const citations =
      pub.citations && pub.citations > 0
        ? `${pub.citations} citation${pub.citations === 1 ? "" : "s"}`
        : undefined;
    return {
      title: pub.title,
      url: hasText(pub.url) ? pub.url : undefined,
      year: pub.year ?? undefined,
      authorsWithSelfBold: pub.authors
        .split(",")
        .map((a) => a.trim())
        .filter(Boolean)
        .map((text) => ({ text, bold: isSelf(text) })),
      metaLine: [pub.venue, pub.type, citations].filter(hasText).join(" · "),
    };
  });

  const role = [p.title, ...p.roles].filter(hasText).join(" · ");

  return {
    slug: p.slug,
    name: p.name,
    firstName: firstName(p.name),
    role,
    staffStatus: p.status,
    department: dept?.deptCode ?? "",
    departmentName: dept?.deptName ?? undefined,
    departmentSlug: dept?.deptSlug ?? undefined,
    photoUrl: p.photoUrl,
    email: p.email,
    phone: p.phone,
    externalLinks: d.externalLinks.map((l) => ({
      label: l.label,
      url: hasText(l.url) ? l.url : undefined,
    })),
    updatedAgo: timeAgo(p.updatedAt),
    stats: {
      profileViews: p.views,
      shares: p.shares,
      colleaguesShareInterest: interests[0]?.count ?? 0,
    },
    aboutParagraphs: (p.about ?? "")
      .split(/\n\s*\n|\r?\n/)
      .map((x) => x.trim())
      .filter(Boolean),
    specializations: d.specializations,
    academicInterests: interests,
    education: d.education.map((e) => ({
      degree: e.degree,
      field: e.field,
      institution: e.institution,
      year: e.year,
    })),
    careerPositions: d.careerPositions.map((c) => ({
      position: c.position,
      organization: c.organization || undefined,
      startYear: c.startYear || undefined,
      endYear: c.endYear || undefined,
    })),
    teachingPhilosophy: d.teachingPhilosophy || undefined,
    projects: d.projects.map((x) => ({
      title: x.title,
      role: x.role || undefined,
      period: projectPeriod(x.startDate || undefined, x.endDate || undefined),
      url: hasText(x.url) ? x.url : undefined,
    })),
    publications:
      publications.length > 0 || d.orcid
        ? { orcid: d.orcid || undefined, shown: publications }
        : undefined,
    honors: d.honors.map((h) => ({ title: h.title, org: h.description, year: "" })),
    conferences: d.conferences.map((c) => ({
      name: c.name,
      role: c.role || undefined,
      location: c.location || undefined,
      year: c.year ?? undefined,
      url: hasText(c.url) ? c.url : undefined,
    })),
    colleagueTabs: tabs.filter((t) => t.count > 0),
    organization: dept?.deptName
      ? `${settings.identity.name};${dept.deptName}`
      : settings.identity.name,
    topInterest: d.academicInterests[0] ?? d.specializations[0],
  };
}

export async function getProfileMeta(slug: string) {
  const dir = await loadDirectory();
  const p = dir.bySlug.get(slug);
  if (!p) return null;
  return {
    name: p.name,
    role: p.title,
    departmentName: department(p)?.deptName ?? undefined,
    photoUrl: p.photoUrl,
  };
}

export async function getStaffBySlugs(slugs: Array<string>): Promise<Array<UnitPerson>> {
  const wanted = [...new Set(slugs)].slice(0, 100);
  if (wanted.length === 0) return [];
  const dir = await loadDirectory();
  return wanted.flatMap((s) => {
    const p = dir.bySlug.get(s);
    return p ? [toUnitPerson(p)] : [];
  });
}

// ---- Tracking (best-effort; never breaks a page) ----------------------------------------------

async function profileId(slug: string): Promise<number | null> {
  const pool = getPool();
  const [exists] = await pool.execute<RowDataPacket[]>(
    "SELECT 1 FROM people WHERE profile_slug = ? LIMIT 1",
    [slug],
  );
  if (!exists[0]) return null;
  await pool.execute("INSERT IGNORE INTO staff_profiles (slug) VALUES (?)", [slug]);
  const [rows] = await pool.execute<RowDataPacket[]>(
    "SELECT id FROM staff_profiles WHERE slug = ?",
    [slug],
  );
  return (rows[0]?.id as number | undefined) ?? null;
}

export async function trackProfileView(slug: string) {
  try {
    const id = await profileId(slug);
    if (!id) return;
    const pool = getPool();
    await pool.execute(
      "UPDATE staff_profiles SET profile_views = profile_views + 1, updated_at = updated_at WHERE id = ?",
      [id],
    );
    await pool.execute(
      "INSERT INTO profile_views (profile_id, viewed_on, views) VALUES (?, CURDATE(), 1) ON DUPLICATE KEY UPDATE views = views + 1",
      [id],
    );
  } catch (err) {
    console.error("Profile view tracking failed:", err);
  }
}

export async function trackProfileShare(slug: string) {
  try {
    const id = await profileId(slug);
    if (id)
      await getPool().execute(
        "UPDATE staff_profiles SET shares = shares + 1, updated_at = updated_at WHERE id = ?",
        [id],
      );
  } catch (err) {
    console.error("Profile share tracking failed:", err);
  }
}

// One visitor viewed both profiles in a session; pairs are stored once (a < b).
export async function trackProfileCoView(fromSlug: string, toSlug: string) {
  if (fromSlug === toSlug) return;
  try {
    const [a, b] = await Promise.all([profileId(fromSlug), profileId(toSlug)]);
    if (!a || !b) return;
    await getPool().execute(
      "INSERT INTO profile_coviews (profile_a, profile_b, views) VALUES (?, ?, 1) ON DUPLICATE KEY UPDATE views = views + 1",
      [Math.min(a, b), Math.max(a, b)],
    );
  } catch (err) {
    console.error("Co-view tracking failed:", err);
  }
}

// ---- Contacts & most visited --------------------------------------------------------------

// "Head: Dr. Jane Doe" — who to ask for when a unit has no listed line yet.
function unitHeadLine(dir: Directory, u: Unit): string | undefined {
  const leader = unitLeaders(dir, u)[0];
  const name = leader?.profile.name ?? u.headName;
  return name ? `${leader?.membership.unitRole ?? "Head"}: ${name}` : undefined;
}

export async function getContacts(): Promise<Array<ContactGroup>> {
  const [dir, settings] = await Promise.all([loadDirectory(), getAllSettings()]);
  const { contact, identity } = settings;
  const primary: ContactGroup = {
    key: "primary",
    heading: "Primary Contacts",
    subtext: "Key college offices for general inquiries",
    contacts: [
      {
        name: identity.name,
        tag: { label: "PRIMARY", color: "primary" },
        description: contact.address.replace(/\n+/g, ", "),
        email: contact.email || undefined,
        phone: [contact.phone, contact.altPhone].filter(Boolean).join(", ") || undefined,
        category: "primary",
      },
    ],
  };
  const groups = UNIT_CATEGORIES.map((c) => {
    const contacts = dir.units
      .filter((u) => u.category === c.value)
      .map((u) => ({
        name: u.name,
        description: unitHeadLine(dir, u),
        email: u.email,
        phone: u.phone,
        website: u.websiteUrl
          ? { label: u.websiteUrl.replace(/^https?:\/\//, ""), href: u.websiteUrl }
          : undefined,
        code: u.code,
        href: `/directory/d/${u.slug}`,
        category: c.value,
      }));
    return {
      key: c.value,
      heading: c.plural,
      subtext: `${contacts.length} ${contacts.length === 1 ? "contact" : "contacts"}`,
      contacts,
    };
  }).filter((g) => g.contacts.length > 0);
  return [primary, ...groups];
}

export async function getMostVisited(period: ViewPeriod) {
  const [dir, views] = await Promise.all([loadDirectory(), periodViews(period)]);
  const profiles: Array<RankedProfileFull> = rankProfiles(dir.profiles, views).map((p, i) => ({
    rank: i + 1,
    name: p.name,
    title: p.title,
    deptCode: department(p)?.deptCode ?? undefined,
    department: department(p)?.deptName ?? undefined,
    departmentSlug: department(p)?.deptSlug ?? undefined,
    slug: p.slug,
    photoUrl: p.photoUrl,
    views: views.get(p.slug) ?? 0,
    createdAt: p.createdAt,
  }));
  const departments = dir.units
    .filter((u) => staffOfUnit(dir, u.id).length > 0)
    .map((u) => ({ slug: u.slug, name: u.name }))
    .sort((a, b) => a.name.localeCompare(b.name));
  return { profiles, departments };
}
