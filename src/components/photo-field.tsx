"use client";

import { useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { deletePhoto, photoUrl, uploadPhoto } from "@/lib/photos";

/**
 * One photo slot: pick from the gallery or take one with the camera, see it
 * immediately, replace or remove it. Uploads as soon as a file is chosen so
 * the picture is safe even if the form is abandoned.
 */
export function PhotoField({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string | null;
  onChange: (path: string | null) => void;
}) {
  const { t } = useI18n();
  const input = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const url = photoUrl(value);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // let the same file be picked again later
    if (!file) return;

    setBusy(true);
    setError(null);

    try {
      const path = await uploadPhoto(file);
      const previous = value;
      onChange(path);
      if (previous) void deletePhoto(previous);
    } catch {
      setError(t("item.photoError"));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const previous = value;
    onChange(null);
    if (previous) void deletePhoto(previous);
  }

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-stone-700">{label}</p>

      {url ? (
        <div className="relative overflow-hidden rounded-xl border border-cream-300 bg-white">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={label} className="h-40 w-full object-cover" />

          <div className="flex divide-x divide-cream-200 border-t border-cream-200">
            <button
              type="button"
              onClick={() => input.current?.click()}
              disabled={busy}
              className="flex-1 py-2 text-xs font-medium text-stone-600 transition hover:bg-cream-50 disabled:opacity-50"
            >
              {busy ? t("item.photoUploading") : t("item.photoChange")}
            </button>
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="flex-1 py-2 text-xs font-medium text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              {t("item.photoRemove")}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => input.current?.click()}
          disabled={busy}
          className="flex h-24 w-full flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-cream-300 bg-white text-sm text-stone-500 transition hover:border-stone-400 hover:text-stone-700 disabled:opacity-50"
        >
          <CameraIcon />
          {busy ? t("item.photoUploading") : t("item.photoAdd")}
        </button>
      )}

      {hint && !url && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-700">{error}</p>}

      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  );
}

function CameraIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      aria-hidden="true"
    >
      <path d="M3 8.5A1.5 1.5 0 0 1 4.5 7h2.2a1 1 0 0 0 .84-.46l.92-1.42A1 1 0 0 1 9.3 4.7h5.4a1 1 0 0 1 .84.42l.92 1.42a1 1 0 0 0 .84.46h2.2A1.5 1.5 0 0 1 21 8.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5z" />
      <circle cx="12" cy="13" r="3.4" />
    </svg>
  );
}
