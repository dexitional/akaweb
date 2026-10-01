import { randomUUID } from "node:crypto";
import { getPool } from "@aka/db";
import type { MediaAssetRow } from "@aka/db";
import type { RowDataPacket } from "mysql2";
import type { z } from "zod";
import { AppError } from "../../middleware/error-handler.js";
import { createPresignedUpload, deleteObject, publicUrlFor } from "../../lib/storage.js";
import { findById, insertRow, updateRow } from "../../lib/columns.js";
import { likePattern, paging } from "../../lib/query.js";
import { logActivity } from "../../lib/activity.js";
import { slugify } from "../../lib/slug.js";
import type { presignSchema, registerSchema, updateMediaSchema } from "./route.js";

export const MEDIA_FOLDERS = [
  "general",
  "pages",
  "posts",
  "spotlights",
  "people",
  "departments",
  "documents",
  "settings",
] as const;

const MB = 1024 * 1024;

// What the library accepts, with the per-type size cap enforced by signing
// the exact Content-Length into the upload URL.
const TYPES: Record<string, { ext: string; maxBytes: number }> = {
  "image/jpeg": { ext: "jpg", maxBytes: 12 * MB },
  "image/png": { ext: "png", maxBytes: 12 * MB },
  "image/webp": { ext: "webp", maxBytes: 12 * MB },
  "image/gif": { ext: "gif", maxBytes: 8 * MB },
  "image/avif": { ext: "avif", maxBytes: 12 * MB },
  "application/pdf": { ext: "pdf", maxBytes: 40 * MB },
  "application/msword": { ext: "doc", maxBytes: 25 * MB },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": {
    ext: "docx",
    maxBytes: 25 * MB,
  },
  "application/vnd.ms-excel": { ext: "xls", maxBytes: 25 * MB },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": {
    ext: "xlsx",
    maxBytes: 25 * MB,
  },
  "application/vnd.ms-powerpoint": { ext: "ppt", maxBytes: 40 * MB },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": {
    ext: "pptx",
    maxBytes: 40 * MB,
  },
};

const KEY_PATTERN = /^cms\/[a-z]+\/\d{4}\/\d{2}\/[0-9a-f]{8}-[a-z0-9-]+\.[a-z0-9]+$/;

export async function presign(input: z.infer<typeof presignSchema>) {
  const type = TYPES[input.contentType];
  if (!type)
    throw new AppError(
      "That file type isn't supported. Upload images, PDFs or Office documents.",
      400,
    );
  if (input.size > type.maxBytes) {
    throw new AppError(`That file is too large — the limit is ${type.maxBytes / MB} MB.`, 400);
  }
  const now = new Date();
  const base = slugify(input.filename.replace(/\.[^.]+$/, "")).slice(0, 60);
  const key = `cms/${input.folder}/${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, "0")}/${randomUUID().slice(0, 8)}-${base}.${type.ext}`;
  const { uploadUrl, publicUrl } = await createPresignedUpload(key, input.contentType, input.size);
  return { uploadUrl, publicUrl, key };
}

export async function registerAsset(adminId: number, input: z.infer<typeof registerSchema>) {
  if (!KEY_PATTERN.test(input.key) || !TYPES[input.contentType])
    throw new AppError("Invalid upload.", 400);
  const id = await insertRow(
    "media_assets",
    {
      key: input.key,
      url: publicUrlFor(input.key),
      filename: input.filename,
      contentType: input.contentType,
      size: input.size,
      width: input.width ?? null,
      height: input.height ?? null,
      altText: input.altText,
      folder: input.folder,
    },
    {
      key: "file_key",
      url: "url",
      filename: "filename",
      contentType: "mime_type",
      size: "size_bytes",
      width: "width",
      height: "height",
      altText: "alt_text",
      folder: "folder",
    },
    { uploaded_by: adminId },
  );
  logActivity(adminId, "uploaded", "media", id, `Uploaded ${input.filename}`);
  return findById<MediaAssetRow>("media_assets", id, "File");
}

export async function listMedia(q: {
  page: number;
  pageSize: number;
  q?: string;
  kind?: "image" | "document";
  folder?: string;
}) {
  const where: Array<string> = [];
  const params: Array<string | number> = [];
  if (q.q) {
    where.push("(m.filename LIKE ? OR m.alt_text LIKE ?)");
    params.push(likePattern(q.q), likePattern(q.q));
  }
  if (q.kind === "image") where.push("m.mime_type LIKE 'image/%'");
  if (q.kind === "document") where.push("m.mime_type NOT LIKE 'image/%'");
  if (q.folder) {
    where.push("m.folder = ?");
    params.push(q.folder);
  }
  const clause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const { limit, offset } = paging(q.page, q.pageSize);
  const pool = getPool();
  const [[rows], [countRows]] = await Promise.all([
    pool.query<RowDataPacket[]>(
      `SELECT m.*, a.full_name AS uploaded_by_name FROM media_assets m
       LEFT JOIN admins a ON a.id = m.uploaded_by
       ${clause} ORDER BY m.created_at DESC, m.id DESC LIMIT ? OFFSET ?`,
      [...params, limit, offset],
    ),
    pool.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM media_assets m ${clause}`, params),
  ]);
  return { items: rows, total: Number(countRows[0]?.n ?? 0) };
}

export async function updateAsset(id: number, input: z.infer<typeof updateMediaSchema>) {
  await findById("media_assets", id, "File");
  await updateRow("media_assets", id, input, {
    altText: "alt_text",
    filename: "filename",
    folder: "folder",
  });
  return findById<MediaAssetRow>("media_assets", id, "File");
}

// Every place a file's URL appears, so the library can warn before deleting
// something still on the site.
export async function findUsage(id: number) {
  const asset = await findById<MediaAssetRow>("media_assets", id, "File");
  const pattern = likePattern(asset.url);
  const pool = getPool();
  const url = asset.url;
  const checks: Array<[string, string, Array<string>]> = [
    [
      "Page",
      "SELECT id, title AS label FROM pages WHERE hero_image_url = ? OR body LIKE ? OR CAST(blocks AS CHAR) LIKE ?",
      [url, pattern, pattern],
    ],
    [
      "Post",
      "SELECT id, title AS label FROM posts WHERE cover_image_url = ? OR attachment_url = ? OR body LIKE ?",
      [url, url, pattern],
    ],
    ["Spotlight", "SELECT id, title AS label FROM spotlights WHERE image_url = ?", [url]],
    [
      "Department",
      "SELECT id, name AS label FROM departments WHERE image_url = ? OR head_photo_url = ? OR body LIKE ?",
      [url, url, pattern],
    ],
    ["Person", "SELECT id, name AS label FROM people WHERE photo_url = ?", [url]],
    ["Document", "SELECT id, title AS label FROM documents WHERE file_url = ?", [url]],
    ["User", "SELECT id, full_name AS label FROM admins WHERE photo_url = ?", [url]],
    [
      "Setting",
      "SELECT setting_key AS id, setting_key AS label FROM site_settings WHERE CAST(value AS CHAR) LIKE ?",
      [pattern],
    ],
  ];
  const results = await Promise.all(
    checks.map(([kind, sql, params]) =>
      pool
        .query<RowDataPacket[]>(sql, params)
        .then(([rows]) =>
          rows.map((r) => ({ kind, id: r.id as number | string, label: r.label as string })),
        ),
    ),
  );
  return results.flat();
}

export async function deleteAsset(adminId: number, id: number) {
  const asset = await findById<MediaAssetRow>("media_assets", id, "File");
  await deleteObject(asset.file_key);
  await getPool().execute("DELETE FROM media_assets WHERE id = ?", [id]);
  logActivity(adminId, "deleted", "media", id, `Deleted ${asset.filename}`);
}
