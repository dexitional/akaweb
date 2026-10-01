import { Hono } from "hono";
import { z } from "zod";
import { validate } from "../../lib/validate.js";
import {
  getStaffBySlugs,
  searchDirectory,
  trackProfileCoView,
  trackProfileShare,
} from "#/server/directory";

const slug = z.string().regex(/^[a-z0-9-]{1,160}$/);

// Public endpoints behind the directory's client-side features.
export const directoryRoute = new Hono()
  // GET /directory/search?q=… → live suggestions for the directory hero.
  .get("/search", async (c) =>
    c.json(await searchDirectory((c.req.query("q") ?? "").slice(0, 100))),
  )
  // GET /directory/favourites?slugs=a,b,c → display details for starred profiles.
  .get("/favourites", async (c) => {
    const slugs = (c.req.query("slugs") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => slug.safeParse(s).success);
    return c.json({ people: await getStaffBySlugs(slugs) });
  })
  .post("/track-share", validate("json", z.object({ slug })), async (c) => {
    await trackProfileShare(c.req.valid("json").slug);
    return c.json({ ok: true });
  })
  .post("/track-coview", validate("json", z.object({ from: slug, to: slug })), async (c) => {
    const { from, to } = c.req.valid("json");
    await trackProfileCoView(from, to);
    return c.json({ ok: true });
  });
