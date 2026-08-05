"use client";

import { supabaseBrowser } from "./supabase/client";

const BUCKET = "item-photos";

/** Photos are stored as a bare path; this turns one into a displayable URL. */
export function photoUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * Shrink a phone photo before uploading.
 *
 * A modern phone camera produces 3-6 MB per shot. At 1600px on the long edge
 * a garment or shoe is still perfectly clear, and the file drops to roughly
 * 200-400 KB — which matters on Lebanese mobile data and on the free storage
 * tier. If the browser cannot decode the format (some HEIC cases), we give up
 * quietly and upload the original.
 */
async function shrink(file: File, maxEdge = 1600, quality = 0.82): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);

    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", quality),
    );

    return blob ?? file;
  } catch {
    return file;
  }
}

/**
 * Uploads and returns the storage path to save on the item.
 *
 * `folder` matters for permissions: the public request form may only write
 * inside `requests/`, which is what the storage policy allows for anon.
 */
export async function uploadPhoto(file: File, folder?: string): Promise<string> {
  const blob = await shrink(file);
  const isJpeg = blob.type === "image/jpeg" || blob !== (file as Blob);
  const ext = isJpeg ? "jpg" : (file.name.split(".").pop() || "jpg").toLowerCase();

  // A random name is what keeps the public URL unguessable.
  const path = `${folder ? `${folder}/` : ""}${crypto.randomUUID()}.${ext}`;

  const { error } = await supabaseBrowser()
    .storage.from(BUCKET)
    .upload(path, blob, {
      contentType: isJpeg ? "image/jpeg" : file.type,
      cacheControl: "31536000",
      upsert: false,
    });

  if (error) throw error;
  return path;
}

/** Best-effort cleanup; a failure here must not block the edit. */
export async function deletePhoto(path: string): Promise<void> {
  await supabaseBrowser().storage.from(BUCKET).remove([path]);
}
