"use client";
import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { track } from "@/lib/tracking/client";

export type Uploaded = { key: string; name: string; preview: string };

const MAX_FILES = 10;
const MAX_BYTES = 20 * 1024 * 1024;
const OK_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

/** Downscale large photos in the browser (keeps uploads fast on mobile). HEIC that the browser can't decode is sent as-is. */
async function shrink(file: File): Promise<Blob> {
  if (!/image\/(jpeg|png|webp)/.test(file.type) || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2000 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale); canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((res) => canvas.toBlob((b) => res(b ?? file), "image/jpeg", 0.85));
  } catch { return file; }
}

export function PhotoUpload({ eventId, value, onChange }: { eventId: string; value: Uploaded[]; onChange: (v: Uploaded[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [drag, setDrag] = useState(false);

  async function handle(files: FileList | File[]) {
    setError(null);
    const list = Array.from(files).slice(0, MAX_FILES - value.length);
    if (!list.length) { setError(`Up to ${MAX_FILES} photos.`); return; }
    const added: Uploaded[] = [];
    for (const f of list) {
      if (!OK_TYPES.includes(f.type) && !/\.(heic|heif)$/i.test(f.name)) { setError(`${f.name}: please upload JPG, PNG, WebP or HEIC.`); continue; }
      if (f.size > MAX_BYTES) { setError(`${f.name} is over 20 MB.`); continue; }
      setBusy((n) => n + 1);
      try {
        const blob = await shrink(f);
        const contentType = blob.type || f.type || "image/heic";
        const sign = await fetch("/api/uploads/sign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ filename: f.name, contentType, size: blob.size, eventId }) });
        if (!sign.ok) throw new Error((await sign.json().catch(() => ({}))).error ?? "Upload not available");
        const s = (await sign.json()) as { uploadUrl: string; method: string; headers: Record<string, string>; key: string };
        const put = await fetch(s.uploadUrl, { method: s.method, headers: s.headers, body: blob });
        if (!put.ok) throw new Error(`Upload failed (${put.status})`);
        added.push({ key: s.key, name: f.name, preview: URL.createObjectURL(blob) });
        track("photo_upload_success", { count: value.length + added.length });
        // Spec §4 funnel event. Only a count is sent: never photos, filenames or URLs.
        track("photos_received", { count: value.length + added.length });
      } catch (e) {
        setError(`${f.name}: ${(e as Error).message}. You can also text photos after submitting.`);
      } finally { setBusy((n) => n - 1); }
    }
    if (added.length) onChange([...value, ...added]);
  }

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); handle(e.dataTransfer.files); }}
        onClick={() => input.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && input.current?.click()}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition ${drag ? "border-patina bg-linen-pale" : "border-hunter/40 bg-cream"}`}>
        {busy ? <Loader2 className="animate-spin text-linen-dark" size={36} /> : <Camera className="text-linen-dark" size={36} />}
        <p className="font-semibold">{busy ? "Uploading…" : "Tap to add photos or drop them here"}</p>
        <p className="text-xs text-hunter/60">3–4 photos is ideal: a wide shot of the space and close-ups of problem areas. Phone photos are perfect. Max 20 MB each.</p>
        <input ref={input} type="file" accept="image/*,.heic,.heif" multiple hidden onChange={(e) => e.target.files && handle(e.target.files)} data-testid="photo-input" />
      </div>
      {error && <p className="mt-2 text-sm text-red-700" role="alert">{error}</p>}
      {value.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
          {value.map((u) => (
            <li key={u.key} className="relative overflow-hidden rounded border border-cream-dark bg-white">
              <img src={u.preview} alt={u.name} className="aspect-square w-full object-cover" />
              <button type="button" aria-label={`Remove ${u.name}`} onClick={() => onChange(value.filter((x) => x.key !== u.key))} className="absolute right-1 top-1 rounded-full bg-hunter p-1 text-white"><X size={12} /></button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
