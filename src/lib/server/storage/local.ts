import "server-only";
import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import { signFileUrl } from "./sign";
import type { PrivateStore, SignedUrl } from "./types";

/**
 * Development / sandbox adapter. Writes to PRIVATE_FILES_DIR or the OS temp dir.
 * NOT durable on Vercel (each instance has its own /tmp) — configure Supabase Storage for real use.
 */
const root = () => process.env.PRIVATE_FILES_DIR || path.join(os.tmpdir(), "stonecraft-private");
const safePath = (key: string) => {
  if (!/^[a-z0-9/_.-]+$/i.test(key) || key.includes("..")) throw new Error("bad key");
  return path.join(root(), key);
};

export const localStore: PrivateStore = {
  name: "local",
  durable: false,
  maxBytes: 60 * 1024 * 1024,
  async signUpload(key, contentType, size, ttlSec): Promise<SignedUrl> {
    const exp = Math.floor(Date.now() / 1000) + ttlSec;
    const sig = signFileUrl("put", key, exp, `${contentType}\n${size}`);
    const q = new URLSearchParams({ key, exp: String(exp), ct: contentType, size: String(size), sig });
    return { url: `/api/files?${q}`, method: "PUT", headers: { "Content-Type": contentType }, expiresAt: new Date(exp * 1000).toISOString() };
  },
  async signDownload(key, ttlSec, downloadName): Promise<SignedUrl> {
    const exp = Math.floor(Date.now() / 1000) + ttlSec;
    const sig = signFileUrl("get", key, exp, downloadName || "");
    const q = new URLSearchParams({ key, exp: String(exp), sig, ...(downloadName ? { name: downloadName } : {}) });
    return { url: `/api/files?${q}`, method: "GET", headers: {}, expiresAt: new Date(exp * 1000).toISOString() };
  },
  async put(key, body, contentType) {
    const p = safePath(key);
    await fs.mkdir(path.dirname(p), { recursive: true });
    await fs.writeFile(p, body);
    await fs.writeFile(p + ".meta.json", JSON.stringify({ contentType }));
  },
  async get(key) {
    try {
      const p = safePath(key);
      const [body, meta] = await Promise.all([fs.readFile(p), fs.readFile(p + ".meta.json", "utf8").catch(() => "{}")]);
      return { body: new Uint8Array(body), contentType: JSON.parse(meta).contentType || "application/octet-stream" };
    } catch { return null; }
  },
  async remove(key) {
    const p = safePath(key);
    await Promise.all([fs.rm(p, { force: true }), fs.rm(p + ".meta.json", { force: true })]);
  },
};
