import { ArDisabledError, arProviders, type ArAdapter, type ArCapability, type ArProviderId, type ArStatus } from "./contract";

const CAPS: Record<ArProviderId, Omit<ArCapability, "provider">> = {
  arkit: { label: "Apple ARKit", kind: "on_device_sdk", platforms: ["ios"], outputs: ["room_dimensions", "wall_surfaces", "photos"], requiresNativeApp: true, requiresVendorAccount: false },
  roomplan: { label: "Apple RoomPlan", kind: "on_device_sdk", platforms: ["ios"], outputs: ["floor_plan", "room_dimensions", "wall_surfaces"], requiresNativeApp: true, requiresVendorAccount: false },
  arcore: { label: "Google ARCore", kind: "on_device_sdk", platforms: ["android"], outputs: ["room_dimensions", "point_cloud", "photos"], requiresNativeApp: true, requiresVendorAccount: false },
  hover: { label: "Hover", kind: "vendor_api", platforms: ["ios", "android"], outputs: ["room_dimensions", "photos", "pdf_report"], requiresNativeApp: false, requiresVendorAccount: true },
  cubicasa: { label: "CubiCasa", kind: "vendor_api", platforms: ["ios", "android"], outputs: ["floor_plan", "room_dimensions", "pdf_report"], requiresNativeApp: false, requiresVendorAccount: true },
};

/** Flags: AR_<PROVIDER>_ENABLED (default off). Even when set, these adapters stay contract-only → "not_configured". */
export const arFlag = (p: ArProviderId) => process.env[`AR_${p.toUpperCase()}_ENABLED`] === "true";

function disabledAdapter(id: ArProviderId): ArAdapter {
  const no = async (): Promise<never> => { throw new ArDisabledError(id); };
  return {
    id,
    capability: () => ({ provider: id, ...CAPS[id] }),
    status: (): ArStatus => (arFlag(id) ? "not_configured" : "disabled"),
    createSession: no, getSession: no, handleWebhook: no, normalise: no, evidence: no, cancel: no,
    fallback: () => ({ mode: "manual_walkthrough", reason: `${CAPS[id].label} is not enabled. Use the guided photo walkthrough and manual measurements.` }),
  };
}

export const arAdapters: Record<ArProviderId, ArAdapter> = Object.fromEntries(arProviders.map((p) => [p, disabledAdapter(p)])) as Record<ArProviderId, ArAdapter>;
export const arSummary = () => arProviders.map((p) => ({ ...arAdapters[p].capability(), status: arAdapters[p].status(), flag: `AR_${p.toUpperCase()}_ENABLED`, flagOn: arFlag(p), fallback: arAdapters[p].fallback().mode }));
