import "server-only";
import { upsertIntentContact } from "@/lib/crm/ghl";
import { isSuppressed } from "@/lib/ops/store";
import { dmConfig } from "./config";
import { getContact, getRecipe, saveContact, type VendorContact } from "./store";
import { ghlDestinationFor, type Recipe } from "./recipes";

/**
 * DataMoon prospect → GoHighLevel mapping (StoneCraft). Boston and Southeast Florida are SEPARATE paths:
 * a Boston recipe can only sync to GHL_LOCATION_ID_BOSTON, a Florida recipe only to GHL_LOCATION_ID_FL.
 * Prospects are third-party records:
 *  - tagged `source-datamoon`, `datamoon-prospect`, `no-auto-outreach`, region + ghl-path tags; NO consent tags;
 *    NO phone; NO opportunity; NO workflow enrolment;
 *  - only when DATAMOON_GHL_SYNC_ENABLED, the recipe has an owner CRM-sync approval and its own-market GHL
 *    destination, and the person is not suppressed (checked again at send time).
 * Without GHL_PRIVATE_TOKEN the upsert runs in dry-run mode and nothing is sent.
 */
export function vendorGhlPayload(v: VendorContact, r: Pick<Recipe, "id" | "persona" | "market" | "kind">) {
  const mk = r.market === "boston" ? "boston" : "fl";
  return {
    tags: ["brand:stonecraft", "source-datamoon", "datamoon-prospect", "no-auto-outreach", `region:${r.market === "boston" ? "greater-boston" : "southeast-florida"}`, `ghl-path:${mk}-${r.kind === "b2b" ? "commercial" : "residential"}-prospect`, `dm-recipe-${r.id.slice(0, 8)}`, `dm-persona-${r.persona}`, ...(v.synthetic ? ["sandbox-test"] : [])],
    fields: { dm_contact_id: v.contactId, dm_recipe_id: r.id, dm_import_id: v.importId, dm_provenance: "DataMoon (third-party, no opt-in)", dm_imported_at: v.importedAt, dm_state: v.state?.toUpperCase(), dm_market: r.market },
  };
}

export function syncBlockers(v: VendorContact | null, r: Recipe | null, cfg = dmConfig()): string | null {
  if (!v) return "Vendor contact not found";
  if (!r) return "Recipe not found";
  if (!cfg.ghlSyncEnabled) return "DATAMOON_GHL_SYNC_ENABLED is off";
  if (!r.crmSyncApproval) return "Recipe has no owner CRM-sync approval";
  if (!r.destinations.includes(ghlDestinationFor(r.market))) return "Recipe destination excludes its market's GHL pipeline";
  if (v.synthetic && process.env.VERCEL_ENV === "production") return "Synthetic fixtures never sync on production";
  if (!v.email) return "No email to match on (phones are never sent)";
  if (v.status === "suppressed" || v.status === "rejected" || v.status === "deleted") return `Contact status is ${v.status}`;
  return null;
}

export async function syncVendorContact(id: string): Promise<{ status: "ok" | "skipped" | "error"; detail?: string }> {
  const v = await getContact(id);
  const r = v ? await getRecipe(v.recipeId) : null;
  const block = syncBlockers(v, r);
  if (block) return { status: "skipped", detail: block };
  if (await isSuppressed({ email: v!.email, contactId: v!.contactId })) { v!.status = "suppressed"; await saveContact(v!); return { status: "skipped", detail: "suppressed" }; }
  const { tags } = vendorGhlPayload(v!, r!);
  const res = await upsertIntentContact({ email: v!.email, firstName: v!.firstName, lastName: v!.lastName, zip: v!.zip, state: r!.market === "boston" ? "MA" : "FL" }, tags);
  if (res.mode === "dry-run") return { status: "skipped", detail: "GHL not configured (dry-run payload built, nothing sent)" };
  if (res.error) return { status: "error", detail: res.error.slice(0, 300) };
  v!.status = "synced"; v!.crm = { status: "ok", contactId: res.contactId, at: new Date().toISOString() }; await saveContact(v!);
  return { status: "ok" };
}
