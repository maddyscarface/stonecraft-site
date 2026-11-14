/**
 * Walkthrough media validation (pure; unit-tested).
 *  - MIME allowlist + per-kind size limits
 *  - magic-byte sniffing (the declared type must match the bytes)
 *  - metadata minimisation: strips EXIF/XMP/IPTC/comments from JPEG, eXIf/text chunks from PNG and EXIF/XMP
 *    chunks from WebP. HEIC/HEIF and video metadata cannot be safely rewritten without native libraries, so those
 *    are flagged "metadata_retained" and are only ever served to staff through short-lived signed URLs.
 *    (The browser re-encodes JPEG/PNG/WebP/HEIC-on-Safari through a canvas before upload, which already drops GPS.)
 */
export const PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"] as const;
export const VIDEO_TYPES = ["video/mp4", "video/quicktime", "video/webm"] as const;
export const MEDIA_LIMITS = { photoBytes: 20 * 1024 * 1024, videoBytes: 150 * 1024 * 1024, photosPerWalkthrough: 80, videosPerWalkthrough: 10 };
export const extFor: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "video/mp4": "mp4", "video/quicktime": "mov", "video/webm": "webm" };

export function validateMediaRequest(r: { kind: "photo" | "video"; contentType: string; size: number }, storeMax: number, counts: { photos: number; videos: number }): string | null {
  const types = r.kind === "photo" ? (PHOTO_TYPES as readonly string[]) : (VIDEO_TYPES as readonly string[]);
  if (!types.includes(r.contentType)) return r.kind === "photo" ? "Photos must be JPEG, PNG, WebP or HEIC." : "Videos must be MP4, MOV or WebM.";
  const max = Math.min(r.kind === "photo" ? MEDIA_LIMITS.photoBytes : MEDIA_LIMITS.videoBytes, storeMax);
  if (!(r.size > 0) || r.size > max) return `File too large (max ${Math.round(max / 1024 / 1024)} MB).`;
  if (r.kind === "photo" && counts.photos >= MEDIA_LIMITS.photosPerWalkthrough) return "Photo limit reached for this walkthrough.";
  if (r.kind === "video" && counts.videos >= MEDIA_LIMITS.videosPerWalkthrough) return "Video limit reached for this walkthrough.";
  return null;
}

const ascii = (b: Uint8Array, s: number, n: number) => String.fromCharCode(...b.subarray(s, s + n));

/** Returns the MIME type implied by the file's magic bytes, or null when unrecognised. */
export function sniffMime(b: Uint8Array): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && ascii(b, 1, 3) === "PNG" && b[4] === 0x0d && b[5] === 0x0a) return "image/png";
  if (ascii(b, 0, 4) === "RIFF" && ascii(b, 8, 4) === "WEBP") return "image/webp";
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return "video/webm";
  if (b[0] === 0x25 && ascii(b, 1, 4) === "PDF-") return "application/pdf";
  if (ascii(b, 4, 4) === "ftyp") {
    const brand = ascii(b, 8, 4);
    if (["heic", "heix", "hevc", "hevx", "heim", "heis"].includes(brand)) return "image/heic";
    if (["mif1", "msf1", "avif"].includes(brand)) return brand === "avif" ? null : "image/heif";
    if (brand === "qt  ") return "video/quicktime";
    if (["isom", "iso2", "iso4", "iso5", "iso6", "mp41", "mp42", "avc1", "M4V ", "M4A ", "dash", "3gp4", "3gp5", "3gp6", "MSNV"].includes(brand)) return "video/mp4";
    return null;
  }
  if (["moov", "mdat", "wide", "free", "skip"].includes(ascii(b, 4, 4))) return "video/quicktime";
  return null;
}

/** Declared vs sniffed type check (HEIC/HEIF and MP4/MOV families are interchangeable). */
export function typeMatches(declared: string, sniffed: string | null) {
  if (!sniffed) return false;
  if (declared === sniffed) return true;
  const fam = (t: string) => (t.startsWith("image/hei") ? "heif" : t === "video/mp4" || t === "video/quicktime" ? "isobmff" : t);
  return fam(declared) === fam(sniffed);
}

/** JPEG: drop APP1 (EXIF/XMP), APP13 (IPTC), APP12 and COM segments. Keeps JFIF (APP0), ICC (APP2) and image data. */
export function stripJpeg(b: Uint8Array): Uint8Array {
  if (!(b[0] === 0xff && b[1] === 0xd8)) return b;
  const out: number[] = [0xff, 0xd8];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return b; // malformed: keep original rather than corrupt it
    const marker = b[i + 1]!;
    if (marker === 0xda) { for (let k = i; k < b.length; k++) out.push(b[k]!); return Uint8Array.from(out); } // start of scan → copy rest
    if (marker === 0xd8 || (marker >= 0xd0 && marker <= 0xd7) || marker === 0x01) { out.push(0xff, marker); i += 2; continue; }
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    if (len < 2 || i + 2 + len > b.length) return b;
    const drop = marker === 0xe1 || marker === 0xed || marker === 0xec || marker === 0xfe;
    if (!drop) for (let k = i; k < i + 2 + len; k++) out.push(b[k]!);
    i += 2 + len;
  }
  return b;
}

/** PNG: drop eXIf, tEXt, iTXt, zTXt and tIME chunks. */
export function stripPng(b: Uint8Array): Uint8Array {
  if (sniffMime(b) !== "image/png") return b;
  const parts: Uint8Array[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const len = ((b[i]! << 24) >>> 0) + (b[i + 1]! << 16) + (b[i + 2]! << 8) + b[i + 3]!;
    const type = ascii(b, i + 4, 4);
    const end = i + 12 + len;
    if (end > b.length) return b;
    if (!["eXIf", "tEXt", "iTXt", "zTXt", "tIME"].includes(type)) parts.push(b.subarray(i, end));
    i = end;
    if (type === "IEND") break;
  }
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

/** WebP (RIFF): drop EXIF and XMP chunks and clear the VP8X EXIF/XMP flags. */
export function stripWebp(b: Uint8Array): Uint8Array {
  if (sniffMime(b) !== "image/webp") return b;
  const parts: Uint8Array[] = [];
  let i = 12;
  while (i + 8 <= b.length) {
    const type = ascii(b, i, 4);
    const len = b[i + 4]! | (b[i + 5]! << 8) | (b[i + 6]! << 16) | (b[i + 7]! << 24);
    const end = i + 8 + len + (len % 2);
    if (end > b.length + 1) return b;
    if (type !== "EXIF" && type !== "XMP ") {
      const chunk = Uint8Array.from(b.subarray(i, Math.min(end, b.length)));
      if (type === "VP8X" && chunk.length > 8) chunk[8] = chunk[8]! & ~0x0c; // clear EXIF (0x08) and XMP (0x04) flags
      parts.push(chunk);
    }
    i = end;
  }
  const body = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(12 + body);
  out.set(b.subarray(0, 12));
  const size = 4 + body; out[4] = size & 0xff; out[5] = (size >> 8) & 0xff; out[6] = (size >> 16) & 0xff; out[7] = (size >> 24) & 0xff;
  let o = 12; for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}

export type MetaResult = { body: Uint8Array; metadata: "stripped" | "none_found" | "metadata_retained" };
export function minimiseMetadata(contentType: string, b: Uint8Array): MetaResult {
  const strip = contentType === "image/jpeg" ? stripJpeg : contentType === "image/png" ? stripPng : contentType === "image/webp" ? stripWebp : null;
  if (!strip) return { body: b, metadata: "metadata_retained" };
  const out = strip(b);
  return { body: out, metadata: out.length < b.length ? "stripped" : "none_found" };
}

/** True when a JPEG still carries an EXIF APP1 segment (used by tests and the admin "metadata" badge). */
export function hasJpegExif(b: Uint8Array) {
  let i = 2;
  while (i + 4 <= b.length && b[i] === 0xff) {
    const m = b[i + 1]!; if (m === 0xda) return false;
    const len = (b[i + 2]! << 8) | b[i + 3]!;
    if (m === 0xe1 && ascii(b, i + 4, 4) === "Exif") return true;
    i += 2 + len;
  }
  return false;
}
