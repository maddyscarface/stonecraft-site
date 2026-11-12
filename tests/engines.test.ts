import { describe, expect, it } from "vitest";
import { markets } from "@/config/markets";
import { draftPriceSheets } from "@/config/pricing";
import { availableSlots, checkBooking, detectZone, effectiveZone, nextDateFor, suggestSlots, weekdayOf, localParts } from "@/lib/scheduling/engine";
import type { Appointment } from "@/lib/scheduling/types";
import { buildQuote, customerView, splitCost } from "@/lib/pricing/engine";
import { generateBrief, briefToText } from "@/lib/workorder/engine";
import { parseLead } from "@/lib/leads/schema";
import { scoreLead } from "@/lib/leads/scoring";
import { routeLead, marketForZip } from "@/lib/leads/routing";
import { externalContactId, opportunityKey, entryStage } from "@/lib/crm/sync";
import { buildContactPayload } from "@/lib/crm/ghl";
import { metaPayload } from "@/lib/tracking/server";

const boston = markets.find((m) => m.id === "boston")!;
const fl = markets.find((m) => m.id === "south-florida")!;
const bosSheet = draftPriceSheets.find((s) => s.marketId === "boston")!;

describe("scheduling", () => {
  it("detects zones by ZIP, town and neighbourhood", () => {
    expect(detectZone({ zip: "02139" }, boston.zones)?.id).toBe("bos-inner");
    expect(detectZone({ zip: "02459" }, boston.zones)?.id).toBe("bos-west");
    expect(detectZone({ town: "Somerville" }, boston.zones)?.id).toBe("bos-north");
    expect(detectZone({ town: "Harvard Square" }, boston.zones)?.id).toBe("bos-inner");
    expect(detectZone({ zip: "33480" }, fl.zones)?.id).toBe("fl-pb-north");
    expect(detectZone({ zip: "33301" }, fl.zones)?.id).toBe("fl-broward");
  });
  it("does not route to inactive zones (Worcester) unless asked", () => {
    expect(detectZone({ zip: "01608" }, boston.zones)).toBeNull();
    expect(detectZone({ zip: "01608" }, boston.zones, { includeInactive: true })?.id).toBe("bos-worcester");
  });
  it("computes weekdays and next dates", () => {
    expect(weekdayOf("2026-11-02")).toBe("monday");
    expect(nextDateFor("monday", "2026-11-02", true)).toBe("2026-11-02");
    expect(nextDateFor("monday", "2026-11-02")).toBe("2026-11-09");
    expect(nextDateFor("thursday", "2026-11-02")).toBe("2026-11-05");
  });
  it("converts to market local time", () => {
    expect(localParts(new Date("2026-11-02T15:30:00Z"), "America/New_York")).toEqual({ date: "2026-11-02", time: "10:30" });
  });
  it("holds flex slots until release time, then opens them", () => {
    const zone = boston.zones[0];
    const early = availableSlots({ zone, date: "2026-11-09", appointments: [], now: { date: "2026-11-02", time: "09:00" } });
    expect(early.map((s) => s.time)).toEqual(["10:00", "11:30", "13:00", "14:30"]);
    expect(early.find((s) => s.time === "14:30")).toMatchObject({ isFlex: true, openToGeneral: false, flexReleaseAt: "2026-11-08 14:30" });
    const late = availableSlots({ zone, date: "2026-11-09", appointments: [], now: { date: "2026-11-08", time: "15:00" } });
    expect(late.find((s) => s.time === "14:30")?.openToGeneral).toBe(true);
  });
  it("removes booked and past slots", () => {
    const zone = boston.zones[0];
    const appts: Appointment[] = [{ id: "a", type: "estimate", zoneId: zone.id, date: "2026-11-09", start: "10:00", durationMin: 45, assignedTo: "bdr1", status: "confirmed" }];
    const s = availableSlots({ zone, date: "2026-11-09", appointments: appts, now: { date: "2026-11-09", time: "12:00" } });
    expect(s.map((x) => x.time)).toEqual(["13:00", "14:30"]);
  });
  it("applies Florida peak-season mode (Nov–Apr)", () => {
    const z = effectiveZone(fl.zones[0], 12);
    expect(z.mode).toBe("peak");
    expect(z.flexSlotCount).toBe(2);
    expect(z.slotTimes).toHaveLength(5);
    expect(effectiveZone(fl.zones[0], 7).mode).toBe("standard");
  });
  it("suggests zone-first slots, hides flex from non-priority, flags priority", () => {
    const now = { date: "2026-11-03", time: "08:00" };
    const normal = suggestSlots({ lead: { zip: "02139" }, zones: boston.zones, appointments: [], now });
    expect(normal.detected).toBe(true);
    if (normal.detected) {
      expect(normal.primary.day).toBe("monday");
      expect(normal.primary.slots.some((s) => s.isFlex)).toBe(false);
      expect(normal.isPriority).toBe(false);
      expect(normal.bdrScript).toContain("Monday");
    }
    const vip = suggestSlots({ lead: { zip: "02139", customerType: "commercial" }, zones: boston.zones, appointments: [], now });
    if (vip.detected) {
      expect(vip.isPriority).toBe(true);
      expect(vip.primary.slots.some((s) => s.isFlex)).toBe(true);
      expect(vip.notifyOwner).toBe(true);
    }
    const none = suggestSlots({ lead: { zip: "90210" }, zones: boston.zones, appointments: [], now });
    expect(none.detected).toBe(false);
  });
  it("hard-blocks overlaps and blocks off-day estimates unless priority", () => {
    const zone = boston.zones[0];
    const appts: Appointment[] = [{ id: "a", type: "estimate", zoneId: zone.id, date: "2026-11-09", start: "10:00", durationMin: 45, assignedTo: "bdr1", status: "confirmed" }];
    expect(checkBooking({ candidate: { type: "estimate", zoneId: zone.id, date: "2026-11-09", start: "10:30", durationMin: 45, assignedTo: "bdr1" }, appointments: appts, zone, isPriority: false }).ok).toBe(false);
    const wed = checkBooking({ candidate: { type: "estimate", zoneId: zone.id, date: "2026-11-11", start: "10:00", durationMin: 45, assignedTo: "bdr1" }, appointments: appts, zone, isPriority: false });
    expect(wed.ok).toBe(false);
    const wedP = checkBooking({ candidate: { type: "estimate", zoneId: zone.id, date: "2026-11-11", start: "10:00", durationMin: 45, assignedTo: "bdr1" }, appointments: appts, zone, isPriority: true });
    expect(wedP.ok).toBe(true);
    const gap = checkBooking({ candidate: { type: "estimate", zoneId: zone.id, date: "2026-11-09", start: "14:30", durationMin: 45, assignedTo: "bdr1" }, appointments: appts, zone, isPriority: false });
    expect(gap.ok && gap.warnings.some((w) => w.includes("Gap"))).toBe(true);
  });
});

describe("pricing", () => {
  it("builds an estimate with min charges, modifiers and deposits", () => {
    const q = buildQuote({ sheet: bosSheet, zip: "02116", lines: [{ service: "shower_restoration", quantity: 1 }, { service: "caulk", quantity: 10 }] });
    expect(q.kind).toBe("estimate");
    if (q.kind !== "estimate") return;
    expect(q.lines[1].minApplied).toBe(true); // 10 ft × $10 < $200 min
    expect(q.subtotal).toBe(1400);
    expect(q.modifiers[0].pct).toBe(10);
    expect(q.total).toBe(1540);
    expect(q.deposit).toMatchObject({ pct: 25, required: true, amount: 385 });
    expect(q.customerReady).toBe(false); // draft sheet
    expect(q.internal.grossMargin).toBeLessThan(q.total);
  });
  it("routes commercial to custom quote", () => {
    expect(buildQuote({ sheet: bosSheet, customerType: "commercial", lines: [{ service: "grout_cleaning", quantity: 1000 }] }).kind).toBe("custom");
  });
  it("applies volume discount and project minimum", () => {
    const big = buildQuote({ sheet: bosSheet, lines: [{ service: "grout_cleaning", quantity: 600 }] });
    if (big.kind === "estimate") expect(big.modifiers.some((m) => m.pct === -10)).toBe(true);
  });
  it("customerView strips internal economics", () => {
    const q = buildQuote({ sheet: { ...bosSheet, approved: true }, lines: [{ service: "shower_restoration", quantity: 1 }] });
    const v = JSON.stringify(customerView(q));
    expect(v).not.toContain("internal");
    expect(v).not.toContain("techPay");
  });
  it("splits roommate costs to the cent", () => {
    const s = splitCost(1500, 4);
    expect(s.perPerson).toBe(375);
    const t = splitCost(1000, 3);
    expect(t.shares.reduce((a, b) => a + b, 0)).toBeCloseTo(1000, 5);
    expect(splitCost(1500, 0).people).toBe(1);
  });
});

describe("work orders", () => {
  it("generates a brief with condition modifiers and no pricing", () => {
    const b = generateBrief({ jobId: "J1", services: ["shower_restoration", "grout_color_seal"], scopeNotes: "Heavy soap scum, marble threshold, mildew in caulk", areaSqft: 85, groutColor: "Warm Grey", priceTotal: 2400, margin: 900, techPay: 400 });
    const txt = briefToText(b) + JSON.stringify(b);
    expect(b.conditions).toEqual(expect.arrayContaining(["Heavy soap scum", "Natural stone present", "Mould / mildew present"]));
    expect(txt).not.toMatch(/2400|900|priceTotal|margin|techPay/);
    expect(b.fieldReady).toBe(false); // library not validated + hazard review
    expect(b.materials.some((m) => m.qty?.includes("98 sq ft"))).toBe(true);
    expect(b.qualificationGaps.length).toBe(1);
  });
  it("blocks colour sealing on epoxy grout", () => {
    const b = generateBrief({ jobId: "J2", services: ["grout_color_seal"], groutType: "epoxy" }, { libraryValidated: true });
    expect(b.blocksProceeding).toBe(true);
    expect(b.fieldReady).toBe(false);
  });
});

const baseLead = { firstName: "Ana", email: "ANA@Example.com ", phone: "(617) 555-0101", zip: "02139", contactConsent: true, eventId: "evt_12345678", attribution: { utm_source: "meta", gclid: "abc" } };

describe("leads", () => {
  it("validates and strips landlord details without consent", () => {
    const r = parseLead({ ...baseLead, variant: "renter", roommates: 3, approvalAcknowledged: true, landlordOutreachConsent: false, landlordName: "Bob", landlordContact: "bob@x.com" });
    expect(r.success).toBe(true);
    if (r.success && r.data.variant === "renter") { expect(r.data.landlordName).toBeUndefined(); expect(r.data.email).toBe("ana@example.com"); }
  });
  it("requires contact consent and commercial fields", () => {
    expect(parseLead({ ...baseLead, contactConsent: false, variant: "residential" }).success).toBe(false);
    expect(parseLead({ ...baseLead, variant: "commercial", segment: "hospitals" }).success).toBe(false);
  });
  it("rejects honeypot", () => {
    expect(parseLead({ ...baseLead, variant: "residential", website: "spam" }).success).toBe(false);
  });
  it("routes and scores", () => {
    const r = parseLead({ ...baseLead, variant: "commercial", segment: "hospitals", organization: "Example Health", jobTitle: "Facilities Director", buildings: 3, budget: "25to75k", decisionRole: "decision_maker", timeline: "90d" });
    expect(r.success).toBe(true);
    if (!r.success) return;
    const route = routeLead(r.data);
    expect(route).toMatchObject({ marketId: "boston", zoneId: "bos-inner", pipeline: "commercial", inActiveZone: true });
    const s = scoreLead(r.data, route);
    expect(s.tier).toBe("hot");
    const fl = parseLead({ ...baseLead, zip: "33432", variant: "residential" });
    if (fl.success) expect(routeLead(fl.data)).toMatchObject({ marketId: "south-florida", marketStatus: "pre-launch" });
  });
  it("maps market by ZIP range fallback", () => {
    expect(marketForZip("02720")?.id).toBe("boston");
    expect(marketForZip("33139")?.id).toBe("south-florida");
    expect(marketForZip("10001")).toBeNull();
  });
});

describe("crm + tracking", () => {
  it("dedupe keys are stable across formatting", () => {
    expect(externalContactId("A@b.com ", "")).toBe(externalContactId("a@b.com"));
    expect(opportunityKey("x", "residential")).toBe("x:residential");
    expect(entryStage("residential", true)).toBe("Photos received");
  });
  it("builds GHL payload with attribution custom fields", () => {
    const r = parseLead({ ...baseLead, variant: "residential", photoKeys: ["p/1.jpg"] });
    if (!r.success) throw new Error("parse");
    const route = routeLead(r.data);
    const p = buildContactPayload(r.data, route, scoreLead(r.data, route), ["https://x/1.jpg"]);
    expect(p.phone).toBe("+16175550101");
    expect(p.customFields.find((c) => c.key === "sc_gclid")?.field_value).toBe("abc");
    expect(p.tags).toContain("market:boston");
  });
  it("hashes PII for Meta CAPI", () => {
    const p = metaPayload({ name: "Lead", ga4Name: "generate_lead", eventId: "e1", user: { email: "A@B.com", phone: "6175550101" }, consent: { ad_storage: true, analytics_storage: true } });
    const ud = p.data[0].user_data;
    expect(ud.em?.[0]).toHaveLength(64);
    expect(JSON.stringify(p)).not.toContain("A@B.com");
    expect(p.data[0].event_id).toBe("e1");
  });
});
