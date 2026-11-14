"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, Home, KeyRound, Lock } from "lucide-react";
import { PhotoUpload, type Uploaded } from "./PhotoUpload";
import { currentConsent, getAttribution, gtagLeadConversion, newEventId, pushUserData, track } from "@/lib/tracking/client";
import { useMarket } from "./MarketContext";
import { EstimateQualifiers, validateQualifiers, withPricingSeen } from "./estimate/EstimateQualifiers";
import { estimateConfig, qualifierTheme } from "@/config/estimate";
import { oaiqLead } from "@/lib/openai-ads/client";
import type { Qualifiers } from "@/lib/estimate/qualifiers";
import { AREAS, COMMERCIAL_MATERIALS, FINISHES, ISSUES, MATERIALS, TREATMENTS, surfaceGuidance } from "@/config/surfaces";

/** Surface ids in step 2 → estimate project type (pre-selects step 3). */
const SURFACE_TO_PROJECT: Record<string, string> = { shower: "shower", bath_floor: "floor", kitchen: "floor", entry_mudroom: "floor", marble_stone: "marble", countertops: "countertop" };

type Variant = "residential" | "renter" | "landlord" | "commercial";
type CustomerType = "homeowner" | "renter" | "landlord";

const SURFACES = [["shower", "Shower tile & grout"], ["bath_floor", "Bathroom floor"], ["kitchen", "Kitchen tile & grout"], ["marble_stone", "Marble or natural stone"], ["countertops", "Countertops"], ["entry_mudroom", "Entry / mudroom"], ["other", "Other"]] as const;
const COMMERCIAL_SURFACES = ["Restroom floors", "Restroom walls", "Showers / locker rooms", "Lobbies & corridors", "Marble / stone", "Kitchens", "Pool / amenity areas"];
const SEGMENTS = [["hospitals", "Hospital / healthcare"], ["universities-schools", "University / school"], ["hotels-hospitality", "Hotel / hospitality"], ["hoa-condos", "HOA / condominium"], ["property-management", "Property management / multifamily"], ["other", "Other commercial"]] as const;

export type LeadFormProps = {
  variant?: Variant;
  customerType?: CustomerType;
  segment?: string;
  program?: string;
  zip?: string;
  town?: string;
  compact?: boolean;
  sourcePage: string;
  submitLabel?: string;
};

function Field({ label, children, hint, required }: { label: string; children: React.ReactNode; hint?: string; required?: boolean }) {
  return <label className="block"><span className="label">{label}{required && <span className="text-linen-dark"> *</span>}</span>{children}{hint && <span className="mt-1 block text-xs text-hunter/60">{hint}</span>}</label>;
}

export function LeadForm(props: LeadFormProps) {
  const router = useRouter();
  const { market } = useMarket();
  const isCommercial = props.variant === "commercial";
  const [ctype, setCtype] = useState<CustomerType>(props.customerType ?? (props.variant === "renter" ? "renter" : props.variant === "landlord" ? "landlord" : "homeowner"));
  const variant: Variant = isCommercial ? "commercial" : ctype === "renter" ? "renter" : ctype === "landlord" ? "landlord" : "residential";
  // Residential / renter / landlord: contact → space → budget & visit → photos → finish.
  const withQualifiers = !isCommercial && !props.compact;
  const steps = props.compact ? 2 : isCommercial ? 4 : 5;
  const qStep = 3;
  const photoStep = 4;
  const [q, setQ] = useState<Qualifiers>({});
  const [qErrors, setQErrors] = useState<Partial<Record<keyof Qualifiers, string>>>({});
  const [step, setStep] = useState(1);
  const [f, setF] = useState<Record<string, string | boolean | string[]>>({ zip: props.zip ?? "", town: props.town ?? "", segment: props.segment ?? "", surfaces: [], surfaceTypes: [], materials: [], issues: [], treatments: [], roommates: "2", units: "1", buildings: "1", walkthroughRequested: true });
  const [photos, setPhotos] = useState<Uploaded[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const eventId = useMemo(() => newEventId("lead"), []);
  const started = useRef<number | null>(null);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => { if (props.customerType) setCtype(props.customerType); }, [props.customerType]);

  const set = (k: string, v: string | boolean | string[]) => {
    if (!started.current) { started.current = Date.now(); track("form_start", { form_variant: variant, source_page: props.sourcePage }); track("assessment_start", { form_variant: variant, journey: isCommercial ? "commercial" : "residential", source_page: props.sourcePage }); }
    setF((p) => ({ ...p, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
  };
  const str = (k: string) => (f[k] as string) ?? "";
  const toggle = (k: string, v: string) => { const cur = (f[k] as string[]) ?? []; set(k, cur.includes(v) ? cur.filter((x) => x !== v) : [...cur, v]); };

  function validate(s: number) {
    const e: Record<string, string> = {};
    if (s === 1) {
      if (!str("firstName").trim()) e.firstName = "Required";
      if (!/^\S+@\S+\.\S+$/.test(str("email"))) e.email = "Enter a valid email";
      if (str("phone").replace(/\D/g, "").length < 10) e.phone = "Enter a 10-digit phone";
      if (!/^\d{5}$/.test(str("zip"))) e.zip = "5-digit ZIP";
      if (isCommercial) { if (!str("organization").trim()) e.organization = "Required"; if (!str("jobTitle").trim()) e.jobTitle = "Required"; }
    }
    if (s === 2 && isCommercial && !str("segment")) e.segment = "Choose a facility type";
    if (s === 2 && !isCommercial && !props.compact && variant === "renter" && !f.approvalAcknowledged) e.approvalAcknowledged = "Please confirm before continuing";
    if (s === qStep && withQualifiers) {
      const qe = validateQualifiers(estimateConfig, q);
      setQErrors(qe);
      if (Object.keys(qe).length) return false;
    }
    if (s === steps && !f.contactConsent) e.contactConsent = "Please agree so we can reply";
    if (s === steps && variant === "renter" && !f.approvalAcknowledged) e.contactConsent = "Please confirm the approval statement in step 2";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  const next = () => { if (validate(step)) {
    if (withQualifiers && step + 1 === qStep && !q.project_type) {
      const pt = ((f.surfaces as string[]) ?? []).map((x) => SURFACE_TO_PROJECT[x]).find(Boolean);
      if (pt) setQ((cur) => ({ ...cur, project_type: pt }));
    }
    setStep(step + 1); formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); track("form_step", { step: step + 1, form_variant: variant }); } };

  async function submit() {
    if (!validate(1)) { setStep(1); return; }
    if (withQualifiers && !validate(qStep)) { setStep(qStep); return; }
    if (!validate(steps)) return;
    setSubmitting(true); setServerError(null);
    const num = (k: string) => (str(k) ? Number(str(k)) : undefined);
    const body: Record<string, unknown> = {
      variant, customerType: isCommercial ? "commercial" : ctype,
      firstName: str("firstName"), lastName: str("lastName"), email: str("email"), phone: str("phone"), zip: str("zip"), town: str("town"),
      message: str("message"), photoKeys: photos.map((p) => p.key), smsConsent: !!f.smsConsent, contactConsent: !!f.contactConsent,
      sourcePage: props.sourcePage, attribution: getAttribution(), eventId, website: str("website"), startedAt: started.current ?? Date.now(), adConsent: currentConsent().ad_storage === "granted",
    };
    if (withQualifiers) body.qualifiers = withPricingSeen(q);
    if (!isCommercial) Object.assign(body, { dwelling: str("dwelling"), address: (q as Record<string, unknown>).address ?? "", material: str("material"), area: str("area"), showers: num("showers"), issues: f.issues, treatments: f.treatments, finish: str("finish") });
    if (variant === "residential") Object.assign(body, { surfaces: f.surfaces, duration: str("duration"), triedCleaning: str("triedCleaning"), goal: str("goal"), timeline: (withQualifiers ? q.start : undefined) ?? str("timeline") });
    if (variant === "renter") Object.assign(body, { surfaces: f.surfaces, roommates: num("roommates") ?? 1, landlordApprovalStatus: str("landlordApprovalStatus") || "not_asked", landlordOutreachConsent: !!f.landlordOutreachConsent, approverRole: str("approverRole"), approvalAcknowledged: !!f.approvalAcknowledged, landlordName: str("landlordName"), landlordContact: str("landlordContact"), moveInDate: str("moveInDate") });
    if (variant === "landlord") Object.assign(body, { surfaces: f.surfaces, company: str("company"), isPropertyManager: !!f.isPropertyManager, propertyType: str("propertyType"), units: num("units") ?? 1, bathroomsInScope: num("bathroomsInScope"), turnDate: str("turnDate"), occupied: str("occupied") });
    if (variant === "commercial") Object.assign(body, { segment: str("segment") || "other", organization: str("organization"), jobTitle: str("jobTitle"), buildings: num("buildings") ?? 1, restrooms: num("restrooms"), squareFeet: num("squareFeet"), surfaceTypes: f.surfaceTypes, accessRestrictions: str("accessRestrictions"), operationalConstraints: str("operationalConstraints"), materials: f.materials, walkthroughRequested: !!f.walkthroughRequested, walkthroughWindow: str("walkthroughWindow"), workHours: str("workHours"), budget: str("budget"), procurement: str("procurement"), decisionRole: str("decisionRole"), decisionMakerName: str("decisionMakerName"), decisionMakerTitle: str("decisionMakerTitle"), timeline: str("timeline"), program: props.program });

    try {
      const res = await fetch("/api/leads", { method: "POST", headers: { "Content-Type": "application/json", "Idempotency-Key": eventId }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) { setServerError(data.error ?? "Something went wrong. Please try again or email info@stonecraftpros.com."); if (data.fields) setErrors(data.fields); setSubmitting(false); return; }
      // Fire the browser-side conversion exactly once per eventId.
      let fired = false; try { fired = sessionStorage.getItem(`sc_fired_${eventId}`) === "1"; } catch {}
      if (!fired && !data.duplicate) {
        pushUserData({ email: str("email"), phone: str("phone"), firstName: str("firstName"), lastName: str("lastName"), zip: str("zip") });
        track("generate_lead", { event_id: eventId, form_variant: variant, customer_type: body.customerType, market: data.market ?? market, county: data.county ?? undefined, lead_tier: data.tier, photos: photos.length, segment: body.segment },
          { name: "Lead", eventId, custom: { content_category: variant, lead_tier: data.tier } });
        gtagLeadConversion(eventId, { form_variant: variant, lead_tier: data.tier, market: data.market ?? market });
        // OpenAI Ads pixel: same event_id as the server Conversions API call (deduplicated).
        if (currentConsent().ad_storage === "granted") oaiqLead(eventId);
        try { sessionStorage.setItem(`sc_fired_${eventId}`, "1"); } catch {}
      }
      // Phase 4: remember this request (this tab only) so the thank-you page can offer the guided walkthrough.
      if (data.market && variant !== "renter") { try { sessionStorage.setItem("sc_wt_lead", JSON.stringify({ id: eventId, at: Date.now(), v: variant })); } catch {} }
      router.push(`/thank-you?v=${variant}&m=${data.market ?? market}${photos.length ? "" : "&photos=0"}`);
    } catch {
      setServerError("Network error. Please try again, or email info@stonecraftpros.com."); setSubmitting(false);
    }
  }

  const err = (k: string) => errors[k] && <span className="mt-1 block text-xs text-red-700" role="alert">{errors[k]}</span>;
  const typeCards: [CustomerType, string, typeof Home][] = [["homeowner", "Homeowner", Home], ["renter", "Renter", Building2], ["landlord", "Landlord / Property manager", KeyRound]];

  return (
    <div ref={formRef} className="scroll-mt-28 border-t-2 border-bronze bg-white p-6 shadow-premium md:p-10" data-testid="lead-form" data-variant={variant}>
      <div className="mb-6 flex items-center gap-2" aria-label={`Step ${step} of ${steps}`}>
        {Array.from({ length: steps }, (_, i) => <span key={i} className={`h-[3px] flex-1 ${i < step ? "bg-bronze" : "bg-cream-dark"}`} />)}
      </div>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={str("website")} onChange={(e) => set("website", e.target.value)} />

      {step === 1 && (
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-4 font-serif text-[30px] leading-tight">{isCommercial ? "Your contact details" : "Tell us about yourself"}</legend>
          <div><Field label="First name" required><input className="field" autoComplete="given-name" value={str("firstName")} onChange={(e) => set("firstName", e.target.value)} data-testid="firstName" /></Field>{err("firstName")}</div>
          <Field label="Last name"><input className="field" autoComplete="family-name" value={str("lastName")} onChange={(e) => set("lastName", e.target.value)} /></Field>
          <div><Field label="Email" required><input className="field" type="email" autoComplete="email" value={str("email")} onChange={(e) => set("email", e.target.value)} data-testid="email" /></Field>{err("email")}</div>
          <div><Field label="Mobile phone" required><input className="field" type="tel" autoComplete="tel" placeholder="(617) 555-0123" value={str("phone")} onChange={(e) => set("phone", e.target.value)} data-testid="phone" /></Field>{err("phone")}</div>
          <div><Field label={isCommercial ? "Facility ZIP" : "ZIP code"} required><input className="field" inputMode="numeric" maxLength={5} autoComplete="postal-code" value={str("zip")} onChange={(e) => set("zip", e.target.value.replace(/\D/g, ""))} data-testid="zip" /></Field>{err("zip")}</div>
          <Field label={isCommercial ? "City" : "Town / neighbourhood"}><input className="field" value={str("town")} onChange={(e) => set("town", e.target.value)} /></Field>
          {isCommercial && <>
            <div><Field label="Organisation" required><input className="field" autoComplete="organization" value={str("organization")} onChange={(e) => set("organization", e.target.value)} data-testid="organization" /></Field>{err("organization")}</div>
            <div><Field label="Your role / title" required><input className="field" autoComplete="organization-title" value={str("jobTitle")} onChange={(e) => set("jobTitle", e.target.value)} data-testid="jobTitle" /></Field>{err("jobTitle")}</div>
          </>}
        </fieldset>
      )}

      {step === 2 && !isCommercial && !props.compact && (
        <fieldset className="space-y-5">
          <legend className="mb-2 font-serif text-[30px] leading-tight">Tell us about your space</legend>
          {!props.customerType && (
            <div><span className="label">I am a</span>
              <div className="grid gap-2 sm:grid-cols-3">{typeCards.map(([id, label, Icon]) => (
                <button type="button" key={id} aria-pressed={ctype === id} onClick={() => setCtype(id)} className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm font-semibold ${ctype === id ? "border-hunter bg-hunter text-white" : "border-cream-dark hover:border-hunter"}`}><Icon size={18} />{label}</button>
              ))}</div>
            </div>
          )}
          <div><span className="label">What needs attention?</span>
            <div className="grid gap-2 sm:grid-cols-2">{SURFACES.map(([id, label]) => (
              <label key={id} className="flex items-center gap-2 rounded border border-cream-dark p-2.5 text-sm"><input type="checkbox" checked={(f.surfaces as string[]).includes(id)} onChange={() => toggle("surfaces", id)} />{label}</label>
            ))}</div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Property"><select className="field" value={str("dwelling")} onChange={(e) => set("dwelling", e.target.value)} data-testid="dwelling"><option value="">Choose…</option><option value="house">House</option><option value="condo">Condo</option><option value="apartment">Apartment</option><option value="multi_unit">Multi-unit building</option></select></Field>
            <Field label="Surface material" hint="Not sure? Choose ‘Other / not sure’ — your photos tell us."><select className="field" value={str("material")} onChange={(e) => set("material", e.target.value)} data-testid="material"><option value="">Choose…</option>{MATERIALS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Field>
            <Field label="Approximate area"><select className="field" value={str("area")} onChange={(e) => set("area", e.target.value)} data-testid="area"><option value="">Choose…</option>{AREAS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Field>
            <Field label="Number of showers"><select className="field" value={str("showers")} onChange={(e) => set("showers", e.target.value)} data-testid="showers"><option value="">Choose…</option>{[0, 1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 4 ? "4+" : n}</option>)}</select></Field>
          </div>
          <div><span className="label">Condition / what you&apos;re seeing</span>
            <div className="grid gap-2 sm:grid-cols-2">{ISSUES.map(([id, label]) => (
              <label key={id} className="flex items-center gap-2 border border-cream-dark p-2.5 text-sm"><input type="checkbox" checked={(f.issues as string[]).includes(id)} onChange={() => toggle("issues", id)} data-testid={`issue-${id}`} />{label}</label>
            ))}</div>
          </div>
          <div><span className="label">Treatment you&apos;re interested in <span className="font-normal text-basalt/60">(each is a different service)</span></span>
            <div className="grid gap-2 sm:grid-cols-2">{TREATMENTS.map(([id, label, help]) => (
              <label key={id} className="flex items-start gap-2 border border-cream-dark p-2.5 text-sm" title={help}><input type="checkbox" className="mt-1" checked={(f.treatments as string[]).includes(id)} onChange={() => toggle("treatments", id)} data-testid={`treatment-${id}`} /><span><span className="font-semibold">{label}</span>{help && <span className="mt-0.5 block text-xs leading-snug text-basalt/60">{help}</span>}</span></label>
            ))}</div>
          </div>
          <Field label="Preferred finish"><select className="field" value={str("finish")} onChange={(e) => set("finish", e.target.value)} data-testid="finish"><option value="">Choose…</option>{FINISHES.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Field>
          {surfaceGuidance(str("material"), str("finish"), f.treatments as string[]).map((n) => <p key={n} className="border-l-2 border-bronze-light bg-bronze-pale px-4 py-3 text-sm leading-relaxed" data-testid="surface-guidance">{n}</p>)}
          {variant === "residential" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="How long has it bothered you?"><select className="field" value={str("duration")} onChange={(e) => set("duration", e.target.value)}><option value="">Choose…</option><option value="lt6m">Under 6 months</option><option value="6to12m">6–12 months</option><option value="1to3y">1–3 years</option><option value="3yplus">3+ years</option></select></Field>
              <Field label="Tried professional cleaning before?"><select className="field" value={str("triedCleaning")} onChange={(e) => set("triedCleaning", e.target.value)}><option value="">Choose…</option><option value="yes">Yes</option><option value="no">No</option></select></Field>
              <Field label="What's the goal?"><select className="field" value={str("goal")} onChange={(e) => set("goal", e.target.value)}><option value="">Choose…</option><option value="refresh">Refresh my space</option><option value="selling">Preparing to sell</option><option value="moving_in">Just moved in</option><option value="other">Other</option></select></Field>
            </div>
          )}
          {variant === "renter" && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="People sharing the cost"><select className="field" value={str("roommates")} onChange={(e) => set("roommates", e.target.value)}>{[1, 2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}</select></Field>
                <Field label="Landlord approval so far"><select className="field" value={str("landlordApprovalStatus")} onChange={(e) => set("landlordApprovalStatus", e.target.value)}><option value="not_asked">Haven't asked yet</option><option value="asked">Asked, waiting</option><option value="approved">Approved in writing</option><option value="declined">Declined</option></select></Field>
              </div>
              <div className="rounded border border-cream-dark bg-cream p-4 text-sm">
                <p>We need <strong>written approval</strong> from the person authorised to approve work on the property before anything is booked. We never treat a renter&apos;s request as the owner&apos;s approval.</p>
                <div className="mt-3 max-w-xs"><Field label="Who approves work on the property?"><select className="field" value={str("approverRole")} onChange={(e) => set("approverRole", e.target.value)} data-testid="approver-role"><option value="">Choose…</option><option value="landlord">Landlord / owner</option><option value="property_manager">Property manager</option><option value="building_manager">Building manager</option><option value="condo_association">Condo association</option><option value="other">Other / not sure</option></select></Field></div>
                <label className="mt-3 flex items-start gap-2"><input type="checkbox" className="mt-1" checked={!!f.approvalAcknowledged} onChange={(e) => set("approvalAcknowledged", e.target.checked)} data-testid="approval-ack" /><span>I understand StoneCraft won&apos;t schedule work until the person authorised to approve it has agreed in writing, and I&apos;m not claiming approval I don&apos;t have. *</span></label>
                {err("approvalAcknowledged")}
                <label className="mt-3 flex items-start gap-2"><input type="checkbox" className="mt-1" checked={!!f.landlordOutreachConsent} onChange={(e) => set("landlordOutreachConsent", e.target.checked)} data-testid="landlord-consent" /><span>I authorise StoneCraft to contact my landlord / property manager about this request. (Optional — we'll confirm with you before reaching out.)</span></label>
                {f.landlordOutreachConsent && <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Landlord / manager name"><input className="field" value={str("landlordName")} onChange={(e) => set("landlordName", e.target.value)} /></Field>
                  <Field label="Their phone or email"><input className="field" value={str("landlordContact")} onChange={(e) => set("landlordContact", e.target.value)} /></Field>
                </div>}
              </div>
            </div>
          )}
          {variant === "landlord" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Company (if any)"><input className="field" value={str("company")} onChange={(e) => set("company", e.target.value)} /></Field>
              <Field label="Property type"><select className="field" value={str("propertyType")} onChange={(e) => set("propertyType", e.target.value)}><option value="">Choose…</option><option value="single">Single unit / condo</option><option value="multi_2_4">2–4 units</option><option value="multi_5_plus">5+ unit building</option><option value="portfolio">Portfolio (multiple properties)</option></select></Field>
              <Field label="Units in scope"><input className="field" inputMode="numeric" value={str("units")} onChange={(e) => set("units", e.target.value.replace(/\D/g, ""))} /></Field>
              <Field label="Next turn date"><input className="field" type="date" value={str("turnDate")} onChange={(e) => set("turnDate", e.target.value)} /></Field>
              <Field label="Occupancy"><select className="field" value={str("occupied")} onChange={(e) => set("occupied", e.target.value)}><option value="">Choose…</option><option value="vacant">Vacant</option><option value="occupied">Occupied</option><option value="mixed">Mixed</option></select></Field>
              <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={!!f.isPropertyManager} onChange={(e) => set("isPropertyManager", e.target.checked)} />I'm a property manager</label>
            </div>
          )}
        </fieldset>
      )}

      {step === 2 && isCommercial && (
        <fieldset className="space-y-5">
          <legend className="mb-2 font-serif text-[30px] leading-tight">About the facility</legend>
          <div><Field label="Facility type" required><select className="field" value={str("segment")} onChange={(e) => set("segment", e.target.value)} data-testid="segment"><option value="">Choose…</option>{SEGMENTS.map(([id, l]) => <option key={id} value={id}>{l}</option>)}</select></Field>{err("segment")}</div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Buildings"><input className="field" inputMode="numeric" value={str("buildings")} onChange={(e) => set("buildings", e.target.value.replace(/\D/g, ""))} /></Field>
            <Field label="Restrooms / rooms in scope"><input className="field" inputMode="numeric" value={str("restrooms")} onChange={(e) => set("restrooms", e.target.value.replace(/\D/g, ""))} /></Field>
            <Field label="Tiled sq ft (approx.)"><input className="field" inputMode="numeric" value={str("squareFeet")} onChange={(e) => set("squareFeet", e.target.value.replace(/\D/g, ""))} /></Field>
          </div>
          {str("segment") === "hospitals" && <p className="border-l-2 border-sage bg-bone px-4 py-3 text-sm leading-relaxed" data-testid="hospital-note">Healthcare work follows your facility&apos;s infection-prevention and safety requirements through a site-specific plan reviewed and approved by your team. We don&apos;t claim compliance before that plan exists.</p>}
          <div><span className="label">Floor & wall materials</span><div className="grid gap-2 sm:grid-cols-4">{COMMERCIAL_MATERIALS.map(([id, l]) => <label key={id} className="flex items-center gap-2 border border-cream-dark p-2.5 text-sm"><input type="checkbox" checked={(f.materials as string[]).includes(id)} onChange={() => toggle("materials", id)} />{l}</label>)}</div></div>
          <div><span className="label">Areas</span><div className="grid gap-2 sm:grid-cols-2">{COMMERCIAL_SURFACES.map((s) => <label key={s} className="flex items-center gap-2 rounded border border-cream-dark p-2.5 text-sm"><input type="checkbox" checked={(f.surfaceTypes as string[]).includes(s)} onChange={() => toggle("surfaceTypes", s)} />{s}</label>)}</div></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Required work hours"><select className="field" value={str("workHours")} onChange={(e) => set("workHours", e.target.value)}><option value="">Choose…</option><option value="business">Business hours</option><option value="evenings">Evenings</option><option value="overnight">Overnight</option><option value="weekends">Weekends</option><option value="flexible">Flexible</option></select></Field>
            <Field label="Access restrictions" hint="Badging, escorts, occupied areas, elevator rules…"><input className="field" value={str("accessRestrictions")} onChange={(e) => set("accessRestrictions", e.target.value)} /></Field>
          </div>
          <Field label="Current closures or operational constraints" hint="Areas that can't close, peak hours, events, occupancy, phasing needs…"><textarea className="field" rows={2} value={str("operationalConstraints")} onChange={(e) => set("operationalConstraints", e.target.value)} data-testid="constraints" /></Field>
        </fieldset>
      )}

      {step === 3 && isCommercial && (
        <fieldset className="space-y-5">
          <legend className="mb-2 font-serif text-[30px] leading-tight">Budget, approvals & timing</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Budget status"><select className="field" value={str("budget")} onChange={(e) => set("budget", e.target.value)} data-testid="budget-status"><option value="">Choose…</option><option value="approved">Budget approved for this work</option><option value="planning">Budget being set / capital planning</option><option value="unknown">Not yet defined</option></select></Field>
            <Field label="Procurement process"><select className="field" value={str("procurement")} onChange={(e) => set("procurement", e.target.value)}><option value="">Choose…</option><option value="po">Purchase order</option><option value="rfp">RFP / bid</option><option value="approved_vendor">Approved-vendor list</option><option value="board_approval">Board approval</option><option value="unknown">Not sure</option></select></Field>
            <Field label="Your role in the decision"><select className="field" value={str("decisionRole")} onChange={(e) => set("decisionRole", e.target.value)}><option value="">Choose…</option><option value="decision_maker">I'm the decision maker</option><option value="influencer">I recommend / influence</option><option value="researching">Researching options</option></select></Field>
            <Field label="Timeline"><select className="field" value={str("timeline")} onChange={(e) => set("timeline", e.target.value)}><option value="">Choose…</option><option value="30d">Within 30 days</option><option value="90d">Within 90 days</option><option value="6m">Within 6 months</option><option value="next_fy">Next fiscal year</option><option value="unknown">Not sure</option></select></Field>
          </div>
          <div className="border border-cream-dark p-4">
            <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!f.walkthroughRequested} onChange={(e) => set("walkthroughRequested", e.target.checked)} data-testid="walkthrough" /><span><strong>Request a site walkthrough.</strong> We walk the areas with your team, then send a written scope by area.</span></label>
            {f.walkthroughRequested && <div className="mt-3"><Field label="Preferred days / times for the walkthrough"><input className="field" value={str("walkthroughWindow")} onChange={(e) => set("walkthroughWindow", e.target.value)} placeholder="e.g. Tue–Thu after 6 pm" /></Field></div>}
          </div>
          {str("decisionRole") && str("decisionRole") !== "decision_maker" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Decision maker's name (optional)"><input className="field" value={str("decisionMakerName")} onChange={(e) => set("decisionMakerName", e.target.value)} /></Field>
              <Field label="Their title (optional)"><input className="field" value={str("decisionMakerTitle")} onChange={(e) => set("decisionMakerTitle", e.target.value)} /></Field>
            </div>
          )}
        </fieldset>
      )}

      {step === qStep && withQualifiers && (
        <fieldset>
          <legend className="mb-2 font-serif text-[30px] leading-tight">Budget & visit</legend>
          <p className="mb-4 text-sm text-hunter/70">A few quick answers so your quote comes with no surprises.</p>
          <EstimateQualifiers cfg={estimateConfig} value={q} onChange={(n) => { setQ(n); setQErrors({}); }} theme={qualifierTheme} errors={qErrors}
            showRange={market !== "south-florida"} />
        </fieldset>
      )}

      {((step === photoStep && withQualifiers) || (props.compact && step === 2)) && !isCommercial && (
        <fieldset>
          <legend className="mb-4 font-serif text-[30px] leading-tight">Add your photos</legend>
          <PhotoUpload eventId={eventId} value={photos} onChange={setPhotos} />
          <p className="mt-2 text-xs text-hunter/60">No photos handy? Skip this step — we'll text or email you a link.</p>
        </fieldset>
      )}

      {step === steps && (
        <fieldset className="mt-2 space-y-4">
          {!props.compact && <legend className="mb-2 font-serif text-[30px] leading-tight">{isCommercial ? "Scope photos & notes" : "Anything else?"}</legend>}
          {isCommercial && <PhotoUpload eventId={eventId} value={photos} onChange={setPhotos} />}
          <Field label="Message (optional)"><textarea className="field" rows={4} value={str("message")} onChange={(e) => set("message", e.target.value)} placeholder={isCommercial ? "Scope notes, phasing needs, vendor requirements…" : "Urgency, specific concerns, building rules…"} /></Field>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" className="mt-1" checked={!!f.contactConsent} onChange={(e) => set("contactConsent", e.target.checked)} data-testid="contact-consent" /><span>I agree that StoneCraft may contact me by phone or email about this request. *</span></label>
          {err("contactConsent")}
          <label className="flex items-start gap-2 text-sm text-hunter/80"><input type="checkbox" className="mt-1" checked={!!f.smsConsent} onChange={(e) => set("smsConsent", e.target.checked)} /><span>Optional: text me about this request and appointment updates. Message frequency varies; msg &amp; data rates may apply. Reply STOP to opt out, HELP for help. Consent is not a condition of purchase.</span></label>
        </fieldset>
      )}

      {serverError && <p className="mt-4 rounded bg-red-50 p-3 text-sm text-red-800" role="alert">{serverError}</p>}

      <div className="mt-6 flex items-center justify-between gap-3">
        {step > 1 ? <button type="button" className="btn btn-outline" onClick={() => setStep(step - 1)}>Back</button> : <span />}
        {step < steps
          ? <button type="button" className="btn btn-hunter" onClick={next} data-testid="next">Continue</button>
          : <button type="button" className="btn btn-hunter flex-1 sm:flex-none" disabled={submitting} onClick={submit} data-testid="submit">{submitting ? "Sending…" : props.submitLabel ?? (isCommercial ? "Request Site Assessment" : "Send — Get My Free Assessment")}</button>}
      </div>
      <p className="mt-4 flex items-start gap-2 text-xs text-hunter/60"><Lock size={14} className="mt-0.5 shrink-0" />Photos are stored securely and seen only by our team. We never publish them without your written permission. <a href="/privacy" className="underline">Privacy policy</a></p>
    </div>
  );
}
