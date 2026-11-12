import { z } from "zod";

const trimmed = (max: number) => z.string().trim().max(max);
const optText = (max: number) => trimmed(max).optional().or(z.literal("").transform(() => undefined));

export const attributionSchema = z.object({
  utm_source: optText(120), utm_medium: optText(120), utm_campaign: optText(200), utm_content: optText(200), utm_term: optText(200),
  gclid: optText(300), gbraid: optText(300), wbraid: optText(300), fbclid: optText(500), msclkid: optText(300),
  fbc: optText(500), fbp: optText(200),
  landing_page: optText(500), referrer: optText(500), first_seen: optText(40), last_touch_source: optText(120),
  last_touch_medium: optText(120), last_touch_campaign: optText(200), last_touch_at: optText(40),
  first_touch_source: optText(120), first_touch_medium: optText(120), first_touch_campaign: optText(200), first_touch_at: optText(40),
  openai_obref: optText(300), openai_oppref: optText(300),
}).partial();

const base = z.object({
  firstName: trimmed(60).min(1, "First name is required"),
  lastName: optText(60),
  email: z.string().trim().toLowerCase().email("Enter a valid email").max(200),
  phone: z.string().trim().transform((v) => v.replace(/[^\d+]/g, "")).refine((v) => v.replace(/\D/g, "").length >= 10, "Enter a valid phone number"),
  zip: z.string().trim().regex(/^\d{5}$/, "Enter a 5-digit ZIP"),
  town: optText(80),
  message: optText(2000),
  photoKeys: z.array(z.string().max(300)).max(10).default([]),
  /** Express consent to receive SMS — optional and unchecked by default. */
  smsConsent: z.boolean().default(false),
  /** Agreement to be contacted about this request (required). */
  contactConsent: z.literal(true, { errorMap: () => ({ message: "Please agree so we can reply to your request" }) }),
  sourcePage: optText(300),
  attribution: attributionSchema.default({}),
  eventId: z.string().trim().min(8).max(100),
  // Anti-spam
  website: z.string().max(0).optional().or(z.literal("")), // honeypot
  startedAt: z.number().int().optional(),
  turnstileToken: optText(2048),
  /** Pre-estimate answers. Sanitised against src/config/estimate.ts in the API route. */
  qualifiers: z.record(z.unknown()).optional(),
});

export const residentialLead = base.extend({
  variant: z.literal("residential"),
  customerType: z.enum(["homeowner", "renter", "landlord"]).default("homeowner"),
  surfaces: z.array(z.enum(["shower", "bath_floor", "kitchen", "marble_stone", "countertops", "entry_mudroom", "other"])).max(7).default([]),
  duration: z.enum(["lt6m", "6to12m", "1to3y", "3yplus", ""]).optional(),
  triedCleaning: z.enum(["yes", "no", ""]).optional(),
  goal: z.enum(["refresh", "selling", "moving_in", "rental_turn", "other", ""]).optional(),
  timeline: z.enum(["asap", "2weeks", "month", "flexible", ""]).optional(),
});

export const renterLead = base.extend({
  variant: z.literal("renter"),
  customerType: z.literal("renter").default("renter"),
  surfaces: z.array(z.string().max(40)).max(7).default([]),
  roommates: z.coerce.number().int().min(1).max(8).default(1),
  landlordApprovalStatus: z.enum(["not_asked", "asked", "approved", "declined"]).default("not_asked"),
  /** Renter authorises StoneCraft to contact their landlord. Landlord details are only kept when true. */
  landlordOutreachConsent: z.boolean().default(false),
  landlordName: optText(120),
  landlordContact: optText(200),
  moveInDate: optText(20),
}).transform((v) => (v.landlordOutreachConsent ? v : { ...v, landlordName: undefined, landlordContact: undefined }));

export const landlordLead = base.extend({
  variant: z.literal("landlord"),
  customerType: z.literal("landlord").default("landlord"),
  company: optText(160),
  isPropertyManager: z.boolean().default(false),
  propertyType: z.enum(["single", "multi_2_4", "multi_5_plus", "portfolio", ""]).optional(),
  units: z.coerce.number().int().min(1).max(5000).default(1),
  bathroomsInScope: z.coerce.number().int().min(0).max(5000).optional(),
  turnDate: optText(20),
  occupied: z.enum(["vacant", "occupied", "mixed", ""]).optional(),
  surfaces: z.array(z.string().max(40)).max(7).default([]),
});

export const commercialLead = base.extend({
  variant: z.literal("commercial"),
  customerType: z.literal("commercial").default("commercial"),
  segment: z.enum(["hospitals", "universities-schools", "hotels-hospitality", "hoa-condos", "property-management", "other"]),
  organization: trimmed(200).min(1, "Organisation is required"),
  jobTitle: trimmed(120).min(1, "Your role is required"),
  buildings: z.coerce.number().int().min(1).max(500).default(1),
  restrooms: z.coerce.number().int().min(0).max(5000).optional(),
  squareFeet: z.coerce.number().int().min(0).max(10_000_000).optional(),
  surfaceTypes: z.array(z.string().max(40)).max(10).default([]),
  accessRestrictions: optText(1000),
  workHours: z.enum(["business", "evenings", "overnight", "weekends", "flexible", ""]).optional(),
  budget: z.enum(["lt10k", "10to25k", "25to75k", "75to250k", "250kplus", "unknown", ""]).optional(),
  procurement: z.enum(["po", "rfp", "approved_vendor", "board_approval", "unknown", ""]).optional(),
  decisionRole: z.enum(["decision_maker", "influencer", "researching", ""]).optional(),
  decisionMakerName: optText(120),
  decisionMakerTitle: optText(120),
  timeline: z.enum(["30d", "90d", "6m", "next_fy", "unknown", ""]).optional(),
  program: optText(40),
});

export const leadSchema = z.union([residentialLead, renterLead, landlordLead, commercialLead]);
export type LeadInput = z.infer<typeof leadSchema>;
export type Variant = LeadInput["variant"];

/** Pre-parse discriminated dispatch for clearer error messages. */
export function parseLead(body: unknown) {
  const variant = (body as { variant?: string })?.variant;
  const schema = variant === "renter" ? renterLead : variant === "landlord" ? landlordLead : variant === "commercial" ? commercialLead : residentialLead;
  return schema.safeParse(body);
}
