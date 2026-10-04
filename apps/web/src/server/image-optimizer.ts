// The /img endpoint: fetches a CMS (R2) or public image, resizes it to one of
// IMAGE_WIDTHS, re-encodes it as AVIF or WebP (whichever the browser accepts)
// and caches the result — in memory, on disk, and in browsers/CDNs for a year.
//
//   GET /img?src=<R2 URL or /public path>&w=640&q=75
//
// Server-only: mounted as a Nitro handler (img-handler.ts), so sharp never
// reaches the browser bundle.
import { createHash } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { DEFAULT_QUALITY, IMAGE_QUALITIES, IMAGE_WIDTHS, parseImageHosts } from "#/lib/image";

type Format = "avif" | "webp" | "jpeg" | "png";

const CONTENT_TYPES: Record<Format, string> = {
  avif: "image/avif",
  webp: "image/webp",
  jpeg: "image/jpeg",
  png: "image/png",
};

const CACHE_DIR = process.env.IMAGE_CACHE_DIR || path.join(process.cwd(), ".cache", "images");
const MAX_SOURCE_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 30_000;
// CMS uploads get unique keys (cms/<folder>/<yyyy>/<mm>/<random>-name.ext),
// so a variant of one never changes. Files in public/ can be replaced in a
// deploy, so they're cached for a week instead.
const IMMUTABLE = "public, max-age=31536000, immutable";
const WEEK = "public, max-age=604800, stale-while-revalidate=86400";

// Hosts we're willing to fetch from: the R2 public domain, plus any extras.
const allowedHosts = () =>
  new Set(parseImageHosts(process.env.R2_PUBLIC_DOMAIN, process.env.IMAGE_REMOTE_HOSTS));

// ---- Caches -------------------------------------------------------------------------

interface Variant {
  body: Buffer;
  format: Format;
}

// Small in-memory LRU in front of the disk cache, for the hottest variants.
const MEMORY_LIMIT_BYTES = 64 * 1024 * 1024;
const memory = new Map<string, Variant>();
let memoryBytes = 0;

function remember(key: string, variant: Variant) {
  if (variant.body.length > MEMORY_LIMIT_BYTES / 8) return;
  memory.delete(key);
  memory.set(key, variant);
  memoryBytes += variant.body.length;
  for (const [oldKey, old] of memory) {
    if (memoryBytes <= MEMORY_LIMIT_BYTES) break;
    memory.delete(oldKey);
    memoryBytes -= old.body.length;
  }
}

function recall(key: string): Variant | undefined {
  const hit = memory.get(key);
  if (hit) {
    // Refresh recency.
    memory.delete(key);
    memory.set(key, hit);
  }
  return hit;
}

const diskPath = (key: string, format: Format) =>
  path.join(CACHE_DIR, key.slice(0, 2), `${key}.${format}`);

async function readDisk(key: string, format: Format): Promise<Variant | undefined> {
  try {
    return { body: await readFile(diskPath(key, format)), format };
  } catch {
    return undefined;
  }
}

async function writeDisk(key: string, variant: Variant) {
  const file = diskPath(key, variant.format);
  try {
    await mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
    await writeFile(tmp, variant.body);
    await rename(tmp, file); // atomic: readers never see a half-written file
  } catch (err) {
    console.warn("[img] couldn't write cache:", err);
  }
}

// ---- Sources ------------------------------------------------------------------------

// A tiny semaphore: caps how many jobs of one kind run at once.
function createLimiter(max: number) {
  let running = 0;
  const waiting: Array<() => void> = [];
  return async function limit<T>(job: () => Promise<T>): Promise<T> {
    if (running >= max) await new Promise<void>((resolve) => waiting.push(resolve));
    running++;
    try {
      return await job();
    } finally {
      running--;
      waiting.shift()?.();
    }
  };
}

// Encoding is CPU-heavy and downloads compete for bandwidth: cap both so a
// page full of new images can't starve the server. Identical requests share
// one job, and each original is downloaded once for all of its widths.
const transformSlot = createLimiter(Math.max(1, Number(process.env.IMAGE_CONCURRENCY) || 3));
const downloadSlot = createLimiter(6);
const inFlight = new Map<string, Promise<Variant | "passthrough">>();
const sourcesInFlight = new Map<string, Promise<Buffer>>();

class Passthrough extends Error {}

function checkSource(contentType: string, size: number) {
  if (
    contentType &&
    !contentType.startsWith("image/") &&
    contentType !== "application/octet-stream"
  ) {
    throw new Error(`source is ${contentType}, not an image`);
  }
  if (/svg|gif/.test(contentType) || size > MAX_SOURCE_BYTES) throw new Passthrough();
}

async function download(url: URL): Promise<Buffer> {
  const signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  // Our own R2 files: read them from the bucket. The public URL may be an
  // r2.dev address, which Cloudflare rate-limits.
  const domain = (process.env.R2_PUBLIC_DOMAIN ?? "").replace(/\/$/, "");
  if (domain && url.href.startsWith(`${domain}/`)) {
    const { readObject } = await import("./api/lib/storage.js");
    const object = await readObject(decodeURIComponent(url.href.slice(domain.length + 1)), signal);
    checkSource(object.contentType, object.size);
    return object.body;
  }
  const res = await fetch(url, { signal, redirect: "follow" });
  if (!res.ok) throw new Error(`source responded ${res.status}`);
  checkSource(
    res.headers.get("content-type") ?? "",
    Number(res.headers.get("content-length") ?? 0),
  );
  const body = Buffer.from(await res.arrayBuffer());
  if (body.length > MAX_SOURCE_BYTES) throw new Passthrough();
  return body;
}

// Originals are cached on disk too, so a new width (or a cache that was
// cleared of variants) never re-downloads them.
async function loadSource(url: URL, immutable: boolean): Promise<Buffer> {
  const key = createHash("sha256").update(url.href).digest("hex");
  const file = path.join(CACHE_DIR, "sources", key.slice(0, 2), key);
  if (immutable) {
    try {
      return await readFile(file);
    } catch {
      // Not cached yet.
    }
  }
  let job = sourcesInFlight.get(key);
  if (!job) {
    job = downloadSlot(() => download(url))
      .then(async (body) => {
        if (immutable) {
          try {
            await mkdir(path.dirname(file), { recursive: true });
            const tmp = `${file}.${process.pid}.${Date.now()}.tmp`;
            await writeFile(tmp, body);
            await rename(tmp, file);
          } catch (err) {
            console.warn("[img] couldn't cache source:", err);
          }
        }
        return body;
      })
      .finally(() => sourcesInFlight.delete(key));
    sourcesInFlight.set(key, job);
  }
  return job;
}

// ---- Transform ----------------------------------------------------------------------

async function transform(
  source: Buffer,
  width: number,
  quality: number,
  format: Format,
): Promise<Buffer> {
  const image = sharp(source, { failOn: "none", limitInputPixels: 80_000_000 })
    .rotate() // honour EXIF orientation, then drop the metadata
    .resize({ width, withoutEnlargement: true });
  switch (format) {
    // AVIF looks as good as WebP/JPEG at a noticeably lower quality number.
    case "avif":
      return image.avif({ quality: Math.max(35, quality - 20), effort: 4 }).toBuffer();
    case "webp":
      return image.webp({ quality, effort: 4 }).toBuffer();
    case "png":
      return image.png({ compressionLevel: 9, palette: true, quality }).toBuffer();
    default:
      return image.jpeg({ quality, mozjpeg: true, progressive: true }).toBuffer();
  }
}

function pickFormat(accept: string, sourcePath: string): Format {
  if (accept.includes("image/avif")) return "avif";
  if (accept.includes("image/webp")) return "webp";
  return /\.png(\?|$)/i.test(sourcePath) ? "png" : "jpeg";
}

// ---- Handler ------------------------------------------------------------------------

function redirectToSource(source: string) {
  return new Response(null, {
    status: 302,
    headers: { location: source, "cache-control": "no-store" },
  });
}

export async function handleImageRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const src = url.searchParams.get("src") ?? "";
  const width = Number(url.searchParams.get("w"));
  const quality = Number(url.searchParams.get("q") ?? DEFAULT_QUALITY);

  if (!(IMAGE_WIDTHS as ReadonlyArray<number>).includes(width)) {
    return new Response(`w must be one of ${IMAGE_WIDTHS.join(", ")}`, { status: 400 });
  }
  if (!(IMAGE_QUALITIES as ReadonlyArray<number>).includes(quality)) {
    return new Response(`q must be one of ${IMAGE_QUALITIES.join(", ")}`, { status: 400 });
  }

  // Our own public/ files, or remote images from an allowed host — never an
  // arbitrary URL (that would make this an open proxy).
  let source: URL;
  const isLocal = src.startsWith("/") && !src.startsWith("//");
  try {
    source = new URL(src, url.origin);
  } catch {
    return new Response("Invalid src", { status: 400 });
  }
  if (
    isLocal
      ? source.origin !== url.origin
      : !/^https?:$/.test(source.protocol) || !allowedHosts().has(source.host)
  ) {
    return new Response("src host is not allowed", { status: 400 });
  }
  if (isLocal && source.pathname.startsWith("/img"))
    return new Response("Invalid src", { status: 400 });

  const format = pickFormat(request.headers.get("accept") ?? "", source.pathname);
  const key = createHash("sha256")
    .update(`${source.href}|${width}|${quality}|${format}`)
    .digest("hex");
  const etag = `"${key.slice(0, 32)}"`;
  const cacheControl = isLocal ? WEEK : IMMUTABLE;
  const headers = (cache: string, length?: number) => ({
    "content-type": CONTENT_TYPES[format],
    "cache-control": cacheControl,
    vary: "Accept",
    etag,
    "x-image-cache": cache,
    ...(length !== undefined ? { "content-length": String(length) } : {}),
  });

  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: headers("REVALIDATED") });
  }

  const cached = recall(key) ?? (await readDisk(key, format));
  if (cached) {
    remember(key, cached);
    return new Response(new Uint8Array(cached.body), {
      headers: headers("HIT", cached.body.length),
    });
  }

  let job = inFlight.get(key);
  if (!job) {
    job = (async (): Promise<Variant | "passthrough"> => {
      try {
        const original = await loadSource(source, !isLocal);
        const body = await transformSlot(() => transform(original, width, quality, format));
        const variant = { body, format };
        remember(key, variant);
        await writeDisk(key, variant);
        return variant;
      } catch (err) {
        if (err instanceof Passthrough) return "passthrough";
        throw err;
      }
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, job);
  }

  try {
    const result = await job;
    if (result === "passthrough") return redirectToSource(source.href);
    return new Response(new Uint8Array(result.body), {
      headers: headers("MISS", result.body.length),
    });
  } catch (err) {
    // Never break an image: fall back to the original file.
    console.warn(`[img] ${source.href} (w=${width}):`, err instanceof Error ? err.message : err);
    return redirectToSource(source.href);
  }
}
