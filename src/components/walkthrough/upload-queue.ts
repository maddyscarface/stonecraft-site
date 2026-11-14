/**
 * Client upload pipeline for the guided walkthrough.
 *  - Photos are re-encoded through a canvas (max 2560 px, JPEG) which drops EXIF/GPS before upload. If the
 *    browser can't decode the file (e.g. HEIC outside Safari) the original is sent and the server strips what it
 *    can (JPEG/PNG/WebP) or flags "metadata retained" for staff.
 *  - Pending items are persisted in IndexedDB (keyed by walkthrough reference, never by token) so a dropped
 *    connection or closed tab can resume; each upload retries with backoff.
 */
export type QueueItem = { localId: string; ref: string; stepKey: string; kind: "photo" | "video"; type: string; blob: Blob; attempts: number; mediaId?: string };

const DB = "sc-walkthrough"; const STORE = "uploads";
function db(): Promise<IDBDatabase | null> {
  return new Promise((res) => {
    try { const r = indexedDB.open(DB, 1); r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: "localId" }); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); }
  });
}
async function tx<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T | null> {
  const d = await db(); if (!d) return null;
  return new Promise((res) => { try { const q = fn(d.transaction(STORE, mode).objectStore(STORE)); q.onsuccess = () => res(q.result); q.onerror = () => res(null); } catch { res(null); } });
}
export const persist = (i: QueueItem) => tx("readwrite", (s) => s.put(i));
export const forget = (localId: string) => tx("readwrite", (s) => s.delete(localId));
export async function pendingFor(ref: string): Promise<QueueItem[]> { const all = (await tx<QueueItem[]>("readonly", (s) => s.getAll() as IDBRequest<QueueItem[]>)) ?? []; return all.filter((i) => i.ref === ref); }

export async function prepareImage(file: File): Promise<{ blob: Blob; type: string }> {
  if (!file.type.startsWith("image/")) return { blob: file, type: file.type };
  try {
    const bmp = await createImageBitmap(file, { imageOrientation: "from-image" } as ImageBitmapOptions);
    const scale = Math.min(1, 2560 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas"); c.width = Math.round(bmp.width * scale); c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.86));
    if (blob && blob.size > 0) return { blob, type: "image/jpeg" };
  } catch { /* fall through: upload original */ }
  return { blob: file, type: file.type || "application/octet-stream" };
}

type Post = (path: string, body: unknown) => Promise<{ ok: boolean; status: number; j: any }>;
export async function uploadOne(item: QueueItem, post: Post, onProgress?: (p: string) => void): Promise<{ ok: true } | { ok: false; fatal: boolean; error: string }> {
  onProgress?.("preparing");
  // A previous attempt that signed but never completed leaves a pending record: remove it first.
  if (item.mediaId) { await post("media-delete", { mediaId: item.mediaId }).catch(() => undefined); item.mediaId = undefined; }
  const s = await post("media-sign", { stepKey: item.stepKey, kind: item.kind, contentType: item.type, size: item.blob.size });
  if (!s.ok) return { ok: false, fatal: s.status >= 400 && s.status < 500 && s.status !== 429 && s.status !== 409, error: s.j.error || "Upload refused" };
  item.mediaId = s.j.mediaId; await persist(item);
  onProgress?.("uploading");
  let put: Response;
  try { put = await fetch(s.j.upload.url, { method: s.j.upload.method || "PUT", headers: s.j.upload.headers, body: item.blob }); } catch { return { ok: false, fatal: false, error: "Connection lost" }; }
  if (!put.ok) { const fatal = put.status === 413 || put.status === 415; if (fatal) { await post("media-delete", { mediaId: item.mediaId }).catch(() => undefined); item.mediaId = undefined; } return { ok: false, fatal, error: `Upload failed (${put.status})` }; }
  onProgress?.("checking");
  const c = await post("media-complete", { mediaId: s.j.mediaId });
  if (!c.ok) { if (c.status === 415) item.mediaId = undefined; return { ok: false, fatal: c.status === 415, error: c.j.error || "Upload check failed" }; }
  item.mediaId = undefined;
  return { ok: true };
}
