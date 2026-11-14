import "server-only";
import { localStore } from "./local";
import { supabaseConfigured, supabaseStore } from "./supabase";
import type { PrivateStore } from "./types";

/** Supabase private bucket when configured, otherwise the local sandbox adapter (NOT durable, flagged in admin health). */
export function privateStore(): PrivateStore {
  return supabaseConfigured() ? supabaseStore : localStore;
}
/** Back-compat name used by the ported ops API. */
export const documentStore = privateStore;
export type { PrivateStore as DocumentStore } from "./types";
export { supabaseConfigured };
