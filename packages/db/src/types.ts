// Row shapes as mysql2 returns them (dateStrings: true, so every DATE /
// DATETIME / TIMESTAMP column is a plain string; JSON columns are parsed).

export type AdminRole = "super_admin" | "admin" | "editor" | "author";

export interface AdminRow {
  id: number;
  full_name: string;
  email: string;
  role: AdminRole;
  position: string | null;
  phone: string | null;
  photo_url: string | null;
  password_hash: string;
  failed_login_attempts: number;
  locked_until: string | null;
  last_login_at: string | null;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface MediaAssetRow {
  id: number;
  file_key: string;
  url: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  width: number | null;
  height: number | null;
  alt_text: string | null;
  folder: string;
  uploaded_by: number | null;
  created_at: string;
  updated_at: string;
}

export type PageSection = "about" | "academics" | "admissions" | "student-life" | "alumni";
export type PageStatus = "draft" | "published";

export interface PageRow {
  id: number;
  section: PageSection;
  slug: string;
  title: string;
  summary: string | null;
  hero_image_url: string | null;
  body: string | null;
  // JSON column: the page-builder blocks (see apps/web/src/lib/blocks.ts).
  blocks: unknown[] | null;
  status: PageStatus;
  show_in_nav: 0 | 1;
  sort_order: number;
  seo_title: string | null;
  seo_description: string | null;
  published_at: string | null;
  created_by: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export type PostType = "news" | "event" | "announcement";
export type PostStatus = "draft" | "published" | "archived";

export interface PostRow {
  id: number;
  type: PostType;
  slug: string;
  title: string;
  excerpt: string | null;
  body: string | null;
  cover_image_url: string | null;
  category: string | null;
  tags: string[] | null;
  is_featured: 0 | 1;
  is_pinned: 0 | 1;
  status: PostStatus;
  published_at: string;
  event_start: string | null;
  event_end: string | null;
  venue: string | null;
  registration_url: string | null;
  attachment_url: string | null;
  expires_on: string | null;
  view_count: number;
  author_id: number | null;
  updated_by: number | null;
  created_at: string;
  updated_at: string;
}

export interface SpotlightRow {
  id: number;
  eyebrow: string | null;
  title: string;
  caption: string | null;
  image_url: string;
  cta_label: string | null;
  cta_url: string | null;
  // 0 for poster-style images that carry their own text.
  show_text: 0 | 1;
  starts_on: string | null;
  ends_on: string | null;
  is_active: 0 | 1;
  sort_order: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export type DepartmentKind = "department" | "unit";

export interface DepartmentRow {
  id: number;
  kind: DepartmentKind;
  // Directory "Browse by type" category; null falls back to `kind`.
  directory_category: string | null;
  slug: string;
  name: string;
  code: string | null;
  summary: string | null;
  body: string | null;
  image_url: string | null;
  head_name: string | null;
  head_title: string | null;
  head_photo_url: string | null;
  email: string | null;
  phone: string | null;
  location: string | null;
  website_url: string | null;
  programmes: string[] | null;
  is_published: 0 | 1;
  is_featured_directory: 0 | 1;
  related_ids: number[] | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface PersonRow {
  id: number;
  group_key: string;
  name: string;
  title: string;
  // Links this affiliation to a staff directory profile (several rows may
  // share one — e.g. a lecturer who also sits on management).
  profile_slug: string | null;
  // Their leadership role within the department/unit, e.g. "Head of Department".
  unit_role: string | null;
  department_id: number | null;
  photo_url: string | null;
  bio: string | null;
  email: string | null;
  phone: string | null;
  sort_order: number;
  is_active: 0 | 1;
  created_at: string;
  updated_at: string;
}

export interface DocumentRow {
  id: number;
  title: string;
  category: string;
  description: string | null;
  file_url: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  is_published: 0 | 1;
  published_on: string;
  download_count: number;
  created_by: number | null;
  created_at: string;
  updated_at: string;
}

export type ContactMessageStatus = "new" | "read" | "archived";

export interface ContactMessageRow {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  ip_address: string | null;
  created_at: string;
  updated_at: string;
}

export interface ActivityLogRow {
  id: number;
  admin_id: number | null;
  action: string;
  entity: string;
  entity_id: number | null;
  summary: string;
  created_at: string;
}

export type StaffType = "teaching" | "non-teaching";
export type StaffStatus = "active" | "post-retirement" | "on-secondment" | "in-memoriam" | "exited";

// Person-level directory data, keyed by the slug the person's `people` rows share.
export interface StaffProfileRow {
  id: number;
  slug: string;
  staff_type: StaffType | null;
  staff_status: StaffStatus;
  photo_url: string | null;
  about: string | null;
  // JSON: see apps/web/src/lib/directory.ts (profileDetailsSchema).
  details: Record<string, unknown> | null;
  is_new_face: 0 | 1;
  joined_on: string | null;
  is_appointed_head: 0 | 1;
  appointed_on: string | null;
  profile_views: number;
  shares: number;
  created_at: string;
  updated_at: string;
}
