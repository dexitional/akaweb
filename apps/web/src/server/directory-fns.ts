// Client-safe server functions for the directory routes' loaders. The DB
// service is imported dynamically so mysql2 stays out of the browser bundle.
import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import { z } from "zod";

export const getDirectoryHomeData = createServerFn({ method: "GET" }).handler(async () => {
  const { getDirectoryHome } = await import("./directory.js");
  return getDirectoryHome();
});

const RESULT_LIMITS = { people: 200, units: 50, categories: 12, expertise: 20 };

export const getDirectorySearchData = createServerFn({ method: "GET" })
  .validator((input: { q?: string; initial?: string }) => ({
    q: z
      .string()
      .max(100)
      .catch("")
      .parse(input.q ?? "")
      .trim(),
    initial: z
      .string()
      .regex(/^[A-Z]$/)
      .optional()
      .catch(undefined)
      .parse(input.initial?.toUpperCase()),
  }))
  .handler(async ({ data }) => {
    const { getDirectoryStats, getStaffByInitial, searchDirectory } =
      await import("./directory.js");
    const empty = { people: [], units: [], categories: [], expertise: [] };
    const [stats, results] = await Promise.all([
      getDirectoryStats(),
      data.q
        ? searchDirectory(data.q, RESULT_LIMITS)
        : data.initial
          ? getStaffByInitial(data.initial).then((people) => ({ ...empty, people }))
          : Promise.resolve(empty),
    ]);
    return { stats, results };
  });

export const getUnitData = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => ({ slug: z.string().max(160).parse(input.slug) }))
  .handler(async ({ data }) => {
    const { getUnit } = await import("./directory.js");
    const result = await getUnit(data.slug);
    if (!result) throw notFound();
    return result;
  });

export const getUnitListData = createServerFn({ method: "GET" }).handler(async () => {
  const { getUnitList } = await import("./directory.js");
  return getUnitList();
});

export const getProfileData = createServerFn({ method: "GET" })
  .validator((input: { slug: string }) => ({ slug: z.string().max(160).parse(input.slug) }))
  .handler(async ({ data }) => {
    const { getProfile, trackProfileView } = await import("./directory.js");
    const profile = await getProfile(data.slug);
    if (!profile) throw notFound();
    // Fire-and-forget: tracking must never delay or break the page.
    void trackProfileView(data.slug);
    return profile;
  });

export const getContactsData = createServerFn({ method: "GET" }).handler(async () => {
  const { getContacts } = await import("./directory.js");
  return getContacts();
});

export const getMostVisitedData = createServerFn({ method: "GET" })
  .validator((input: { period?: string }) => ({
    period: z
      .enum(["today", "week", "month", "year"])
      .catch("week")
      .parse(input.period ?? "week"),
  }))
  .handler(async ({ data }) => {
    const { getMostVisited } = await import("./directory.js");
    return getMostVisited(data.period);
  });
