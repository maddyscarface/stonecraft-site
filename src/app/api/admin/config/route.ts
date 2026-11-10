import { NextResponse, type NextRequest } from "next/server";
import { isAdmin } from "@/lib/auth";
import { kvGet, kvSet } from "@/lib/store";
import { draftPriceSheets } from "@/config/pricing";
import { defaultScoring } from "@/lib/leads/scoring";

const KEYS = { scoring: "cfg:scoring", "pricing:boston": "cfg:pricing:boston", "pricing:south-florida": "cfg:pricing:south-florida" } as const;
type K = keyof typeof KEYS;
const defaults: Record<K, unknown> = { scoring: defaultScoring, "pricing:boston": draftPriceSheets[0], "pricing:south-florida": draftPriceSheets[1] };

export async function GET(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const k = req.nextUrl.searchParams.get("key") as K;
  if (!KEYS[k]) return NextResponse.json({ error: "unknown key" }, { status: 400 });
  return NextResponse.json({ key: k, value: (await kvGet(KEYS[k])) ?? defaults[k], overridden: !!(await kvGet(KEYS[k])) });
}

export async function PUT(req: NextRequest) {
  if (!(await isAdmin())) return NextResponse.json({ error: "unauthorised" }, { status: 401 });
  const { key, value } = (await req.json()) as { key: K; value: unknown };
  if (!KEYS[key] || typeof value !== "object" || !value) return NextResponse.json({ error: "invalid" }, { status: 400 });
  await kvSet(KEYS[key], value);
  return NextResponse.json({ ok: true });
}
