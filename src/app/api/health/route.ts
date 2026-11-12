import { NextResponse } from "next/server";
import { kvConfigured, memoryStoreBlocked, productionOverrideIgnored } from "@/lib/store";
import { localUploadsAllowed, supabaseConfigured } from "@/lib/photos";

export const dynamic = "force-dynamic";

/**
 * Reports which integrations have credentials present. "configured" ≠ "working": verify each one
 * end-to-end with the QA / launch checklist before going live. Booleans only — never secret values.
 */
export function GET() {
  const e = process.env;
  return NextResponse.json({
    ok: !memoryStoreBlocked(),
    configured: {
      storage_upstash: kvConfigured,
      ghl: Boolean(e.GHL_PRIVATE_TOKEN && (e.GHL_LOCATION_ID_BOSTON || e.GHL_LOCATION_ID_FL)),
      crm_webhook_secret: Boolean(e.CRM_WEBHOOK_SECRET),
      meta_capi: Boolean(e.META_PIXEL_ID && e.META_CAPI_TOKEN),
      gtm: Boolean(e.NEXT_PUBLIC_GTM_ID),
      turnstile: Boolean(e.TURNSTILE_SECRET_KEY),
      resend: Boolean(e.RESEND_API_KEY),
      openai_pixel: Boolean(e.NEXT_PUBLIC_OPENAI_PIXEL_ID),
      openai_capi: Boolean(e.OPENAI_ADS_PIXEL_ID && e.OPENAI_ADS_API_KEY),
      openai_validate_only: e.OPENAI_ADS_VALIDATE_ONLY !== "false",
    },
    environment: e.VERCEL_ENV ?? e.NODE_ENV,
    lead_intake: memoryStoreBlocked() ? "blocked: durable storage (Upstash) not configured in production" : kvConfigured ? "ok: durable" : "ok: in-memory (non-production only, data is not retained)",
    photo_storage: supabaseConfigured ? "ok: durable" : localUploadsAllowed() ? "in-memory (non-production only)" : "blocked: Supabase Storage not configured",
    production_override_ignored: productionOverrideIgnored(),
    note: "Credentials present does not mean the integration is verified. See docs/18-qa-deploy.md.",
  });
}
