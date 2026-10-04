// TEMPORARY (akatsico device testing): node_modules/.vite* are root-owned, so
// keep Vite's cache in a scratch dir. Delete when done.
import { defineConfig } from "vite";
import base from "./vite.config";
export default defineConfig(async (env) => {
  const cfg = typeof base === "function" ? await (base as any)(env) : base;
  return { ...cfg, cacheDir: "/private/tmp/claude-501/-Users-dexitional-Documents-projects-FullStack-coreos-frontend-ecentre/51d61b5e-a077-422a-a232-a254a14841a1/scratchpad/vite-cache-akaweb" };
});
