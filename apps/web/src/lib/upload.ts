import type { MediaAssetRow } from "@aka/db";
import { api } from "./api-client";

export type MediaFolder =
  | "general"
  | "pages"
  | "posts"
  | "spotlights"
  | "people"
  | "departments"
  | "documents"
  | "settings";

export const MEDIA_FOLDERS: Array<{ key: MediaFolder; label: string }> = [
  { key: "general", label: "General" },
  { key: "pages", label: "Pages" },
  { key: "posts", label: "News & events" },
  { key: "spotlights", label: "Spotlights" },
  { key: "people", label: "People" },
  { key: "departments", label: "Departments" },
  { key: "documents", label: "Documents" },
  { key: "settings", label: "Site settings" },
];

export const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/gif,image/avif";
export const DOCUMENT_ACCEPT =
  "application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation";

export type MediaAsset = MediaAssetRow & { uploaded_by_name?: string | null };

export const isImage = (asset: Pick<MediaAssetRow, "mime_type">) =>
  asset.mime_type.startsWith("image/");

function imageSize(file: File): Promise<{ width: number; height: number } | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      resolve(null);
      URL.revokeObjectURL(url);
    };
    img.src = url;
  });
}

// Uploads straight to R2 with a presigned URL, then records the file in the
// media library. Returns the library record (its `url` is public).
export async function uploadToLibrary(
  file: File,
  folder: MediaFolder,
  onProgress?: (fraction: number) => void,
): Promise<MediaAsset> {
  const { uploadUrl, key } = await api.post<{ uploadUrl: string; key: string }>("/media/presign", {
    filename: file.name,
    contentType: file.type,
    size: file.size,
    folder,
  });

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(e.loaded / e.total);
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300
        ? resolve()
        : reject(new Error("Upload to storage failed."));
    xhr.onerror = () =>
      reject(new Error("Couldn't reach file storage. Check the bucket's CORS settings."));
    xhr.send(file);
  });

  const size = await imageSize(file);
  const { asset } = await api.post<{ asset: MediaAsset }>("/media", {
    key,
    filename: file.name,
    contentType: file.type,
    size: file.size,
    width: size?.width ?? null,
    height: size?.height ?? null,
    folder,
  });
  return asset;
}
