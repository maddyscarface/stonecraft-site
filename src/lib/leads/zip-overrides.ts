import "server-only";
import { kv } from "@/lib/server/kv";

/** Admin-editable FL ZIP → county overrides (Ops console › Service areas). Empty by default. */
export const ZIP_OVERRIDE_KEY = "areas:zip-overrides";
export async function zipOverrides(): Promise<Record<string, "palm-beach" | "broward" | "none">> {
  try { const r = await kv.get(ZIP_OVERRIDE_KEY); return r ? JSON.parse(r) : {}; } catch { return {}; }
}
