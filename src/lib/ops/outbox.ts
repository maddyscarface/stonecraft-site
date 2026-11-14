import "server-only";
import { randomUUID } from "node:crypto";
import { kv } from "@/lib/server/kv";
import { BRAND_ID } from "./brand";

/**
 * Durable outbox (KV-backed: Upstash in production, memory in local/sandbox — clearly reported as non-durable).
 * Mirrors db/migrations/0004_phase4_ops.up.sql `event_outbox` + `job_retry`.
 *
 *  - enqueue() is idempotent on `idempotencyKey` (one job per key, ever).
 *  - processDue() claims due jobs with a per-job lock, runs the registered handler and applies exponential
 *    backoff (1m, 2m, 4m … capped at 6h). After `maxAttempts` the job moves to `dead` (DLQ) and can be replayed.
 *  - A handler result of "skipped" (integration not configured) parks the job as `blocked` without burning an attempt.
 *  - Jobs reference records by id only. Payloads never contain documents, raw vendor rows or secrets.
 */
export const jobKinds = ["ghl.lead", "ghl.walkthrough", "datamoon.import", "datamoon.ghl_contact"] as const;
export type JobKind = (typeof jobKinds)[number];
export type JobStatus = "pending" | "processing" | "done" | "blocked" | "dead";
export type Job = {
  id: string; brand: string; kind: JobKind; ref: string; idempotencyKey: string; status: JobStatus;
  attempts: number; maxAttempts: number; nextAttemptAt: number; lastError?: string; createdAt: string; updatedAt: string;
  processingVersion: number; lineage: { source: string; parentEventId?: string }; payload?: Record<string, string | number | boolean>;
};
export type HandlerResult = { status: "ok" | "skipped" | "error"; detail?: string };
export type Handler = (job: Job) => Promise<HandlerResult>;

const PROCESSING_VERSION = 1;
const K = { job: (id: string) => `ops:job:${id}`, idx: "ops:jobs", idem: (k: string) => `ops:job:idem:${k}`, lock: (id: string) => `ops:job:lock:${id}` };
export const backoffMs = (attempts: number) => Math.min(60_000 * 2 ** Math.max(0, attempts - 1), 6 * 60 * 60 * 1000);

const save = async (j: Job) => { j.updatedAt = new Date().toISOString(); await kv.set(K.job(j.id), JSON.stringify(j)); };
export async function getJob(id: string): Promise<Job | null> { const r = await kv.get(K.job(id)); return r ? (JSON.parse(r) as Job) : null; }

export async function enqueue(kind: JobKind, ref: string, idempotencyKey: string, opts: { source: string; parentEventId?: string; maxAttempts?: number; payload?: Job["payload"]; error?: string } = { source: "system" }): Promise<{ job: Job; created: boolean }> {
  const id = randomUUID();
  const got = await kv.setNX(K.idem(idempotencyKey), id, 60 * 60 * 24 * 365);
  if (!got) {
    const existingId = await kv.get(K.idem(idempotencyKey));
    const existing = existingId ? await getJob(existingId) : null;
    if (existing) return { job: existing, created: false };
  }
  const now = Date.now();
  const job: Job = {
    id, brand: BRAND_ID, kind, ref, idempotencyKey, status: "pending", attempts: 0, maxAttempts: opts.maxAttempts ?? 6,
    nextAttemptAt: now, lastError: opts.error?.slice(0, 300), createdAt: new Date(now).toISOString(), updatedAt: new Date(now).toISOString(),
    processingVersion: PROCESSING_VERSION, lineage: { source: opts.source, parentEventId: opts.parentEventId }, payload: opts.payload,
  };
  await save(job);
  await kv.lpush(K.idx, id);
  return { job, created: true };
}

export async function listJobs(limit = 300): Promise<Job[]> {
  const ids = [...new Set(await kv.lrange(K.idx, 0, limit - 1))];
  return (await Promise.all(ids.map(getJob))).filter((j): j is Job => !!j && j.brand === BRAND_ID);
}

export async function runJob(job: Job, handlers: Partial<Record<JobKind, Handler>>, now = Date.now()): Promise<Job> {
  if (!(await kv.setNX(K.lock(job.id), "1", 120))) return job; // another worker has it
  try {
    const h = handlers[job.kind];
    job.status = "processing"; await save(job);
    let r: HandlerResult;
    try { r = h ? await h(job) : { status: "error", detail: `No handler for ${job.kind}` }; }
    catch (e) { r = { status: "error", detail: (e as Error).message }; }
    if (r.status === "ok") { job.status = "done"; job.lastError = undefined; }
    else if (r.status === "skipped") { job.status = "blocked"; job.lastError = r.detail?.slice(0, 300); job.nextAttemptAt = now + 15 * 60_000; }
    else {
      job.attempts += 1; job.lastError = r.detail?.slice(0, 300);
      if (job.attempts >= job.maxAttempts) job.status = "dead";
      else { job.status = "pending"; job.nextAttemptAt = now + backoffMs(job.attempts); }
    }
    await save(job);
    return job;
  } finally { await kv.del(K.lock(job.id)); }
}

/** Process up to `max` due jobs (pending or blocked whose retry time has passed). */
export async function processDue(handlers: Partial<Record<JobKind, Handler>>, now = Date.now(), max = 25) {
  const due = (await listJobs()).filter((j) => (j.status === "pending" || j.status === "blocked") && j.nextAttemptAt <= now).slice(0, max);
  const results: Job[] = [];
  for (const j of due) results.push(await runJob(j, handlers, now));
  return { processed: results.length, done: results.filter((j) => j.status === "done").length, failed: results.filter((j) => j.status === "pending" || j.status === "dead").length, results };
}

/** DLQ replay: resets attempts and schedules immediately. Idempotency key is unchanged (no duplicate job). */
export async function replay(id: string): Promise<Job | null> {
  const j = await getJob(id);
  if (!j || j.brand !== BRAND_ID || j.status === "done") return null;
  j.status = "pending"; j.attempts = 0; j.nextAttemptAt = Date.now(); await save(j);
  return j;
}

export async function outboxStats() {
  const jobs = await listJobs();
  const by = (s: JobStatus) => jobs.filter((j) => j.status === s).length;
  return { total: jobs.length, pending: by("pending"), blocked: by("blocked"), dead: by("dead"), done: by("done"), processing: by("processing"), oldestPendingAt: jobs.filter((j) => j.status === "pending").map((j) => j.createdAt).sort()[0] ?? null };
}
