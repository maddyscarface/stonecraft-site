/**
 * CRM → conversion webhook. Configure a GoHighLevel workflow ("Opportunity stage changed" → Webhook)
 * to POST here with header `x-sc-webhook-secret: $CRM_WEBHOOK_SECRET`.
 * Sends qualified_lead / appointment_booked / job_won / purchase to Meta CAPI + GA4 MP,
 * and logs Google Ads offline conversions (gclid) for CSV import or API upload.
 */
import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { STAGE_EVENTS, externalContactId } from "@/lib/crm/sync";
import { sendGa4, sendMeta } from "@/lib/tracking/server";
import { kvGet, kvSetNx, listPush } from "@/lib/store";
import { uploadOfflineConversion } from "@/lib/tracking/google-ads";
import type { AttributionSnapshot, RevenueRecord } from "@/lib/attribution/revenue";
import { openAiStageEvent, sendOpenAiEvent } from "@/lib/openai-ads/server";

export const runtime = "nodejs";

const Body = z.object({
  stage: z.string(),
  market: z.string().optional(),
  value: z.coerce.number().optional(),
  contactId: z.string().optional(),
  opportunityId: z.string().optional(),
  email: z.string().optional(), phone: z.string().optional(), firstName: z.string().optional(), lastName: z.string().optional(), zip: z.string().optional(),
  gclid: z.string().optional(), fbc: z.string().optional(), fbp: z.string().optional(), gaClientId: z.string().optional(),
  openaiObref: z.string().optional(), openaiOppref: z.string().optional(),
  occurredAt: z.string().optional(),
}).passthrough();

const norm = (s: string) => s.toLowerCase().replace(/[^a-z]+/g, "_").replace(/^_|_$/g, "");

export async function POST(req: NextRequest) {
  const secret = process.env.CRM_WEBHOOK_SECRET ?? "";
  const got = req.headers.get("x-sc-webhook-secret") ?? "";
  if (!secret || got.length !== secret.length || !timingSafeEqual(Buffer.from(got), Buffer.from(secret))) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const p = Body.safeParse(await req.json().catch(() => null));
  if (!p.success) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const b = p.data;
  const stage = norm(b.stage);
  const map = STAGE_EVENTS[stage] ?? STAGE_EVENTS[Object.keys(STAGE_EVENTS).find((k) => stage.includes(k)) ?? ""];
  if (!map) return NextResponse.json({ ok: true, ignored: stage });

  const subject = b.opportunityId ?? b.contactId ?? externalContactId(b.email, b.phone);
  const eventId = `crm_${subject}_${map.ga4}`;
  if (!(await kvSetNx(`crmevt:${eventId}`, 1, 60 * 60 * 24 * 120))) return NextResponse.json({ ok: true, duplicate: true });
  const time = b.occurredAt ? Math.floor(Date.parse(b.occurredAt) / 1000) : Math.floor(Date.now() / 1000);
  const user = { email: b.email, phone: b.phone, firstName: b.firstName, lastName: b.lastName, zip: b.zip, externalId: externalContactId(b.email, b.phone) };
  const consent = { ad_storage: true, analytics_storage: true }; // consent recorded at lead time; CRM should not send opted-out contacts (tag filter)

  const oa = openAiStageEvent(stage);
  const ageOk = Date.now() - time * 1000 < 7 * 864e5; // OpenAI accepts events up to 7 days old
  const [meta, ga4, openai] = await Promise.all([
    map.meta ? sendMeta({ name: map.meta, ga4Name: map.ga4, eventId, market: b.market, value: b.value, user, client: { fbc: b.fbc, fbp: b.fbp }, consent, time }) : Promise.resolve({ sent: false, reason: "no meta mapping" }),
    sendGa4({ name: map.meta ?? map.ga4, ga4Name: map.ga4, eventId, market: b.market, value: b.value, user, client: { gaClientId: b.gaClientId }, consent, time }),
    oa && ageOk
      ? sendOpenAiEvent({
          id: eventId, type: oa.type, customEventName: oa.customEventName, actionSource: "offline", timestampMs: time * 1000,
          value: b.value, oppref: b.openaiOppref, properties: oa.type === "custom" ? { stage, market: b.market ?? null } : undefined,
          user: { email: b.email, phone: b.phone, firstName: b.firstName, lastName: b.lastName, postalCode: b.zip, externalId: user.externalId, obref: b.openaiObref, country: "US" },
        })
      : Promise.resolve({ sent: false, skipped: oa ? "older than 7 days" : "no mapping" }),
  ]);
  const at = new Date(time * 1000).toISOString();
  const attribution = await kvGet<AttributionSnapshot>(`attr:${user.externalId}`);
  const gclid = b.gclid ?? attribution?.clickIds.gclid;
  let googleAds: { sent: boolean; reason?: string; status?: number } = { sent: false, reason: "no mapping or click id" };
  if (map.googleAds && (gclid || attribution?.clickIds.gbraid || attribution?.clickIds.wbraid)) {
    const conv = { gclid, gbraid: attribution?.clickIds.gbraid, wbraid: attribution?.clickIds.wbraid, conversion: map.googleAds, time: at, value: b.value ?? 0, orderId: eventId };
    googleAds = await uploadOfflineConversion(conv);
    if (!googleAds.sent && gclid) await listPush("gads_offline", { gclid, conversion: map.googleAds, time: at, value: b.value ?? 0, market: b.market });
  }
  await listPush("conversions", { eventId, stage, event: map.ga4, market: b.market, value: b.value ?? 0, at, source: attribution?.last.source, firstSource: attribution?.first.source });
  if ((b.value ?? 0) > 0 && /won|purchase|paid/.test(map.ga4)) {
    const rev: RevenueRecord = { eventId, stage, value: b.value!, currency: "USD", market: b.market, at, attribution };
    await listPush("revenue", rev);
  }
  return NextResponse.json({ ok: true, eventId, meta, ga4, openai, googleAds, attributed: Boolean(attribution) });
}
