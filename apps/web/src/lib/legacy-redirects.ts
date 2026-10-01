// Permanent redirects from the old WordPress site's URLs
// (akatsico.edu.gh/history-of-akatsicoe/, /departments/languages/, ...) to
// their new homes, so existing links and search results keep working.
// Client-safe; used by the catch-all section routes and by the WordPress
// migration to rewrite links inside migrated content.

const PAGES: Record<string, string> = {
  "/home": "/",
  "/principals-profile": "/about/office-of-the-principal",
  "/history-of-akatsicoe": "/about/history",
  "/management": "/about/management",
  "/contact-us": "/about/contact-us",
  "/academic-departments": "/academics/departments",
  "/units-of-the-college": "/academics/units",
  "/unit": "/academics/units",
  "/dean-of-student-affairs": "/academics/student-affairs",
  "/dean": "/academics/student-affairs",
  "/admission-requirement": "/admissions",
  "/student-leadership": "/student-life/student-leadership",
  "/student-services": "/student-life/student-services",
  "/photo-gallery": "/student-life",
  "/notice-board": "/announcements",
  "/news-and-events": "/news",
  "/guides-and-docs": "/downloads",
  "/policies-and-documents": "/downloads",
  "/news_and_events": "/news",
  "/notice_board": "/announcements",
  "/departments": "/academics/departments",
  "/guides_and_docs": "/downloads",
};

// Old unit page slugs (children of "Units of the College") → new unit slugs.
export const LEGACY_UNIT_SLUGS: Record<string, string> = {
  "ict-unit": "ict",
  assessment: "assessment",
  quaility_assurance: "quality-assurance",
  quality_assurance: "quality-assurance",
  finance_unit: "finance",
  works: "works",
  "college-registry": "college-registry",
  audit: "internal-audit",
  sts: "supported-teaching-in-schools",
  stores: "stores",
  kitchen: "kitchen",
  transport: "transport",
  procurement: "procurement",
};

const LEGACY_DEPARTMENT_SLUGS: Record<string, string> = {
  "social-studies-creative-arts": "social-sciences",
};

export function legacyRedirect(pathname: string): string | null {
  const path = pathname.toLowerCase().replace(/\/+$/, "") || "/";
  if (PAGES[path]) return PAGES[path];
  const [, first = "", second = "", ...rest] = path.split("/");
  if (!second || rest.length) return null;
  switch (first) {
    case "news_and_events":
      return `/news/${second}`;
    case "notice_board":
      return `/announcements/${second}`;
    case "guides_and_docs":
      return "/downloads";
    case "departments":
      return `/academics/departments/${LEGACY_DEPARTMENT_SLUGS[second] ?? second}`;
    case "units-of-the-college":
      return LEGACY_UNIT_SLUGS[second] ? `/academics/units/${LEGACY_UNIT_SLUGS[second]}` : "/academics/units";
    default:
      return null;
  }
}
