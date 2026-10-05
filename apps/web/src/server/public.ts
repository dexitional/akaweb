// Client-safe server functions for the public site's route loaders. The DB
// service (server/content.ts) is imported dynamically inside each handler so
// mysql2 stays out of the browser bundle (see the note in routes/api/$.ts).
import { createServerFn } from "@tanstack/react-start";
import { getCookie } from "@tanstack/react-start/server";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";
import { SECTION_KEYS } from "#/lib/content";
import { ADMIN_SESSION_COOKIE } from "./session";

export const getLayoutData = createServerFn({ method: "GET" }).handler(async () => {
  const { getLayout } = await import("./content.js");
  return getLayout();
});

export const getHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const { getHome } = await import("./content.js");
  return getHome();
});

const sectionSchema = z.enum(SECTION_KEYS);

export const getSectionData = createServerFn({ method: "GET" })
  .validator((input: { section: string }) => ({ section: sectionSchema.parse(input.section) }))
  .handler(async ({ data }) => {
    const { getSection } = await import("./content.js");
    return getSection(data.section);
  });

export const getPageData = createServerFn({ method: "GET" })
  .validator((input: { section: string; slug: string; preview?: boolean }) => ({
    section: sectionSchema.parse(input.section),
    slug: z.string().max(160).parse(input.slug),
    preview: Boolean(input.preview),
  }))
  .handler(async ({ data }) => {
    const { getPage } = await import("./content.js");
    // Drafts are only visible to signed-in CMS users (the editor's Preview).
    let preview = false;
    if (data.preview) {
      const { readAdminIdFromToken } = await import("./session-core.js");
      preview = Boolean(await readAdminIdFromToken(getCookie(ADMIN_SESSION_COOKIE)));
    }
    const result = await getPage(data.section, data.slug, preview);
    if (!result) throw notFound();
    return result;
  });

const postType = z.enum(["news", "event", "announcement"]);

export const getPostList = createServerFn({ method: "GET" })
  .validator(
    (input: { type: string; page?: number; category?: string; q?: string; when?: string }) => ({
      type: postType.parse(input.type),
      page: z.number().int().min(1).max(1000).catch(1).parse(input.page ?? 1),
      category: z.string().max(80).optional().catch(undefined).parse(input.category || undefined),
      q: z.string().max(100).optional().catch(undefined).parse(input.q || undefined),
      when: z.enum(["upcoming", "past"]).optional().catch(undefined).parse(input.when),
    }),
  )
  .handler(async ({ data }) => {
    const { listPosts } = await import("./content.js");
    return listPosts(data);
  });

export const getPostData = createServerFn({ method: "GET" })
  .validator((input: { type: string; slug: string }) => ({
    type: postType.parse(input.type),
    slug: z.string().max(200).parse(input.slug),
  }))
  .handler(async ({ data }) => {
    const { getPost } = await import("./content.js");
    const result = await getPost(data.type, data.slug);
    if (!result) throw notFound();
    return result;
  });

export const getDocumentList = createServerFn({ method: "GET" })
  .validator((input: { page?: number; category?: string; q?: string }) => ({
    page: z.number().int().min(1).max(1000).catch(1).parse(input.page ?? 1),
    category: z.string().max(40).optional().catch(undefined).parse(input.category || undefined),
    q: z.string().max(100).optional().catch(undefined).parse(input.q || undefined),
  }))
  .handler(async ({ data }) => {
    const { listDocuments } = await import("./content.js");
    return listDocuments(data);
  });

export const getDepartmentData = createServerFn({ method: "GET" })
  .validator((input: { kind: string; slug: string }) => ({
    kind: z.enum(["department", "unit"]).parse(input.kind),
    slug: z.string().max(160).parse(input.slug),
  }))
  .handler(async ({ data }) => {
    const { getDepartment } = await import("./content.js");
    const result = await getDepartment(data.kind, data.slug);
    if (!result) throw notFound();
    return result;
  });

export const searchSite = createServerFn({ method: "GET" })
  .validator((input: { q: string }) => ({ q: z.string().max(100).catch("").parse(input.q) }))
  .handler(async ({ data }) => {
    const { search } = await import("./content.js");
    return search(data.q);
  });

export const getMobileAppData = createServerFn({ method: "GET" }).handler(async () => {
  const { getMobileApp } = await import("./content.js");
  return getMobileApp();
});
