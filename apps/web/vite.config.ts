import { defineConfig, loadEnv } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import { parseImageHosts } from "./src/lib/image";

export default defineConfig(({ mode }) => {
  // .env plus the real environment (which wins), as the server will see it.
  const env = loadEnv(mode, process.cwd(), "");
  return {
    // Which image hosts the browser sends through /img (see src/lib/image.ts).
    // Baked in at build time, so rebuild after changing IMAGE_REMOTE_HOSTS.
    define: {
      __IMAGE_HOSTS__: JSON.stringify(
        parseImageHosts(env.R2_PUBLIC_DOMAIN, env.IMAGE_REMOTE_HOSTS),
      ),
    },
    // Optional override, e.g. when node_modules/.vite isn't writable.
    cacheDir: process.env.VITE_CACHE_DIR,
    resolve: { tsconfigPaths: true },
    plugins: [
      devtools(),
      nitro({
        // Image optimiser (src/server/image-optimizer.ts).
        handlers: [{ route: "/img", method: "GET", handler: "./src/server/img-handler.ts" }],
        routeRules: {
          "/assets/**": { headers: { "cache-control": "public, max-age=31536000, immutable" } },
          "/logo.webp": { headers: { "cache-control": "public, max-age=604800" } },
          "/logo-sm.webp": { headers: { "cache-control": "public, max-age=604800" } },
        },
      }),
      tailwindcss(),
      tanstackStart(),
      viteReact(),
    ],
  };
});
