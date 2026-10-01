# Akatsi College of Education — website & CMS

The public website of Akatsi College of Education, with its own content management system at `/admin`. It's a monorepo built the same way as `knh`:

| Path | What it is |
| --- | --- |
| `apps/web` | TanStack Start app: the public site, the CMS, and a Hono API at `/api` |
| `packages/db` | MySQL migrations, row types and seed scripts (`@aka/db`) |
| `packages/ui` | Brand tokens (navy `#0B1A62`, green `#008551` and sky `#8BD3F9`, from the crest) |
| `files/` | Source artwork (`logo.webp`) |

## Getting started

```bash
npm install

# 1. Environment (DB name: akaweb)
cp packages/db/.env.example packages/db/.env      # DATABASE_URL + first admin
cp apps/web/.env.example apps/web/.env            # DATABASE_URL, session secret, R2

# 2. Database
npm run db:migrate          # creates the tables
npm run db:seed             # creates/rotates the super admin from SEED_ADMIN_*
npm run db:seed-content     # optional starter pages, departments, people and posts

# 3. Run
npm run dev                 # http://localhost:3000, CMS at /admin
```

`db:seed-content` is idempotent and never overwrites CMS edits. People names are `[placeholders]` to replace in **Admin → People**, and all starter wording should be reviewed by the college.

If `apps/web/node_modules/.vite` was created by a different user (for example, with `sudo`) and isn't writable, run with `VITE_CACHE_DIR=/some/writable/dir`.

## Migrating from the old WordPress site

`apps/web/scripts/migrate-wordpress.ts` imports the old site (MySQL database `akatsico_website`) into the CMS:

| WordPress | New CMS |
| --- | --- |
| Slider Revolution slides | Spotlights |
| WPBakery pages | Block-based pages |
| `departments` posts and unit pages | Departments & Units, with heads and staff |
| Team member groups | People |
| `news_and_events` | News |
| `notice_board` | Announcements |
| `guides_and_docs` | Downloads |
| Header and footer details | Site settings |

Every image and PDF the content uses is downloaded from the live site, uploaded to R2 and registered in the media library.

```bash
npm run migrate:wordpress -w apps/web -- --dry   # report only
npm run migrate:wordpress -w apps/web            # import
```

**Re-running:** the script is re-runnable. Media is reused, and rows are matched by slug and updated, so a re-run overwrites CMS edits to migrated content. Run it before editors start.

**Old URLs:** old WordPress addresses (`/history-of-akatsicoe/`, `/departments/…`, `/notice_board/…`) redirect permanently to their new pages via `apps/web/src/lib/legacy-redirects.ts`.

## File storage (Cloudflare R2)

Every image and document uploaded in the CMS goes straight from the browser to R2 using a short-lived presigned URL. The signed URL carries the exact file size, so size limits are enforced. Set the `R2_*` variables in `apps/web/.env`. `R2_PUBLIC_DOMAIN` must serve the bucket publicly (a custom domain or `r2.dev`). The bucket also needs a CORS rule allowing uploads from the site:

```json
[{ "AllowedOrigins": ["https://your-site", "http://localhost:3000"], "AllowedMethods": ["PUT"], "AllowedHeaders": ["content-type", "content-length"], "MaxAgeSeconds": 3600 }]
```

## The CMS

| Area | What editors manage |
| --- | --- |
| **Spotlights** | Home page hero slides, with order, visibility and start/end dates |
| **Pages** | Every page under About Us, Academics, Admissions, Student Life and Alumni: rich text, a block-based page builder, banner image, menu visibility and order, SEO fields, drafts and preview |
| **News & Events** | News, events and announcements: scheduled publishing, featured/pinned, categories, tags, cover images, attachments, event dates/venue/registration, announcement expiry, view counts |
| **Departments & Units** | Each with its own page: head, programmes, contacts and linked staff |
| **People** | Management, Principal's office, Governing Council, SRC, alumni executives, staff |
| **Downloads** | Guides, forms, handbooks and calendars, with download counts |
| **Media** | The R2 media library: upload, search, alt text, folders, "where is this used?", delete |
| **Messages** | Contact-form inbox (honeypot and per-IP rate limiting) |
| **Site settings** | Identity, contact details, social links, notice banner, home page welcome/figures/quick links/CTA, section intros |
| **Users / Activity log** | Accounts with roles, plus an audit trail of every change |

**Page builder blocks:** rich text, image & text, card grid, steps, FAQ, callout, figures, quote, gallery (with lightbox), video (YouTube/Vimeo), people, departments/units, downloads, call to action, and contact details (form and map). Each block's shape is defined once in `apps/web/src/lib/blocks.ts`. The editor builds blocks, the API validates them and sanitises their HTML, and the site renders them.

**Roles** (`apps/web/src/lib/permissions.ts`):

| Role | Can do |
| --- | --- |
| Super Admin | Everything, including user accounts |
| Administrator | All content, messages, settings, activity |
| Editor | All website content and media |
| Author | Writes posts as drafts for an editor to publish |

## Public site routes

| Route | Shows |
| --- | --- |
| `/` | Home |
| `/{section}` | Section landing page |
| `/{section}/{slug}` | CMS page (`?preview=1` shows drafts to signed-in staff) |
| `/academics/departments/{slug}`, `/academics/units/{slug}` | Department or unit page |
| `/news`, `/events`, `/announcements` (+ `/{slug}`) | Searchable, filterable listings and detail pages |
| `/downloads` | Guides & Downloads |
| `/search` | Site-wide search |

## Conventions

These follow `knh`:

- **Server code stays out of the browser bundle.** Server code reaches routes only through dynamic imports inside `createServerFn` handlers or the `/api` catch-all.
- **Rich text is sanitised twice.** It goes through an allowlist both on save and on read.
- **Migrations hold one `CREATE TABLE` per file.**
# akaweb
