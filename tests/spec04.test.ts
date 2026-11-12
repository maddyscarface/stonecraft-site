/** Build 04 (StoneCraft) spec compliance: §2 lead capture, §3 GHL stages/teams, §4 events. */
import { describe, expect, it } from "vitest";
import { PIPELINES, entryStage, ghlPipeline, stageEvent, REVENUE_EVENTS } from "@/lib/crm/sync";
import { teamFor } from "@/config/crm";
import { defaultTreatments, surfaceGuidance, TREATMENTS } from "@/config/surfaces";
import { parseLead } from "@/lib/leads/schema";
import { routeLead } from "@/lib/leads/routing";
import { scoreLead } from "@/lib/leads/scoring";
import { buildContactPayload, stageEnvKey } from "@/lib/crm/ghl";
import { FUNNEL_EVENTS } from "@/lib/tracking/client";

const base = { firstName: "Ana", email: "ana@example.com", phone: "617-555-0101", zip: "02139", contactConsent: true, eventId: "lead_spec04_0001", startedAt: Date.now() - 10_000 };

describe("§3 GHL stages", () => {
  it("residential and commercial stages match the spec exactly", () => {
    expect(PIPELINES.residential).toEqual(["New", "Photos requested", "Photos received", "Qualified", "Estimate visit", "Proposal", "Won", "Lost", "Scheduled", "Completed"]);
    expect(PIPELINES.commercial).toEqual(["Inbound/outreach", "Facility qualified", "Site walkthrough", "Scope", "Bid/proposal", "Awarded", "Scheduled", "Closeout", "Recurring program"]);
  });
  it("routes entry stages and keeps residential/commercial separable", () => {
    expect(entryStage("residential", false)).toBe("New");
    expect(entryStage("commercial", true)).toBe("Inbound/outreach");
    expect(ghlPipeline("property_manager")).toBe("commercial");
    expect(stageEnvKey("GHL_FL", "commercial", "Inbound/outreach")).toBe("GHL_FL_STAGE_COM_INBOUND_OUTREACH");
    expect(stageEnvKey("GHL_BOSTON", "residential", "Scheduled")).not.toBe(stageEnvKey("GHL_BOSTON", "commercial", "Scheduled"));
  });
  it("assigns geography teams", () => {
    expect(teamFor("boston")).toBe("greater-boston");
    expect(teamFor("south-florida")).toBe("palm-beach-broward");
    expect(teamFor(null)).toBe("unassigned");
    const r = parseLead({ ...base, variant: "residential", zip: "33432" });
    if (!r.success) throw new Error("parse");
    expect(routeLead(r.data).tags).toContain("team:palm-beach-broward");
  });
});

describe("§4 events", () => {
  it("defines exactly the spec funnel events", () => {
    expect([...FUNNEL_EVENTS]).toEqual(["assessment_start", "photos_received", "qualified_lead", "commercial_walkthrough_booked", "estimate_sent", "job_won", "completed_revenue"]);
  });
  it("maps CRM stages to events (longest match wins)", () => {
    expect(stageEvent("Photos received")?.ga4).toBe("photos_received");
    expect(stageEvent("Qualified")?.ga4).toBe("qualified_lead");
    expect(stageEvent("Facility qualified")?.ga4).toBe("qualified_lead");
    expect(stageEvent("Site walkthrough")?.ga4).toBe("commercial_walkthrough_booked");
    expect(stageEvent("Proposal")?.ga4).toBe("estimate_sent");
    expect(stageEvent("Bid/proposal")?.ga4).toBe("estimate_sent");
    expect(stageEvent("Won")?.ga4).toBe("job_won");
    expect(stageEvent("Awarded")?.ga4).toBe("job_won");
    expect(stageEvent("Completed")?.ga4).toBe("completed_revenue");
    expect(stageEvent("Closeout")?.ga4).toBe("completed_revenue");
    expect(stageEvent("Lost")).toBeUndefined();
    expect(REVENUE_EVENTS.has("completed_revenue")).toBe(true);
  });
});

describe("§2 lead capture", () => {
  it("keeps the five treatments distinct", () => {
    const ids = TREATMENTS.map((t) => t[0]);
    for (const t of ["cleaning", "color_seal", "regrout", "polish_hone", "topical_finish"]) expect(ids).toContain(t);
  });
  it("never defaults to a glossy topical coating on glazed ceramic", () => {
    expect(defaultTreatments("ceramic", ["discoloured_grout", "soap_film", "etched_dull"])).not.toContain("topical_finish");
    expect(defaultTreatments("ceramic", ["etched_dull"])).not.toContain("polish_hone");
    expect(surfaceGuidance("ceramic", "polished").join(" ")).toMatch(/don't apply glossy coatings/);
    expect(defaultTreatments("marble", ["etched_dull"])).toContain("polish_hone");
  });
  it("captures residential surface details", () => {
    const r = parseLead({ ...base, variant: "residential", dwelling: "condo", material: "porcelain", area: "25to75", showers: 2, issues: ["discoloured_grout"], treatments: ["cleaning", "color_seal"], finish: "match_existing" });
    expect(r.success).toBe(true);
    if (r.success && r.data.variant === "residential") expect(r.data.treatments).toEqual(["cleaning", "color_seal"]);
    expect(parseLead({ ...base, variant: "residential", material: "plastic" }).success).toBe(false);
  });
  it("renters must acknowledge authorised approval; approval is never marked verified", () => {
    expect(parseLead({ ...base, variant: "renter" }).success).toBe(false);
    const r = parseLead({ ...base, variant: "renter", approvalAcknowledged: true, approverRole: "property_manager", landlordApprovalStatus: "approved" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    const route = routeLead(r.data);
    expect(route.tags).toContain("approval:awaiting-authorised-approver");
    const p = buildContactPayload(r.data, route, scoreLead(r.data, route), []);
    expect(p.customFields).toContainEqual({ key: "sc_approval_verified", field_value: false });
  });
  it("captures commercial walkthrough, constraints and materials; flags healthcare site plans", () => {
    const r = parseLead({ ...base, variant: "commercial", segment: "hospitals", organization: "Example Medical", jobTitle: "Facilities Director", materials: ["terrazzo", "porcelain"], walkthroughRequested: true, walkthroughWindow: "Tue after 6pm", operationalConstraints: "ED restrooms cannot close" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    const route = routeLead(r.data);
    expect(route.tags).toEqual(expect.arrayContaining(["commercial:walkthrough-requested", "healthcare:site-plan-required", "pipeline:commercial", "team:greater-boston"]));
    const fields = buildContactPayload(r.data, route, scoreLead(r.data, route), []).customFields.map((f) => ("key" in f ? f.key : f.id));
    for (const k of ["sc_location", "sc_material", "sc_service", "sc_lead_score", "sc_status", "sc_team"]) expect(fields).toContain(k);
  });
});

import { memoryStoreBlockedFor } from "@/lib/store";
describe("§5 production storage guard", () => {
  it("cannot be masked by LEAD_ALLOW_MEMORY_STORE on production", () => {
    expect(memoryStoreBlockedFor({ NODE_ENV: "production", VERCEL_ENV: "production", LEAD_ALLOW_MEMORY_STORE: "1" }, false)).toBe(true);
    expect(memoryStoreBlockedFor({ NODE_ENV: "production", VERCEL_ENV: "production" }, true)).toBe(false);
    expect(memoryStoreBlockedFor({ NODE_ENV: "production", VERCEL_ENV: "preview", LEAD_ALLOW_MEMORY_STORE: "1" }, false)).toBe(false);
    expect(memoryStoreBlockedFor({ NODE_ENV: "production", VERCEL_ENV: "preview" }, false)).toBe(true);
    expect(memoryStoreBlockedFor({ NODE_ENV: "development" }, false)).toBe(false);
  });
});
