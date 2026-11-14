/**
 * Native AR / 3D-capture adapter CONTRACTS (Phase 4) — ALL DISABLED.
 *
 * Providers: Apple ARKit (on-device), Apple RoomPlan (on-device, LiDAR), Google ARCore (on-device),
 * Hover (vendor API), CubiCasa (vendor API). None is implemented or contracted. Every provider reports
 * `disabled` and every method returns a DisabledError; the manual walkthrough is always the fallback.
 *
 * Rules: measurements from any AR source are stored as `source: "ar:<provider>"`, `accuracy: "unverified"` and
 * are NEVER shown to customers as accurate, never used for price automatically, and always reviewed by staff.
 * No AR accuracy claims anywhere.
 */
export const arProviders = ["arkit", "roomplan", "arcore", "hover", "cubicasa"] as const;
export type ArProviderId = (typeof arProviders)[number];

export type ArCapability = {
  provider: ArProviderId; label: string; kind: "on_device_sdk" | "vendor_api";
  platforms: ("ios" | "android" | "web")[];
  /** What the provider could return once implemented (contract only). */
  outputs: ("floor_plan" | "room_dimensions" | "wall_surfaces" | "point_cloud" | "photos" | "pdf_report")[];
  requiresNativeApp: boolean; requiresVendorAccount: boolean;
};
export type ArStatus = "disabled" | "not_configured" | "configured_unverified";
/** Correlates an AR session with a StoneCraft job (walkthrough / project). */
export type JobCorrelation = { walkthroughId?: string; projectId?: string; stepKey?: string; market: "boston" | "south-florida" };
export type ArSession = { id: string; provider: ArProviderId; correlation: JobCorrelation; status: "created" | "capturing" | "processing" | "completed" | "failed" | "cancelled"; createdAt: string; externalId?: string };
export type ArWebhookEvent = { provider: ArProviderId; externalId: string; type: "status" | "completed" | "failed"; receivedAt: string };
/** Normalised measurement output — same units as the manual walkthrough (mm / m²). */
export type NormalisedArMeasurement = { fieldId: string; kind: "length" | "area"; mm?: number; m2?: number; source: `ar:${ArProviderId}`; accuracy: "unverified"; confidence?: number };
export type ArEvidence = { kind: "photo" | "model" | "report"; storageKey: string; contentType: string };

export class ArDisabledError extends Error { readonly code = "ar_disabled"; constructor(p: ArProviderId) { super(`AR provider ${p} is disabled (contract only)`); } }

export interface ArAdapter {
  readonly id: ArProviderId;
  capability(): ArCapability;
  status(): ArStatus;
  createSession(c: JobCorrelation): Promise<ArSession>;
  getSession(id: string): Promise<ArSession>;
  /** Verify + parse a provider webhook (HMAC per provider). */
  handleWebhook(rawBody: string, headers: Headers): Promise<ArWebhookEvent>;
  normalise(providerPayload: unknown): Promise<NormalisedArMeasurement[]>;
  evidence(sessionId: string): Promise<ArEvidence[]>;
  cancel(sessionId: string): Promise<void>;
  /** What to show when AR is unavailable: always the manual guided walkthrough. */
  fallback(): { mode: "manual_walkthrough"; reason: string };
}
