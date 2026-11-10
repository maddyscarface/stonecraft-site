import { NextResponse } from "next/server";
import { kvConfigured, memoryStoreBlocked } from "@/lib/store";

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
    lead_intake: memoryStoreBlocked() ? "blocked: Upstash not configured in production" : "ok",
    note: "Credentials present does not mean the integration is verified. See docs/18-qa-deploy.md.",
  });
}
