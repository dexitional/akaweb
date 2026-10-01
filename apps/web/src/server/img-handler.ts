import { defineHandler } from "nitro";
import { handleImageRequest } from "./image-optimizer";

// GET /img — registered as its own Nitro handler (vite.config.ts) rather than a
// TanStack route: it skips the router entirely, and in dev Nitro only hands
// browser image requests (Sec-Fetch-Dest: image) to explicitly registered
// routes — a catch-all app route would have Vite answer them with a 404.
export default defineHandler((event) => handleImageRequest(event.req));
