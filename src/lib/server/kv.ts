import "server-only";
import { kvConfigured, kvDel, kvGet, kvIncr, kvSet, kvSetNx, listPush, listRange, __resetMemoryStore as resetStore } from "@/lib/store";

/**
 * String KV adapter used by the Phase 4 ops / DataMoon / walkthrough / estimator modules (same interface as the
 * BuildGhana Phase 4 port). It sits on top of StoneCraft's existing src/lib/store.ts, so it shares the same
 * Upstash database in production and the same flagged in-memory fallback in dev/sandbox/preview.
 */
export { kvConfigured };

export const kv = {
  get: (key: string) => kvGet<string>(key),
  set: (key: string, value: string, ttlSec?: number) => kvSet(key, value, ttlSec),
  setNX: (key: string, value: string, ttlSec: number) => kvSetNx(key, value, ttlSec),
  incr: (key: string, ttlSec: number) => kvIncr(key, ttlSec),
  del: (key: string) => kvDel(key),
  /** Newest-first list read (LPUSH order). */
  lrange: (key: string, start = 0, stop = -1) => listRange<string>(key, start, stop === -1 ? 4999 : stop),
  lpush: (key: string, value: string) => listPush(key, value, 5000),
};

/** Test helper */
export function __resetMemoryStore() { resetStore(); }
