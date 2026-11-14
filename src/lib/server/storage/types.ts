export type SignedUrl = { url: string; method: "PUT" | "GET"; headers: Record<string, string>; expiresAt: string };

/**
 * Private file storage for Phase 4 (walkthrough media, ops documents, proposal exports). Objects are never
 * public; every read and write goes through a short-lived signed URL. Keys are opaque (no client filenames).
 */
export interface PrivateStore {
  readonly name: "local" | "supabase";
  readonly durable: boolean;
  readonly maxBytes: number;
  signUpload(key: string, contentType: string, size: number, ttlSec: number): Promise<SignedUrl>;
  signDownload(key: string, ttlSec: number, downloadName?: string): Promise<SignedUrl>;
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>;
  remove(key: string): Promise<void>;
}
