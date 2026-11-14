import { beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { __resetMemoryStore, kv } from "@/lib/server/kv";
import { dispatch } from "@/lib/ops/api";
import { normalise, display } from "@/lib/walkthrough/measure";
import { hasJpegExif, minimiseMetadata, sniffMime, typeMatches, validateMediaRequest, MEDIA_LIMITS } from "@/lib/walkthrough/media";
import { escalationsFor, suggestOutcome } from "@/lib/walkthrough/outcome";
import { PUBLIC_VIEW_KEYS, publicView } from "@/lib/walkthrough/view";
import { tokenHash } from "@/lib/walkthrough/store";
import { walkthroughTemplates, workTypes } from "@/config/walkthrough-templates";
import { listJobs } from "@/lib/ops/outbox";

const OWNER = "owner-token-0123456789abcdef";
const H = { host: "localhost:3000", "x-forwarded-for": "203.0.113.50" };
const ops = (path: string, init: RequestInit = {}) => {
  const h = new Headers(init.headers); h.set("authorization", `Bearer ${OWNER}`); h.set("host", "localhost:3000");
  return dispatch(new Request(`http://localhost:3000/api/admin/ops/${path}`, { ...init, headers: h }), path.split("?")[0]!.split("/").filter(Boolean));
};
async function pub(action: string, token: string | null, body?: unknown) {
  const { GET, POST } = await import("@/app/api/walkthrough/[action]/route");
  const { NextRequest } = await import("next/server");
  const headers: Record<string, string> = { ...H, "content-type": "application/json", ...(token ? { "x-walkthrough-token": token } : {}) };
  const req = new NextRequest(`http://localhost:3000/api/walkthrough/${action}`, { method: body === undefined ? "GET" : "POST", headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const res = await (body === undefined ? GET : POST)(req, { params: Promise.resolve({ action }) });
  return { status: res.status, headers: res.headers, j: await res.json() };
}
const tokenFrom = (link: string) => link.split("#t=")[1]!;
// Tiny JPEG: SOI, APP1 Exif (with fake GPS text), DQT stub, SOS, EOI.
const exifJpeg = () => {
  const exif = [...Buffer.from("Exif\0\0GPS 42.35N 71.06W")];
  const app1 = [0xff, 0xe1, 0, exif.length + 2, ...exif];
  const dqt = [0xff, 0xdb, 0, 4, 0, 0];
  const sos = [0xff, 0xda, 0, 4, 0, 0, 1, 2, 3, 4, 5, 6, 7, 8, 0xff, 0xd9];
  return Uint8Array.from([0xff, 0xd8, ...app1, ...dqt, ...sos]);
};

beforeEach(() => { __resetMemoryStore(); process.env.ADMIN_TOKEN = OWNER; process.env.PRIVATE_FILES_DIR = `/tmp/sc-wt-test-${randomUUID()}`; delete process.env.WALKTHROUGH_ENABLED; delete process.env.WALKTHROUGH_SELF_START; delete process.env.VERCEL_ENV; });

describe("templates", () => {
  it("cover shower, floor, stone and commercial with the spec's capture steps and no prices", () => {
    expect(workTypes).toEqual(["shower", "floor", "stone", "commercial"]);
    const ids = (w: keyof typeof walkthroughTemplates) => walkthroughTemplates[w].steps.map((s) => s.id);
    expect(ids("shower")).toEqual(expect.arrayContaining(["pan", "wall", "grout", "caulk"]));
    expect(walkthroughTemplates.shower.steps.find((s) => s.id === "wall")!.repeat).toBeTruthy();
    expect(walkthroughTemplates.floor.steps.find((s) => s.id === "room")!.questions.map((q) => q.id)).toEqual(expect.arrayContaining(["tile_type", "joint_condition"]));
    expect(ids("stone")).toEqual(expect.arrayContaining(["run", "edges", "damage"]));
    expect(ids("commercial")).toEqual(expect.arrayContaining(["area", "closures"]));
    expect(JSON.stringify(walkthroughTemplates)).not.toMatch(/\$\s?\d|\bUSD\b|\bprices?\b|\brates?\b/i);
  });
});

describe("measurements (ft/in + metric, unknown/estimate, separate from price)", () => {
  it("normalises both systems to mm / m² and keeps flags", () => {
    const a = normalise({ fieldId: "w", kind: "length", a: 5, b: 6 }, "imperial");
    expect(a).toMatchObject({ ok: true, m: { mm: 1676 } });
    const b = normalise({ fieldId: "w", kind: "length", a: 1, b: 67.6, uncertain: true }, "metric");
    expect(b).toMatchObject({ ok: true, m: { mm: 1676, uncertain: true } });
    expect(normalise({ fieldId: "x", kind: "area", a: 100 }, "imperial")).toMatchObject({ ok: true, m: { m2: 9.29 } });
    expect(normalise({ fieldId: "x", kind: "length", unknown: true }, "imperial")).toMatchObject({ ok: true, m: { unknown: true } });
    expect(normalise({ fieldId: "x", kind: "length", a: 5, b: 12 }, "imperial").ok).toBe(false);
    expect(normalise({ fieldId: "x", kind: "length", a: -1 }, "metric").ok).toBe(false);
    expect(normalise({ fieldId: "x", kind: "length" }, "metric").ok).toBe(false);
    if (a.ok) { expect(display(a.m, "imperial")).toMatch(/5 ft 6 in/); expect(JSON.stringify(a.m)).not.toMatch(/price|rate|\$/); }
  });
});

describe("media validation", () => {
  it("sniffs magic bytes, rejects disguised files and enforces size/count limits", () => {
    expect(sniffMime(exifJpeg())).toBe("image/jpeg");
    expect(typeMatches("image/jpeg", sniffMime(new TextEncoder().encode("<html><script>alert(1)</script>")))).toBe(false);
    expect(typeMatches("image/heic", "image/heif")).toBe(true);
    expect(validateMediaRequest({ kind: "photo", contentType: "image/svg+xml", size: 10 }, 1e9, { photos: 0, videos: 0 })).toBeTruthy();
    expect(validateMediaRequest({ kind: "photo", contentType: "image/jpeg", size: MEDIA_LIMITS.photoBytes + 1 }, 1e9, { photos: 0, videos: 0 })).toBeTruthy();
    expect(validateMediaRequest({ kind: "video", contentType: "video/mp4", size: 1000 }, 1e9, { photos: 0, videos: MEDIA_LIMITS.videosPerWalkthrough })).toBeTruthy();
    expect(validateMediaRequest({ kind: "photo", contentType: "image/jpeg", size: 1000 }, 1e9, { photos: 0, videos: 0 })).toBeNull();
  });
  it("strips EXIF/GPS from JPEG and flags formats it cannot strip", () => {
    const j = exifJpeg(); expect(hasJpegExif(j)).toBe(true);
    const m = minimiseMetadata("image/jpeg", j);
    expect(m.metadata).toBe("stripped"); expect(hasJpegExif(m.body)).toBe(false);
    expect(Buffer.from(m.body).toString("latin1")).not.toContain("GPS");
    expect(minimiseMetadata("video/mp4", new Uint8Array(20)).metadata).toBe("metadata_retained");
  });
});

describe("invite tokens", () => {
  it("are hashed at rest, shown once, not consumed by reads, expire and can be revoked", async () => {
    const c = await (await ops("walkthroughs", { method: "POST", body: JSON.stringify({ workType: "shower", firstName: "Ana", zip: "33480", email: "ana@example.com" }) })).json();
    expect(c.ok).toBe(true);
    const token = tokenFrom(c.inviteLink);
    expect(token.length).toBeGreaterThanOrEqual(43);
    expect(c.walkthrough.market).toBe("south-florida"); expect(c.walkthrough.county).toBe("palm-beach");
    // raw token never stored
    const dump = JSON.stringify(await Promise.all((await kv.lrange("wt:index", 0, 10)).map((id) => kv.get(`wt:${id}`))));
    expect(dump).not.toContain(token); expect(dump).toContain(tokenHash(token));
    // not consumed on GET
    for (let i = 0; i < 3; i++) expect((await pub("session", token)).status).toBe(200);
    expect((await pub("session", token + "x")).status).toBe(401);
    expect((await pub("session", null)).status).toBe(401);
    // revoke
    expect((await ops(`walkthroughs/${c.walkthrough.id}`, { method: "POST", body: JSON.stringify({ action: "revoke_invite" }) })).status).toBe(200);
    expect((await pub("session", token)).status).toBe(401);
    // reissue gives a new working link; the old one stays dead
    const re = await (await ops(`walkthroughs/${c.walkthrough.id}`, { method: "POST", body: JSON.stringify({ action: "reissue_invite" }) })).json();
    expect((await pub("session", tokenFrom(re.inviteLink))).status).toBe(200);
    expect((await pub("session", token)).status).toBe(401);
  });
  it("expired invites are rejected", async () => {
    const c = await (await ops("walkthroughs", { method: "POST", body: JSON.stringify({ workType: "floor", firstName: "Bo", zip: "02139", expiresDays: 1 }) })).json();
    const id = c.walkthrough.id; const w = JSON.parse((await kv.get(`wt:${id}`))!); w.invite.expiresAt = new Date(Date.now() - 1000).toISOString(); await kv.set(`wt:${id}`, JSON.stringify(w));
    expect((await pub("session", tokenFrom(c.inviteLink))).status).toBe(401);
  });
  it("public responses are noindex, no-store, no-referrer", async () => {
    const r = await pub("session", null);
    expect(r.headers.get("x-robots-tag")).toMatch(/noindex/); expect(r.headers.get("cache-control")).toBe("no-store"); expect(r.headers.get("referrer-policy")).toBe("no-referrer");
  });
});

describe("customer flow: steps, uploads, corrections, resume, submit", () => {
  it("runs end to end with a public allowlist on every response", async () => {
    const c = await (await ops("walkthroughs", { method: "POST", body: JSON.stringify({ workType: "shower", firstName: "Ana", zip: "02139", email: "ana@example.com" }) })).json();
    const t = tokenFrom(c.inviteLink);
    const s1 = await pub("step", t, { stepKey: "overview", answers: { shower_type: "walk_in" }, complete: true });
    expect(s1.status).toBe(200);
    expect(Object.keys(s1.j.walkthrough).sort()).toEqual([...PUBLIC_VIEW_KEYS].sort());
    // ft/in measurement + "unknown" + leak answer (escalation stays internal)
    expect((await pub("step", t, { stepKey: "wall#1", answers: { wall_hollow: "yes" }, measurements: [{ fieldId: "wall_width", kind: "length", a: 5, b: 0 }, { fieldId: "wall_height", kind: "length", unknown: true }], complete: true })).status).toBe(200);
    expect((await pub("step", t, { stepKey: "wall#2", answers: {}, measurements: [], repeats: { wall: 3 }, complete: true })).j.walkthrough.repeats.wall).toBe(3);
    expect((await pub("step", t, { stepKey: "water", answers: { leak_signs: "yes" }, complete: true })).status).toBe(200);
    expect((await pub("step", t, { stepKey: "nope", answers: {} })).status).toBe(422);
    // upload: sign → PUT to signed local URL → complete (EXIF stripped)
    const jpg = exifJpeg();
    const sign = await pub("media-sign", t, { stepKey: "overview", kind: "photo", contentType: "image/jpeg", size: jpg.byteLength });
    expect(sign.status).toBe(200);
    const { PUT } = await import("@/app/api/files/route");
    const put = await PUT(new Request(`http://localhost:3000${sign.j.upload.url}`, { method: "PUT", headers: sign.j.upload.headers, body: jpg }));
    expect(put.status).toBe(200);
    const done = await pub("media-complete", t, { mediaId: sign.j.mediaId });
    expect(done.j).toMatchObject({ ok: true, status: "uploaded" });
    // disguised upload is rejected
    const fake = new TextEncoder().encode("<?php echo 1; ?>....");
    const s2 = await pub("media-sign", t, { stepKey: "grout", kind: "photo", contentType: "image/jpeg", size: fake.byteLength });
    const put2 = await PUT(new Request(`http://localhost:3000${s2.j.upload.url}`, { method: "PUT", headers: s2.j.upload.headers, body: fake }));
    expect(put2.status).toBeGreaterThanOrEqual(400);
    await pub("media-delete", t, { mediaId: s2.j.mediaId });
    // resume: a fresh read returns saved progress
    const resumed = await pub("session", t);
    expect(resumed.j.walkthrough.steps["wall#1"].completed).toBe(true);
    expect(resumed.j.walkthrough.measurements["wall#1"].find((m: { fieldId: string }) => m.fieldId === "wall_height").unknown).toBe(true);
    const body = JSON.stringify(resumed.j);
    expect(body).not.toMatch(/escalat|outcome|internalNotes|storageKey|leak"|price|rate|\$\d/i);
    // submit → staff sees escalations + suggested site check; GHL job queued (dry-run)
    expect((await pub("submit", t, {})).status).toBe(200);
    expect((await pub("step", t, { stepKey: "overview", answers: {} })).status).toBe(409);
    const staff = await (await ops(`walkthroughs/${c.walkthrough.id}`)).json();
    expect(staff.walkthrough.escalations).toEqual(expect.arrayContaining(["leak", "loose_tile"]));
    expect(staff.walkthrough.suggestion.outcome).toBe("site_check");
    expect(staff.walkthrough.media[0].metadata).toBe("stripped");
    expect((await listJobs()).some((j) => j.kind === "ghl.walkthrough" && j.ref === c.walkthrough.id)).toBe(true);
    // corrections: only the requested step can change; then resubmit
    expect((await ops(`walkthroughs/${c.walkthrough.id}`, { method: "POST", body: JSON.stringify({ action: "request_correction", stepKeys: ["wall#1"], note: "Please re-measure the back wall width" }) })).status).toBe(200);
    const corr = await pub("session", t);
    expect(corr.j.walkthrough.status).toBe("needs_correction");
    expect(corr.j.walkthrough.corrections[0].note).toMatch(/re-measure/);
    expect((await pub("step", t, { stepKey: "overview", answers: {} })).status).toBe(409);
    expect((await pub("step", t, { stepKey: "wall#1", answers: { wall_hollow: "no" }, measurements: [{ fieldId: "wall_width", kind: "length", a: 1, b: 52, uncertain: true }], units: "metric", complete: true })).status).toBe(200);
    expect((await pub("submit", t, {})).status).toBe(200);
    const after = await (await ops(`walkthroughs/${c.walkthrough.id}`)).json();
    expect(after.walkthrough.measurementHistory.filter((v: { stepKey: string }) => v.stepKey === "wall#1").length).toBe(2); // versioned, original kept
    // staff outcome
    expect((await ops(`walkthroughs/${c.walkthrough.id}`, { method: "POST", body: JSON.stringify({ action: "set_outcome", outcome: "site_check" }) })).status).toBe(200);
  });
  it("self-start is opt-in (off by default)", async () => {
    await kv.set("lead:data:evt_optin0001", JSON.stringify({ leadId: "evt_optin0001", receivedAt: new Date().toISOString(), lead: { firstName: "Op", zip: "02139" } }));
    expect((await pub("start", null, { leadId: "evt_optin0001", workType: "floor" })).status).toBe(404);
  });
  it("self-start requires a recent first-party lead and works once per lead", async () => {
    process.env.WALKTHROUGH_SELF_START = "true";
    await kv.set("lead:data:evt_selfstart1", JSON.stringify({ leadId: "evt_selfstart1", receivedAt: new Date().toISOString(), lead: { firstName: "Cy", email: "cy@example.com", zip: "33301" }, routing: {}, score: {} }));
    const a = await pub("start", null, { leadId: "evt_selfstart1", workType: "floor" });
    expect(a.status).toBe(201); expect(a.j.token).toBeTruthy();
    expect((await pub("start", null, { leadId: "evt_selfstart1", workType: "floor" })).status).toBe(409);
    expect((await pub("start", null, { leadId: "evt_unknown99", workType: "floor" })).status).toBe(404);
    await kv.set("lead:data:evt_old000001", JSON.stringify({ leadId: "evt_old000001", receivedAt: new Date(Date.now() - 72 * 3600_000).toISOString(), lead: { firstName: "Old", zip: "02139" } }));
    expect((await pub("start", null, { leadId: "evt_old000001", workType: "floor" })).status).toBe(410);
    process.env.WALKTHROUGH_SELF_START = "false";
    await kv.set("lead:data:evt_flagoff01", JSON.stringify({ leadId: "evt_flagoff01", receivedAt: new Date().toISOString(), lead: { firstName: "F", zip: "02139" } }));
    expect((await pub("start", null, { leadId: "evt_flagoff01", workType: "floor" })).status).toBe(404);
  });
  it("is fully off with WALKTHROUGH_ENABLED=false", async () => {
    process.env.WALKTHROUGH_ENABLED = "false";
    expect((await pub("session", "x".repeat(43))).status).toBe(404);
  });
});

describe("outcome rules", () => {
  const base = { workType: "stone" as const, repeats: {}, media: [], measurements: [] };
  it("escalates leaks / loose tile / stone uncertainty / safety-sensitive work", () => {
    expect(escalationsFor({ ...base, steps: { overview: { key: "overview", answers: { stone_type: "unknown" }, updatedAt: "" } } })).toContain("stone_uncertain");
    expect(suggestOutcome({ ...base, steps: { overview: { key: "overview", answers: { stone_type: "unknown" }, updatedAt: "" } } }).outcome).toBe("live_video_walkthrough");
    expect(escalationsFor({ workType: "commercial", repeats: {}, steps: { closures: { key: "closures", answers: { wet_in_use: "yes" }, updatedAt: "" } } })).toContain("safety_sensitive");
    expect(suggestOutcome({ workType: "floor", repeats: {}, media: [], measurements: [], steps: {} }).outcome).toBe("targeted_follow_up");
  });
  it("publicView is built from the allowlist only", () => {
    const w = { reference: "W-1", workType: "shower", status: "reviewed", units: "imperial", customer: { firstName: "A", email: "a@x.com" }, invite: { hash: "h", expiresAt: "z" }, repeats: {}, steps: {}, measurements: [], media: [{ id: "m", stepKey: "pan", kind: "photo", status: "uploaded", storageKey: "secret/key" }], corrections: [], escalations: ["leak"], internalNotes: [{ text: "internal" }], suggestedOutcome: "site_check" } as never;
    const v = publicView(w);
    expect(Object.keys(v).sort()).toEqual([...PUBLIC_VIEW_KEYS].sort());
    expect(v.status).toBe("submitted");
    expect(JSON.stringify(v)).not.toMatch(/secret\/key|a@x\.com|internal|leak|site_check/);
  });

  it("parallel uploads never overwrite each other (per-walkthrough lock)", async () => {
    const c = await (await ops("walkthroughs", { method: "POST", body: JSON.stringify({ workType: "shower", firstName: "Ana", zip: "02139" }) })).json();
    const t = tokenFrom(c.inviteLink);
    const signs = await Promise.all([0, 1, 2].map(() => pub("media-sign", t, { stepKey: "grout", kind: "photo", contentType: "image/jpeg", size: 500 })));
    expect(signs.every((r) => r.status === 200)).toBe(true);
    const d = await (await ops(`walkthroughs/${c.walkthrough.id}`)).json();
    const ids = (d.walkthrough.media as { id: string }[]).map((m) => m.id);
    for (const r of signs) expect(ids).toContain(r.j.mediaId);
  });
});
