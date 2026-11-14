import { timingSafeEqual } from "node:crypto";
import { processDue } from "@/lib/ops/outbox";
import { handlers } from "@/lib/ops/handlers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Outbox worker for a scheduler (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`). 404 until CRON_SECRET is set. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET || "";
  if (secret.length < 16) return Response.json({ ok: false, error: "Worker disabled" }, { status: 404 });
  const got = Buffer.from((req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "")), exp = Buffer.from(secret);
  if (got.length !== exp.length || !timingSafeEqual(got, exp)) return Response.json({ ok: false }, { status: 401 });
  const r = await processDue(handlers);
  return Response.json({ ok: true, processed: r.processed, done: r.done, failed: r.failed }, { headers: { "Cache-Control": "no-store" } });
}
