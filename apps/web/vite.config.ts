import { defineConfig } from "vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";

export default defineConfig({
  // Optional override, e.g. when node_modules/.vite isn't writable.
  cacheDir: process.env.VITE_CACHE_DIR,
  resolve: { tsconfigPaths: true },
  plugins: [
    devtools(),
    nitro({
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
});
