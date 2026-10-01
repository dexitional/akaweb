// Cloudflare R2 (S3-compatible) — every CMS asset lives here. Browsers upload
// straight to the bucket with a short-lived presigned PUT, so file bytes
// never pass through the app server.
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { AppError } from "../middleware/error-handler.js";

let client: S3Client | undefined;

function config() {
  const { R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME, R2_PUBLIC_DOMAIN } = process.env;
  // Unset, or still a placeholder from .env.example.
  const missing = (v: string | undefined) => !v || /your[_-]/i.test(v);
  if (
    !R2_ENDPOINT || !R2_ACCESS_KEY || !R2_SECRET_KEY || !R2_BUCKET_NAME || !R2_PUBLIC_DOMAIN ||
    [R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY].some(missing)
  ) {
    throw new AppError("File storage isn't configured. Set the R2_* environment variables.", 400);
  }
  client ??= new S3Client({
    region: process.env.R2_REGION ?? "auto",
    endpoint: R2_ENDPOINT,
    credentials: { accessKeyId: R2_ACCESS_KEY, secretAccessKey: R2_SECRET_KEY },
    // Newer SDKs sign a CRC32 of the (empty) body into presigned URLs by
    // default, which makes every browser PUT fail — only checksum when asked.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return { s3: client, bucket: R2_BUCKET_NAME, publicDomain: R2_PUBLIC_DOMAIN.replace(/\/$/, "") };
}

export function publicUrlFor(key: string) {
  return `${config().publicDomain}/${key}`;
}

// The exact Content-Length is signed in, so the browser can't upload a
// larger file than the size the server approved.
export async function createPresignedUpload(key: string, contentType: string, size: number) {
  const { s3, bucket } = config();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
    ContentLength: size,
    CacheControl: "public, max-age=31536000, immutable",
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 600, signableHeaders: new Set(["content-type", "content-length"]) });
  return { uploadUrl, publicUrl: publicUrlFor(key) };
}

export async function deleteObject(key: string) {
  const { s3, bucket } = config();
  await s3.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
}

// Only keys under our public domain belong to us.
export function keyFromUrl(url: string): string | null {
  const domain = (process.env.R2_PUBLIC_DOMAIN ?? "").replace(/\/$/, "");
  if (!domain || !url.startsWith(`${domain}/`)) return null;
  return url.slice(domain.length + 1);
}
