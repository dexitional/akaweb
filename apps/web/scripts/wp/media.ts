// Pipes WordPress uploads into the new site's R2 CDN and media library.
// Keys are derived from the original upload path, so re-running the
// migration reuses files already transferred instead of uploading again.
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { Pool, RowDataPacket } from "mysql2/promise";

export type Folder = "general" | "pages" | "posts" | "spotlights" | "people" | "departments" | "documents" | "settings";

export interface MigratedAsset {
  url: string;
  filename: string;
  mime: string;
  size: number;
}

// Width/height from the file header (JPEG, PNG, GIF, WebP).
export function imageSize(b: Buffer): { width: number; height: number } | null {
  if (b.length > 24 && b.readUInt32BE(0) === 0x89504e47) return { width: b.readUInt32BE(16), height: b.readUInt32BE(20) };
  if (b.length > 10 && b.toString("ascii", 0, 3) === "GIF") return { width: b.readUInt16LE(6), height: b.readUInt16LE(8) };
  if (b.length > 30 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP") {
    const chunk = b.toString("ascii", 12, 16);
    if (chunk === "VP8X") return { width: 1 + b.readUIntLE(24, 3), height: 1 + b.readUIntLE(27, 3) };
    if (chunk === "VP8 ") return { width: b.readUInt16LE(26) & 0x3fff, height: b.readUInt16LE(28) & 0x3fff };
    if (chunk === "VP8L") {
      const bits = b.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i < b.length) {
      if (b[i] !== 0xff) return null;
      const marker = b[i + 1]!;
      const len = b.readUInt16BE(i + 2);
      if (marker >= 0xc0 && marker <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(marker)) {
        return { width: b.readUInt16BE(i + 7), height: b.readUInt16BE(i + 5) };
      }
      i += 2 + len;
    }
  }
  return null;
}

const MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  pdf: "application/pdf",
};

export class MediaPipe {
  private s3: S3Client;
  private bucket: string;
  private publicDomain: string;
  private cache = new Map<string, MigratedAsset | null>();
  readonly missing: Array<string> = [];
  uploaded = 0;
  reused = 0;

  constructor(
    private db: Pool,
    private uploadsBase: string,
    private adminId: number | null,
  ) {
    const { R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN } = process.env;
    if (!R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_DOMAIN) {
      throw new Error("R2_* environment variables must be set to migrate media.");
    }
    this.s3 = new S3Client({
      region: process.env.R2_REGION ?? "auto",
      endpoint: R2_ENDPOINT,
      credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    this.bucket = R2_BUCKET_NAME;
    this.publicDomain = R2_PUBLIC_DOMAIN.replace(/\/$/, "");
  }

  // "2025/10/Kumedzro web.jpg" (path relative to wp-content/uploads).
  async migrate(relativePath: string, folder: Folder, alt?: string): Promise<MigratedAsset | null> {
    const path = relativePath.replace(/^\/+/, "");
    if (this.cache.has(path)) return this.cache.get(path)!;
    const result = await this.transfer(path, folder, alt);
    this.cache.set(path, result);
    return result;
  }

  // Accepts an absolute WordPress upload URL.
  async migrateUrl(url: string, folder: Folder, alt?: string) {
    const m = /\/wp-content\/uploads\/(.+)$/.exec(url.split("?")[0]!);
    return m ? this.migrate(decodeURIComponent(m[1]!), folder, alt) : null;
  }

  private async transfer(path: string, folder: Folder, alt?: string): Promise<MigratedAsset | null> {
    const filename = path.split("/").pop()!;
    const ext = (filename.split(".").pop() ?? "").toLowerCase();
    const safe = path
      .toLowerCase()
      .replace(/[^a-z0-9/._-]+/g, "-")
      .replace(/-+/g, "-");
    const key = `cms/${folder}/wp/${safe}`;

    const [existing] = await this.db.query<RowDataPacket[]>(
      "SELECT url, filename, mime_type, size_bytes FROM media_assets WHERE file_key LIKE ? LIMIT 1",
      [`cms/%/wp/${safe}`],
    );
    if (existing[0]) {
      this.reused++;
      return { url: existing[0].url, filename: existing[0].filename, mime: existing[0].mime_type, size: existing[0].size_bytes };
    }

    const res = await fetch(`${this.uploadsBase}/${path.split("/").map(encodeURIComponent).join("/")}`, {
      signal: AbortSignal.timeout(60_000),
    }).catch(() => null);
    if (!res || !res.ok) {
      this.missing.push(path);
      return null;
    }
    const body = Buffer.from(await res.arrayBuffer());
    const mime = MIME_BY_EXT[ext] ?? res.headers.get("content-type")?.split(";")[0] ?? "application/octet-stream";
    if (!mime.startsWith("image/") && mime !== "application/pdf") {
      this.missing.push(`${path} (unexpected ${mime})`);
      return null;
    }

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: mime,
        CacheControl: "public, max-age=31536000, immutable",
      }),
    );
    const url = `${this.publicDomain}/${key}`;
    const size = mime.startsWith("image/") ? imageSize(body) : null;
    await this.db.execute(
      `INSERT INTO media_assets (file_key, url, filename, mime_type, size_bytes, width, height, alt_text, folder, uploaded_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [key, url, filename, mime, body.length, size?.width ?? null, size?.height ?? null, alt || null, folder, this.adminId],
    );
    this.uploaded++;
    return { url, filename, mime, size: body.length };
  }
}
