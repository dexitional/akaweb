import type { AdminRole } from "@aka/db";

// The CMS role matrix — the single source of truth for who can see and change
// each part of the admin system. API guards (requirePermission), the sidebar,
// route guards and edit controls all read from here.
//
//   "view"   — can open the pages and read the records
//   "manage" — can also create, edit and delete
//
// Roles without an entry for a module can't reach it at all.

export type AdminModule =
  | "dashboard"
  | "spotlights"
  | "pages"
  | "posts"
  | "departments"
  | "people"
  | "documents"
  | "media"
  | "messages"
  | "settings"
  | "users"
  | "activity";

export type Access = "view" | "manage";

const ALL_MODULES: Array<AdminModule> = [
  "dashboard",
  "spotlights",
  "pages",
  "posts",
  "departments",
  "people",
  "documents",
  "media",
  "messages",
  "settings",
  "users",
  "activity",
];

const CONTENT: Partial<Record<AdminModule, Access>> = {
  dashboard: "view",
  spotlights: "manage",
  pages: "manage",
  posts: "manage",
  departments: "manage",
  people: "manage",
  documents: "manage",
  media: "manage",
};

const PERMISSIONS: Record<AdminRole, Partial<Record<AdminModule, Access>>> = {
  super_admin: Object.fromEntries(ALL_MODULES.map((m) => [m, "manage"])),
  admin: { ...CONTENT, messages: "manage", settings: "manage", activity: "view" },
  editor: { ...CONTENT, messages: "view" },
  // Authors write news, events and announcements as drafts for an editor to
  // publish (see POST_PUBLISHERS), and can use the media library.
  author: { dashboard: "view", posts: "manage", media: "manage" },
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  editor: "Editor",
  author: "Author",
};

export const ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
  super_admin: "Everything, including user accounts.",
  admin: "All content, messages, settings and the activity log.",
  editor: "All website content and the media library.",
  author: "Writes posts as drafts for review; cannot publish.",
};

export function accessTo(role: AdminRole, module: AdminModule): Access | null {
  return PERMISSIONS[role][module] ?? null;
}

export const canView = (role: AdminRole, module: AdminModule) => accessTo(role, module) !== null;
export const canManage = (role: AdminRole, module: AdminModule) => accessTo(role, module) === "manage";

export function rolesWith(module: AdminModule, level: Access): Array<AdminRole> {
  return (Object.keys(PERMISSIONS) as Array<AdminRole>).filter((role) =>
    level === "view" ? canView(role, module) : canManage(role, module),
  );
}

// Roles that can publish posts and edit anyone's; authors only save drafts of
// their own.
export const POST_PUBLISHERS: Array<AdminRole> = ["super_admin", "admin", "editor"];
export const canPublishPosts = (role: AdminRole) => POST_PUBLISHERS.includes(role);

// Where each module lives, in sidebar order. The first one a role can view is
// where they land after signing in.
export const MODULE_PATHS: Array<[AdminModule, string]> = [
  ["dashboard", "/admin"],
  ["spotlights", "/admin/spotlights"],
  ["pages", "/admin/pages"],
  ["posts", "/admin/posts"],
  ["departments", "/admin/departments"],
  ["people", "/admin/people"],
  ["documents", "/admin/documents"],
  ["media", "/admin/media"],
  ["messages", "/admin/messages"],
  ["settings", "/admin/settings"],
  ["users", "/admin/users"],
  ["activity", "/admin/activity"],
];

export function homePathFor(role: AdminRole): string {
  return MODULE_PATHS.find(([module]) => canView(role, module))?.[1] ?? "/admin/account";
}
