import "server-only";
import { rateLimit as rl } from "@/lib/store";

/** Boolean rate limiter used by the Phase 4 ops modules (true = allowed). */
export async function rateLimit(identifier: string, limit = 5, windowSec = 600): Promise<boolean> {
  return (await rl(identifier, limit, windowSec)).ok;
}

export function clientIp(headers: Headers): string {
  const xf = headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0]!.trim();
  return headers.get("x-real-ip") || "0.0.0.0";
}
