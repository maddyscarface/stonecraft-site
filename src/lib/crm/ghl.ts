/**
 * GoHighLevel (LeadConnector API v2) adapter.
 * Env (per market — see .env.example):
 *   GHL_PRIVATE_TOKEN (Private Integration token, location scope)
 *   GHL_LOCATION_ID_BOSTON / GHL_LOCATION_ID_FL
 *   GHL_<MARKET>_PIPELINE_RESIDENTIAL / _COMMERCIAL                      (pipeline ids)
 *   GHL_<MARKET>_STAGE_<RES|COM>_<SLUG>  (stage ids, e.g. GHL_BOSTON_STAGE_RES_PHOTOS_RECEIVED, GHL_FL_STAGE_COM_INBOUND_OUTREACH)
 *   GHL_<MARKET>_TEAM_USER_ID, GHL_<MARKET>_CALENDAR_RESIDENTIAL / _COMMERCIAL  (team owner + calendars per geography)
 * Without a token, the adapter runs in dry-run mode and returns the payloads it would send.
 *
 * VERIFY against current GHL API docs before go-live: custom-field keys vs ids, and that
 * the Private Integration has contacts.write, opportunities.write and notes scopes.
 */
import { qualifierFields, type Qualifiers } from "@/lib/estimate/qualifiers";
import { estimateConfig } from "@/config/estimate";
import type { LeadInput } from "@/lib/leads/schema";
import type { Routing } from "@/lib/leads/routing";
import type { Score } from "@/lib/leads/scoring";
import { entryStage, externalContactId, ghlPipeline, normPhone, PIPELINES } from "./sync";
import { teamFor } from "@/config/crm";
import { followUpPlan, type FollowUpStep } from "./followup";
import { BRAND_TAG, scoreBand } from "@/config/crm";

const API = "https://services.leadconnectorhq.com";
const VERSION = "2021-07-28";

const envKey = (s: string) => s.toUpperCase().replace(/[^A-Z0-9]+/g, "_");

export function ghlConfig(routing: Routing) {
  const token = process.env.GHL_PRIVATE_TOKEN;
  const prefix = routing.market?.ghl.pipelineEnvPrefix ?? "GHL_BOSTON";
  const locationId = routing.market ? process.env[routing.market.ghl.locationIdEnv] : undefined;
  const pipeline = ghlPipeline(routing.pipeline);
  const pipelineId = process.env[`${prefix}_PIPELINE_${envKey(pipeline)}`];
  const assignedTo = process.env[`${prefix}_TEAM_USER_ID`] || undefined;
  const calendarId = process.env[`${prefix}_CALENDAR_${envKey(pipeline)}`] || undefined;
  return { token, locationId, prefix, pipeline, pipelineId, assignedTo, calendarId, configured: Boolean(token && locationId) };
}

export const stageEnvKey = (prefix: string, pipeline: "residential" | "commercial", stage: string) => `${prefix}_STAGE_${pipeline === "residential" ? "RES" : "COM"}_${envKey(stage)}`;

/** Case-safe summary fields synced on every lead (spec §3): location, material, area, service, budget, score, campaign, status. */
export function summaryFields(lead: LeadInput, routing: Routing, score: Score, status: string) {
  const q = (lead.qualifiers ?? {}) as Record<string, unknown>;
  const service = lead.variant === "commercial" ? [lead.segment, ...lead.surfaceTypes].join(", ") : [...(("surfaces" in lead ? lead.surfaces : []) as string[]), ...(("treatments" in lead ? lead.treatments : []) as string[])].join(", ");
  const material = lead.variant === "commercial" ? lead.materials.join(", ") : ("material" in lead ? lead.material : undefined);
  const area = lead.variant === "commercial" ? (lead.squareFeet ? `${lead.squareFeet} sq ft` : undefined) : ("area" in lead ? lead.area : undefined) ?? (q.size as string | undefined);
  const budget = lead.variant === "commercial" ? lead.budget : (q.budget as string | undefined);
  return {
    sc_location: [routing.city, lead.zip, routing.marketId].filter(Boolean).join(" · "),
    sc_team: teamFor(routing.marketId, routing.zoneId),
    sc_material: material,
    sc_area: area,
    sc_service: service || undefined,
    sc_budget: budget,
    sc_lead_score: score.score,
    sc_campaign: lead.attribution.utm_campaign ?? lead.attribution.last_touch_campaign,
    sc_status: status,
  };
}

export function buildContactPayload(lead: LeadInput, routing: Routing, score: Score, photoUrls: string[], extra: { gaClientId?: string } = {}) {
  const cf: Record<string, string | number | boolean | undefined> = {
    ...summaryFields(lead, routing, score, entryStage(routing.pipeline, lead.photoKeys.length > 0)),
    sc_external_id: externalContactId(lead.email, lead.phone),
    sc_market: routing.marketId ?? "unknown",
    sc_zone: routing.zoneName ?? "",
    sc_county: routing.county ?? "",
    sc_customer_type: lead.customerType,
    sc_lead_score: score.score,
    sc_lead_tier: score.tier,
    sc_source_page: lead.sourcePage,
    sc_photo_count: lead.photoKeys.length,
    sc_photo_links: photoUrls.join("\n"),
    sc_utm_source: lead.attribution.utm_source,
    sc_utm_medium: lead.attribution.utm_medium,
    sc_utm_campaign: lead.attribution.utm_campaign,
    sc_gclid: lead.attribution.gclid ?? lead.attribution.gbraid ?? lead.attribution.wbraid,
    sc_fbclid: lead.attribution.fbclid,
    sc_fbc: lead.attribution.fbc,
    sc_fbp: lead.attribution.fbp,
    sc_landing_page: lead.attribution.landing_page,
    sc_sms_consent: lead.smsConsent,
    sc_event_id: lead.eventId,
    sc_ga_client_id: extra.gaClientId,
  };
  if (lead.variant === "renter") Object.assign(cf, {
    sc_roommates: lead.roommates, sc_landlord_approval: lead.landlordApprovalStatus,
    sc_landlord_outreach_consent: lead.landlordOutreachConsent,
    sc_landlord_name: lead.landlordName, sc_landlord_contact: lead.landlordContact,
    sc_approver_role: lead.approverRole, sc_approval_verified: false, // a renter's statement is never treated as owner approval
  });
  if (lead.variant !== "commercial") Object.assign(cf, {
    sc_dwelling: lead.dwelling, sc_showers: lead.showers, sc_issues: lead.issues.join(", "),
    sc_treatments: lead.treatments.join(", "), sc_finish: lead.finish, sc_address: lead.address,
  });
  if (lead.variant === "landlord") Object.assign(cf, { sc_units: lead.units, sc_is_pm: lead.isPropertyManager, sc_turn_date: lead.turnDate, sc_property_type: lead.propertyType });
  if (lead.variant === "commercial") Object.assign(cf, {
    sc_segment: lead.segment, sc_buildings: lead.buildings, sc_restrooms: lead.restrooms, sc_square_feet: lead.squareFeet,
    sc_surface_types: lead.surfaceTypes.join(", "), sc_access_restrictions: lead.accessRestrictions, sc_work_hours: lead.workHours,
    sc_budget: lead.budget, sc_procurement: lead.procurement, sc_decision_role: lead.decisionRole,
    sc_decision_maker: [lead.decisionMakerName, lead.decisionMakerTitle].filter(Boolean).join(", "), sc_timeline: lead.timeline,
    sc_operational_constraints: lead.operationalConstraints, sc_walkthrough_requested: lead.walkthroughRequested, sc_walkthrough_window: lead.walkthroughWindow,
  });
  if ("surfaces" in lead) cf.sc_surfaces = (lead.surfaces as string[]).join(", ");
  // Pre-estimate answers (already sanitised by the API route) → sc_est_* custom fields.
  for (const [k, v] of Object.entries(qualifierFields(estimateConfig, lead.qualifiers as Qualifiers | undefined))) cf[`sc_${k}`] = v;
  cf.sc_openai_obref = lead.attribution.openai_obref;
  cf.sc_openai_oppref = lead.attribution.openai_oppref;

  return {
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: normPhone(lead.phone),
    postalCode: lead.zip,
    city: routing.city ?? undefined,
    state: routing.market?.state,
    companyName: lead.variant === "commercial" ? lead.organization : lead.variant === "landlord" ? lead.company : undefined,
    source: lead.attribution.utm_source ? `${lead.attribution.utm_source}/${lead.attribution.utm_medium ?? ""}` : "website",
    tags: Array.from(new Set([...routing.tags, BRAND_TAG, `tier:${score.tier}`, `score:${scoreBand(score.score)}`, ...(lead.smsConsent ? [] : ["sms:no-consent"])])),
    customFields: customFieldList(cf),
  };
}

/** Field ids win over keys when GHL_CUSTOM_FIELD_IDS is configured (GHL v2 accepts either). */
export function customFieldList(cf: Record<string, string | number | boolean | undefined>, idMapJson = process.env.GHL_CUSTOM_FIELD_IDS) {
  let ids: Record<string, string> = {};
  try { ids = idMapJson ? (JSON.parse(idMapJson) as Record<string, string>) : {}; } catch { console.warn("[ghl] GHL_CUSTOM_FIELD_IDS is not valid JSON — sending fields by key"); }
  return Object.entries(cf).filter(([, v]) => v !== undefined && v !== "").map(([key, field_value]) => (ids[key] ? { id: ids[key], field_value } : { key, field_value }));
}

export function opportunityName(lead: LeadInput, routing: Routing) {
  const who = lead.variant === "commercial" ? lead.organization : `${lead.firstName} ${lead.lastName ?? ""}`.trim();
  return `${who} — ${routing.city ?? lead.zip} — ${lead.variant}`;
}

/** GHL call with bounded retry on 429/5xx (exponential backoff, max 3 attempts). */
async function call(path: string, method: string, token: string, body?: unknown, attempt = 1): Promise<any> {
  const res = await fetch(`${API}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, Version: VERSION, "Content-Type": "application/json", Accept: "application/json" },
    body: body ? JSON.stringify(body) : undefined, cache: "no-store",
  });
  const text = await res.text();
  if ((res.status === 429 || res.status >= 500) && attempt < 3) {
    await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
    return call(path, method, token, body, attempt + 1);
  }
  if (!res.ok) throw new Error(`GHL ${method} ${path} ${res.status}: ${text.slice(0, 300)}`);
  return text ? JSON.parse(text) : {};
}

export type GhlResult = { mode: "live" | "dry-run"; contactId?: string; opportunityId?: string; followUps?: { hook: string; enrolled: boolean; reason?: string }[]; payloads?: unknown; error?: string };

export async function pushLeadToGhl(lead: LeadInput, routing: Routing, score: Score, photoUrls: string[], extra: { gaClientId?: string } = {}): Promise<GhlResult> {
  const cfg = ghlConfig(routing);
  const contact = { ...buildContactPayload(lead, routing, score, photoUrls, extra), locationId: cfg.locationId };
  const stageName = entryStage(routing.pipeline, lead.photoKeys.length > 0);
  const stageEnv = stageEnvKey(cfg.prefix, cfg.pipeline, stageName);
  const note = [
    `Web lead via ${lead.sourcePage ?? "site"} (${lead.variant}).`,
    `Score ${score.score} (${score.tier}): ${score.reasons.join("; ")}`,
    lead.message ? `Message: ${lead.message}` : "",
    photoUrls.length ? `Photos:\n${photoUrls.join("\n")}` : "No photos yet — send photo request.",
    routing.marketStatus === "pre-launch" ? "MARKET PRE-LAUNCH: do not book until availability confirmed." : "",
  ].filter(Boolean).join("\n\n");

  const plan: FollowUpStep[] = followUpPlan(lead as LeadInput & { isPropertyManager?: boolean }, routing, score);

  if (!cfg.configured) {
    const payloads = { contact, opportunity: { track: routing.pipeline, pipeline: cfg.pipeline, pipelineEnv: `${cfg.prefix}_PIPELINE_${envKey(cfg.pipeline)}`, team: teamFor(routing.marketId, routing.zoneId), assignedToEnv: `${cfg.prefix}_TEAM_USER_ID`, stage: stageName, stageEnv }, note, followUps: plan };
    if (process.env.GHL_LOG_DRY_RUN !== "false") console.info("[ghl:dry-run]", JSON.stringify({ event: lead.eventId, market: routing.marketId, pipeline: cfg.pipeline, team: teamFor(routing.marketId, routing.zoneId), stage: stageName, tier: score.tier, score: score.score, hooks: plan.map((p) => p.hook) }));
    return { mode: "dry-run", payloads, followUps: plan.map((p) => ({ hook: p.hook, enrolled: false, reason: "dry-run" })) };
  }

  try {
    const up = await call("/contacts/upsert", "POST", cfg.token!, contact);
    const contactId: string = up?.contact?.id ?? up?.id;
    await call(`/contacts/${contactId}/notes`, "POST", cfg.token!, { body: note });
    let opportunityId: string | undefined;
    const stageId = process.env[stageEnv];
    if (cfg.pipelineId && stageId) {
      const opp = await call("/opportunities/upsert", "POST", cfg.token!, {
        locationId: cfg.locationId, pipelineId: cfg.pipelineId, pipelineStageId: stageId, contactId,
        name: opportunityName(lead, routing), status: "open", ...(cfg.assignedTo ? { assignedTo: cfg.assignedTo } : {}),
      });
      opportunityId = opp?.opportunity?.id ?? opp?.id;
    }
    // Follow-up automation: enrol in each configured workflow. GHL ignores re-enrolment of an
    // active contact, so retries are duplicate-safe.
    const followUps = await Promise.all(plan.map(async (p) => {
      if (!p.workflowId) return { hook: p.hook, enrolled: false, reason: `${p.workflowEnv} not set` };
      try { await call(`/contacts/${contactId}/workflow/${p.workflowId}`, "POST", cfg.token!, {}); return { hook: p.hook, enrolled: true }; }
      catch (e) { return { hook: p.hook, enrolled: false, reason: (e as Error).message.slice(0, 120) }; }
    }));
    return { mode: "live", contactId, opportunityId, followUps };
  } catch (e) {
    return { mode: "live", error: (e as Error).message };
  }
}

export const pipelineStages = PIPELINES;

/** Intent-data contact upsert (tags only, no opportunity, no workflows). Dry-run without a token. */
export async function upsertIntentContact(s: { email?: string; phone?: string; firstName?: string; lastName?: string; company?: string; zip?: string; state?: string }, tags: string[], opts: { source?: string } = {}): Promise<GhlResult> {
  const token = process.env.GHL_PRIVATE_TOKEN;
  const locationId = s.state === "FL" ? process.env.GHL_LOCATION_ID_FL : process.env.GHL_LOCATION_ID_BOSTON;
  const contact = { locationId, email: s.email, phone: s.phone ? normPhone(s.phone) : undefined, firstName: s.firstName, lastName: s.lastName, companyName: s.company, postalCode: s.zip, source: opts.source ?? "intent-data", tags };
  if (!token || !locationId) return { mode: "dry-run", payloads: { contact } };
  try { const up = await call("/contacts/upsert", "POST", token, contact); return { mode: "live", contactId: up?.contact?.id ?? up?.id }; }
  catch (e) { return { mode: "live", error: (e as Error).message }; }
}
