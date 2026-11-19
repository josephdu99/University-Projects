"use client";

import { useState } from "react";
import { C } from "@/lib/marketing-theme";
import { hintStyle, errStyle } from "./fields";

const MAX_EDGE = 1280;

/**
 * Shrink a photo in the browser before it is uploaded: phones produce 4–12 MB
 * images, the upload limit is 2 MB, and nobody needs more than 1280 pixels
 * on a card. Re-encoding through a canvas also drops the camera's location
 * metadata, which is nobody's business.
 */
async function shrink(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.82),
  );
  if (!blob) throw new Error("encode failed");
  return new File([blob], "photo.jpg", { type: "image/jpeg" });
}

export function PhotoPicker({
  label,
  hint,
  onPick,
  hasPhoto,
}: {
  label: string;
  hint: string;
  hasPhoto: boolean;
  onPick: (file: File | null, previewUrl: string | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) && file.type !== "") {
      setError("Use a JPEG, PNG or WebP photo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const small = await shrink(file);
      onPick(small, URL.createObjectURL(small));
    } catch {
      setError("We couldn't read that photo. Try a JPEG or PNG.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
      <label
        className="su-file"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          cursor: "pointer",
          fontWeight: 700,
          fontSize: 15,
          padding: "12px 18px",
          borderRadius: 999,
          border: `1.5px solid ${C.ink}`,
        }}
      >
        {busy ? "Preparing…" : hasPhoto ? "Change photo" : label}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={onChange}
          style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", width: "100%" }}
        />
      </label>
      {hasPhoto && (
        <button
          type="button"
          className="su-btn"
          onClick={() => onPick(null, null)}
          style={{
            border: 0,
            background: "transparent",
            cursor: "pointer",
            fontFamily: "inherit",
            fontWeight: 600,
            fontSize: 14,
            color: "oklch(40% 0.02 60)",
            textDecoration: "underline",
            textUnderlineOffset: 3,
          }}
        >
          Remove
        </button>
      )}
      <span role={error ? "alert" : undefined} style={error ? errStyle : hintStyle}>
        {error ?? hint}
      </span>
    </div>
  );
}
