import { regionTag } from "@/config/crm";
import { NextResponse, type NextRequest } from "next/server";
import { parseLead } from "@/lib/leads/schema";
import { routeLead } from "@/lib/leads/routing";
import { zipOverrides } from "@/lib/leads/zip-overrides";
import { kv } from "@/lib/server/kv";
import { enqueue } from "@/lib/ops/outbox";
import { defaultScoring, scoreLead, type ScoringConfig } from "@/lib/leads/scoring";
import { pushLeadToGhl } from "@/lib/crm/ghl";
import { externalContactId } from "@/lib/crm/sync";
import { notifyOwner, autoReply } from "@/lib/notify";
import { sendMeta, gaClientIdFromCookie } from "@/lib/tracking/server";
import { memoryStoreBlocked, kvGet, kvSet, kvSetNx, listPush, rateLimit } from "@/lib/store";
import { readUrls, validKeyForEvent } from "@/lib/photos";
import { sendOpenAiEvent } from "@/lib/openai-ads/server";
import { budgetFit, qualifierScore, sanitizeQualifiers } from "@/lib/estimate/qualifiers";
import { estimateConfig } from "@/config/estimate";
import { attributionSnapshot } from "@/lib/attribution/revenue";

export const runtime = "nodejs";

async function verifyTurnstile(token: string | undefined, ip: string) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  const r = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", { method: "POST", body: new URLSearchParams({ secret, response: token, remoteip: ip }) });
  return ((await r.json()) as { success: boolean }).success;
}

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  if (memoryStoreBlocked()) {
    console.error("[lead] Upstash not configured in production — refusing to keep leads in memory");
    return NextResponse.json({ error: "Our form is temporarily unavailable. Please email info@stonecraftpros.com." }, { status: 503 });
  }
  const rl = await rateLimit(`lead:${ip}`, 8, 600);
  if (!rl.ok) return NextResponse.json({ error: "Too many submissions. Please email info@stonecraftpros.com." }, { status: 429 });

  const raw = await req.text();
  if (raw.length > 64_000) return NextResponse.json({ error: "Request too large" }, { status: 413 });
  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return NextResponse.json({ error: "Invalid request" }, { status: 400 }); }

  const parsed = parseLead(body);
  if (!parsed.success) {
    const fields: Record<string, string> = {};
    for (const i of parsed.error.issues) fields[String(i.path[0])] = i.message;
    if (fields.website) return NextResponse.json({ ok: true }); // honeypot: pretend success
    return NextResponse.json({ error: "Please check the highlighted fields.", fields }, { status: 422 });
  }
  const lead = parsed.data;

  // Bot timing: under 3s from first keystroke to submit → accept silently, do nothing.
  if (lead.startedAt && Date.now() - lead.startedAt < 3000) return NextResponse.json({ ok: true, market: null });
  if (!(await verifyTurnstile(lead.turnstileToken, ip))) return NextResponse.json({ error: "Verification failed. Please try again." }, { status: 400 });

  // Idempotency: the same eventId (or Idempotency-Key) never creates a second lead.
  const idemKey = `idem:${req.headers.get("idempotency-key") ?? lead.eventId}`;
  const fresh = await kvSetNx(idemKey, { pending: true }, 60 * 60 * 24);
  if (!fresh) {
    const prior = await kvGet<Record<string, unknown>>(`${idemKey}:result`);
    return NextResponse.json({ ok: true, duplicate: true, ...(prior ?? {}) });
  }

  const photoKeys = lead.photoKeys.filter((k) => validKeyForEvent(k, lead.eventId));
  const q = lead.variant === "commercial" ? undefined : sanitizeQualifiers(estimateConfig, lead.qualifiers);
  const leadClean = { ...lead, photoKeys, qualifiers: q };
  const routing = routeLead(leadClean, await zipOverrides());
  const scoring = (await kvGet<ScoringConfig>("cfg:scoring")) ?? defaultScoring;
  const score = scoreLead(leadClean, routing, scoring);
  const qPts = qualifierScore(estimateConfig, q);
  if (qPts) {
    score.score += qPts;
    score.reasons.push(`${qPts > 0 ? "+" : ""}${qPts} budget/visit answers (${q ? budgetFit(estimateConfig, q).fit : "n/a"})`);
    score.tier = score.score >= scoring.hot ? "hot" : score.score >= scoring.warm ? "warm" : "cold";
  }
  const base = `${req.nextUrl.protocol}//${req.headers.get("host")}`;
  const photoUrls = await readUrls(photoKeys, base);
  const gaClientId = gaClientIdFromCookie(req.headers.get("cookie") ?? undefined);
  const adConsent = body.adConsent !== false;

  const [ghl, owner, reply, meta, openai] = await Promise.allSettled([
    pushLeadToGhl(leadClean, routing, score, photoUrls, { gaClientId }),
    notifyOwner(leadClean, routing, score, photoUrls),
    autoReply(leadClean, routing),
    sendMeta({
      name: "Lead", ga4Name: "generate_lead", eventId: lead.eventId, market: routing.marketId, url: `${base}${lead.sourcePage ?? "/"}`,
      user: { email: lead.email, phone: lead.phone, firstName: lead.firstName, lastName: lead.lastName, zip: lead.zip, city: routing.city ?? undefined, state: routing.market?.state, externalId: externalContactId(lead.email, lead.phone) },
      client: { ip, userAgent: req.headers.get("user-agent") ?? undefined, fbc: lead.attribution.fbc, fbp: lead.attribution.fbp, gaClientId },
      params: { lead_tier: score.tier, form_variant: lead.variant, customer_type: lead.customerType, region: regionTag(routing.marketId).slice(7), county: routing.county ?? undefined },
      consent: { ad_storage: adConsent, analytics_storage: true },
    }),
    // OpenAI Ads Conversions API. id = the pixel's event_id → one conversion. Skipped without ad consent.
    adConsent
      ? sendOpenAiEvent({
          id: lead.eventId, type: "lead_created", actionSource: "web", sourceUrl: `${base}${lead.sourcePage ?? "/"}`,
          oppref: lead.attribution.openai_oppref,
          user: { email: lead.email, phone: lead.phone, firstName: lead.firstName, lastName: lead.lastName, externalId: externalContactId(lead.email, lead.phone), obref: lead.attribution.openai_obref, city: routing.city ?? undefined, region: routing.market?.state, postalCode: lead.zip, country: "US", ip, userAgent: req.headers.get("user-agent") ?? undefined },
        })
      : Promise.resolve({ sent: false, skipped: "no ad consent" }),
  ]);

  const record = {
    id: lead.eventId, at: new Date().toISOString(), variant: lead.variant, customerType: lead.customerType,
    market: routing.marketId, zone: routing.zoneName, city: routing.city, county: routing.county, pipeline: routing.pipeline,
    score: score.score, tier: score.tier, photos: photoKeys.length, source: lead.attribution.utm_source ?? (lead.attribution.gclid ? "google" : lead.attribution.fbclid ? "meta" : "direct"),
    medium: lead.attribution.utm_medium, campaign: lead.attribution.utm_campaign, sourcePage: lead.sourcePage,
    segment: lead.variant === "commercial" ? lead.segment : undefined, gaClientId,
    surfaces: lead.variant === "commercial" ? lead.surfaceTypes : (lead.surfaces as string[]),
    ghl: ghl.status === "fulfilled" ? { mode: ghl.value.mode, contactId: ghl.value.contactId, error: ghl.value.error } : { error: String(ghl.reason) },
    email: owner.status === "fulfilled" ? owner.value : { error: String(owner.reason) },
    reply: reply.status === "fulfilled" ? reply.value : { error: String(reply.reason) },
    capi: meta.status === "fulfilled" ? { sent: meta.value.sent } : { error: String(meta.reason) },
    openai: openai.status === "fulfilled" ? { sent: openai.value.sent, skipped: openai.value.skipped } : { error: String(openai.reason) },
    budget: q?.budget, budgetFit: q ? budgetFit(estimateConfig, q).fit : undefined, visit: q?.preferred_date,
  };
  await listPush("leads", record);
  // Phase 4: full first-party record for the ops console / outbox (server-only KV; never returned publicly).
  await kv.set(`lead:data:${lead.eventId}`, JSON.stringify({ leadId: lead.eventId, receivedAt: record.at, lead: leadClean, routing: { market: routing.marketId, county: routing.county, pipeline: routing.pipeline, zone: routing.zoneId }, score, ghl: record.ghl }));
  await kv.lpush("leads:index", lead.eventId);
  if (record.ghl.error) await enqueue("ghl.lead", lead.eventId, `ghl.lead:${lead.eventId}`, { source: "lead-route", error: record.ghl.error }).catch(() => undefined);
  // Revenue attribution: remember first/last touch for this contact so a later won/paid CRM stage
  // can be credited to the right source (kept 400 days; first lead wins for first-touch).
  const attrKey = `attr:${externalContactId(lead.email, lead.phone)}`;
  const snap = attributionSnapshot(lead.attribution as Record<string, string | undefined>, lead.eventId, routing.marketId);
  const prevSnap = await kvGet<ReturnType<typeof attributionSnapshot>>(attrKey);
  await kvSet(attrKey, prevSnap ? { ...snap, first: prevSnap.first, leadEventId: prevSnap.leadEventId } : snap, 60 * 60 * 24 * 400);

  // Delivery guarantee: if neither CRM nor email succeeded, queue for manual retry and alert via log.
  const ghlOk = ghl.status === "fulfilled" && (ghl.value.mode === "dry-run" || !ghl.value.error);
  const emailOk = owner.status === "fulfilled" && owner.value.sent;
  if (!ghlOk && !emailOk) { await listPush("lead_dead_letter", { record, lead: leadClean }); console.error("LEAD DELIVERY FAILED", lead.eventId); }

  // Public response allowlist (Phase 4): market, county, tier, status. Never prices, scores or internal notes.
  const result = { market: routing.marketId, county: routing.county, tier: score.tier, marketStatus: routing.marketStatus };
  await kvSet(`${idemKey}:result`, result, 60 * 60 * 24);
  return NextResponse.json({ ok: true, ...result });
}
