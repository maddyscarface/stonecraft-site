import { handleExportWebhook } from "@/lib/datamoon/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * ONE organisation-wide DataMoon intent `export.ready` endpoint. 404 unless DATAMOON_ENABLED, DATAMOON_INTENT_ENABLED
 * and DATAMOON_INTENT_WEBHOOK_SECRET are set. Signature is verified on the RAW body before parsing; processing is
 * queued to the outbox and we acknowledge quickly (DataMoon expects a 2xx within 10 s).
 */
export async function POST(req: Request) {
  const raw = await req.text();
  if (raw.length > 64 * 1024) return Response.json({ ok: false, error: "Payload too large" }, { status: 413 });
  const [status, body] = await handleExportWebhook(raw, {
    id: req.headers.get("webhook-id"), timestamp: req.headers.get("webhook-timestamp"), signature: req.headers.get("webhook-signature"),
  });
  return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } });
}
