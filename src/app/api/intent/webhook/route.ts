/**
 * Intent-data webhook (DataMoon / AudienceLab). Returns 404 while disabled (default).
 * When enabled, verifies x-intent-secret, normalises signals, stores them and (if GHL is
 * configured) upserts person-level signals into the StoneCraft sub-account as tagged contacts.
 */
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { activeIntentProvider, intentTags } from "@/lib/intent/providers";
import { listPush } from "@/lib/store";
import { upsertIntentContact } from "@/lib/crm/ghl";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const provider = activeIntentProvider();
  if (!provider) return NextResponse.json({ error: "not found" }, { status: 404 });
  const secret = process.env.INTENT_WEBHOOK_SECRET ?? "";
  const got = req.headers.get("x-intent-secret") ?? "";
  if (got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const raw = await req.text();
  if (raw.length > 512_000) return NextResponse.json({ error: "too large" }, { status: 413 });
  let body: unknown; try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "invalid" }, { status: 400 }); }
  const signals = provider.parse(body).slice(0, 200);
  const results = [];
  for (const s of signals) {
    await listPush("intent_signals", { ...s, email: s.email ? "[redacted]" : undefined, phone: undefined, at: new Date().toISOString() });
    results.push(s.kind === "person" && s.email ? await upsertIntentContact(s, intentTags(s)) : { mode: "skipped", reason: "company-level signal" });
  }
  return NextResponse.json({ ok: true, provider: provider.id, received: signals.length, results: results.map((r) => ({ mode: r.mode, error: (r as { error?: string }).error })) });
}

export async function GET() {
  return NextResponse.json({ enabled: Boolean(activeIntentProvider()) }, { status: activeIntentProvider() ? 200 : 404 });
}
