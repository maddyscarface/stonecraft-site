import { NextResponse, type NextRequest } from "next/server";
import { clientIp, rateLimit } from "@/lib/server/guards";
import { getWalkthrough, resolveToken, withWalkthroughLock } from "@/lib/walkthrough/store";
import { publicView } from "@/lib/walkthrough/view";
import { completeMedia, deleteMedia, saveStep, selfStart, signMedia, submit, walkthroughEnabled } from "@/lib/walkthrough/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Customer guided-walkthrough API. Auth = the invite token in the X-Walkthrough-Token header (never a query
 * string, never logged). Tokens are looked up by hash, expire, can be revoked, and are NOT consumed by reads.
 * Every response goes through the publicView allowlist: no prices, outcomes, escalations, staff notes or keys.
 */
const H = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow", "Referrer-Policy": "no-referrer" };
const out = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: H });
const ACTIONS = new Set(["session", "step", "media-sign", "media-complete", "media-delete", "submit", "start"]);

async function readBody(req: NextRequest): Promise<Record<string, unknown> | null> {
  const raw = await req.text();
  if (raw.length > 32_000) return null;
  try { const v = raw ? JSON.parse(raw) : {}; return v && typeof v === "object" && !Array.isArray(v) ? v : null; } catch { return null; }
}

async function handle(req: NextRequest, action: string) {
  if (!walkthroughEnabled() || !ACTIONS.has(action)) return out({ ok: false, error: "Not found" }, 404);
  const ip = clientIp(req.headers);
  if (!(await rateLimit(`wt:${action}:${ip}`, action === "session" ? 120 : action === "start" ? 5 : 240, 600))) return out({ ok: false, error: "Too many requests. Please wait a few minutes." }, 429);

  if (action === "start") {
    if (req.method !== "POST") return out({ ok: false, error: "Method not allowed" }, 405);
    const b = await readBody(req); if (!b) return out({ ok: false, error: "Invalid request" }, 400);
    const leadId = String(b.leadId ?? ""); const workType = String(b.workType ?? "");
    if (!/^[A-Za-z0-9_-]{6,100}$/.test(leadId)) return out({ ok: false, error: "Invalid request" }, 400);
    const r = await selfStart(leadId, workType);
    return r.ok ? out({ ok: true, token: r.data.token, reference: r.data.reference }, 201) : out({ ok: false, error: r.error }, r.status);
  }

  const w = await resolveToken(req.headers.get("x-walkthrough-token"));
  if (!w) return out({ ok: false, error: "This walkthrough link is no longer valid. Ask us for a new one at info@stonecraftpros.com." }, 401);

  if (action === "session") {
    if (req.method !== "GET") return out({ ok: false, error: "Method not allowed" }, 405);
    return out({ ok: true, walkthrough: publicView(w) });
  }
  if (req.method !== "POST") return out({ ok: false, error: "Method not allowed" }, 405);
  const b = await readBody(req); if (!b) return out({ ok: false, error: "Invalid request" }, 400);
  const res = await withWalkthroughLock(w.id, async () => {
    const fresh = (await getWalkthrough(w.id)) ?? w; // re-read inside the lock so parallel uploads never overwrite each other
    return run(action, fresh, b);
  });
  return res === "busy" ? out({ ok: false, error: "Busy saving. Please try again." }, 429) : res;
}

async function run(action: string, w: NonNullable<Awaited<ReturnType<typeof resolveToken>>>, b: Record<string, unknown>) {
  switch (action) {
    case "step": { const r = await saveStep(w, b, { source: "customer", id: "customer" }); return r.ok ? out({ ok: true, walkthrough: publicView(r.data) }) : out({ ok: false, error: r.error }, r.status); }
    case "media-sign": { const r = await signMedia(w, b); return r.ok ? out({ ok: true, ...r.data }) : out({ ok: false, error: r.error }, r.status); }
    case "media-complete": { const r = await completeMedia(w, String(b.mediaId ?? "")); return r.ok ? out({ ok: true, ...r.data }) : out({ ok: false, error: r.error }, r.status); }
    case "media-delete": { const r = await deleteMedia(w, String(b.mediaId ?? "")); return r.ok ? out({ ok: true, ...r.data }) : out({ ok: false, error: r.error }, r.status); }
    case "submit": { const r = await submit(w); return r.ok ? out({ ok: true, reference: r.data.reference }) : out({ ok: false, error: r.error }, r.status); }
  }
  return out({ ok: false, error: "Not found" }, 404);
}

type Ctx = { params: Promise<{ action: string }> };
export async function GET(req: NextRequest, ctx: Ctx) { return handle(req, (await ctx.params).action); }
export async function POST(req: NextRequest, ctx: Ctx) { return handle(req, (await ctx.params).action); }
