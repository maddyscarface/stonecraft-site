/**
 * Transactional email via Resend (owner alert + customer auto-reply).
 * Env: RESEND_API_KEY, NOTIFY_FROM (verified sender), NOTIFY_TO_BOSTON, NOTIFY_TO_FL, NOTIFY_TO
 * SMS auto-replies are sent by GoHighLevel workflows (consent-gated), not from here.
 */
import type { LeadInput } from "@/lib/leads/schema";
import type { Routing } from "@/lib/leads/routing";
import type { Score } from "@/lib/leads/scoring";
import { site } from "@/config/site";
import { renderLeadBrief } from "@/lib/estimate/lead-brief";
import { estimateConfig, briefTheme } from "@/config/estimate";
import type { Qualifiers } from "@/lib/estimate/qualifiers";

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

async function send(to: string, subject: string, html: string, replyTo?: string, text?: string) {
  const key = process.env.RESEND_API_KEY, from = process.env.NOTIFY_FROM;
  if (!key || !from) return { sent: false, reason: "not configured" };
  const res = await fetch(`${process.env.RESEND_API_BASE || "https://api.resend.com"}/emails`, {
    method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: to.split(",").map((s) => s.trim()).filter(Boolean), subject, html, text, reply_to: replyTo }), cache: "no-store",
  });
  return { sent: res.ok, status: res.status };
}

export async function notifyOwner(lead: LeadInput, routing: Routing, score: Score, photoUrls: string[]) {
  const to = (routing.marketId === "south-florida" ? process.env.NOTIFY_TO_FL : process.env.NOTIFY_TO_BOSTON) ?? process.env.NOTIFY_TO;
  if (!to) return { sent: false, reason: "no recipient" };
  const q = lead.variant === "commercial" ? undefined : (lead.qualifiers as Qualifiers | undefined);
  if (q) {
    // Residential / renter / landlord: the team "lead brief" (budget, start, saw pricing, visit time, offer guidance).
    const label: Record<string, string> = { shower: "Shower", bath_floor: "Bathroom floor", kitchen: "Kitchen", marble_stone: "Marble/stone", countertops: "Countertops", entry_mudroom: "Entry/mudroom", other: "Other" };
    const b = renderLeadBrief({
      cfg: estimateConfig, theme: briefTheme,
      heading: lead.variant === "renter" ? "New renter estimate request" : lead.variant === "landlord" ? "New landlord estimate request" : "New estimate request",
      name: [lead.firstName, lead.lastName].filter(Boolean).join(" "), phone: lead.phone, email: lead.email,
      location: [lead.town, routing.city, lead.zip].filter(Boolean).join(", "), q,
      details: [
        ["Surfaces", "surfaces" in lead ? (lead.surfaces as string[]).map((x) => label[x] ?? x).join(", ") : undefined],
        ["Market / zone", `${routing.market?.name ?? "Unknown"} · ${routing.zoneName ?? "no zone"}${routing.marketStatus === "pre-launch" ? " · PRE-LAUNCH, do not book" : ""}`],
        ["Landlord approval", lead.variant === "renter" ? `${lead.landlordApprovalStatus}${lead.roommates > 1 ? ` · split ${lead.roommates} ways` : ""}` : undefined],
        ["Units / turn date", lead.variant === "landlord" ? `${lead.units} unit(s)${lead.turnDate ? ` · turn ${lead.turnDate}` : ""}` : undefined],
        ["Goal", lead.variant === "residential" ? lead.goal : undefined],
        ["Notes", lead.message],
      ],
      photoUrls, score: `${score.score} (${score.tier})`,
      source: [lead.attribution.utm_source, lead.attribution.utm_medium, lead.attribution.utm_campaign].filter(Boolean).join(" / ") || "direct",
    });
    return send(to, b.subject, b.html, lead.email, b.text);
  }
  const rows = Object.entries(lead).filter(([k, v]) => !["attribution", "photoKeys", "eventId", "website", "startedAt", "turnstileToken"].includes(k) && v !== undefined && v !== "")
    .map(([k, v]) => `<tr><td style="padding:4px 8px;color:#77827C">${esc(k)}</td><td style="padding:4px 8px">${esc(Array.isArray(v) ? v.join(", ") : v)}</td></tr>`).join("");
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#25292B"><h2 style="font-family:Georgia,serif">New ${esc(lead.variant)} lead — ${esc(routing.city ?? lead.zip)} (${esc(score.tier)}, ${score.score})</h2>
  <p>Market: ${esc(routing.market?.name ?? "Unknown")} · Zone: ${esc(routing.zoneName ?? "none")} · Pipeline: ${esc(routing.pipeline)}${routing.marketStatus === "pre-launch" ? " · <b>PRE-LAUNCH MARKET</b>" : ""}</p>
  <table>${rows}</table><p>${photoUrls.map((u, i) => `<a href="${esc(u)}">Photo ${i + 1}</a>`).join(" · ") || "No photos"}</p>
  <p style="color:#77827C">Source: ${esc(lead.attribution.utm_source ?? "direct")} / ${esc(lead.attribution.utm_medium ?? "")} / ${esc(lead.attribution.utm_campaign ?? "")}</p></div>`;
  return send(to, `New lead: ${lead.firstName} in ${routing.city ?? lead.zip} — ${lead.variant}`, html, lead.email);
}

export async function autoReply(lead: LeadInput, routing: Routing) {
  const brand = routing.market?.brandName ?? site.brand;
  const photos = lead.photoKeys.length;
  const renterLine = lead.variant === "renter" ? `<p>Reminder: we'll need written approval from your landlord or property manager before any work is booked. ${lead.landlordOutreachConsent ? "You've authorised us to contact them—we'll confirm with you before we do." : "Our approval template is at " + esc(site.primaryDomain) + "/renters/landlord-approval."}</p>` : "";
  const html = `<div style="font-family:Inter,Arial,sans-serif;color:#25292B;max-width:560px">
  <div style="background:#25292B;color:#B89A70;padding:16px 20px;font-family:Georgia,serif;font-size:20px">${esc(brand)}</div>
  <div style="padding:20px"><p>Hi ${esc(lead.firstName)},</p>
  <p>Thanks — we received your request${photos ? ` and ${photos} photo${photos > 1 ? "s" : ""}` : ""}. ${esc(site.responsePromise)}</p>
  ${photos ? "" : "<p>If you can, reply with 3–4 photos: a wide shot of the space and close-ups of the problem areas.</p>"}
  ${renterLine}
  ${routing.marketStatus === "pre-launch" ? "<p>We're confirming scheduling availability in your area and will let you know what we can offer.</p>" : ""}
  <p>— The ${esc(brand)} team</p></div></div>`;
  return send(lead.email, `We received your request, ${lead.firstName}`, html);
}
