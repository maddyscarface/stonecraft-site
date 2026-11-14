import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/** HMAC for local signed URLs. Uses FILES_SIGNING_SECRET, falling back to ADMIN_TOKEN (dev/sandbox only). */
const secret = () => process.env.FILES_SIGNING_SECRET || process.env.ADMIN_TOKEN || "dev-only-files-secret";
export const signFileUrl = (op: "put" | "get", key: string, exp: number, extra = "") =>
  createHmac("sha256", secret()).update(`${op}\n${key}\n${exp}\n${extra}`).digest("hex");
export function verifyFileSig(op: "put" | "get", key: string, exp: number, sig: string, extra = "") {
  if (!(exp > Math.floor(Date.now() / 1000))) return false;
  const a = Buffer.from(signFileUrl(op, key, exp, extra)), b = Buffer.from(sig || "");
  return a.length === b.length && timingSafeEqual(a, b);
}
