import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, sessionValue, tokenMatches } from "@/lib/auth";
import { rateLimit } from "@/lib/store";
import { audit } from "@/lib/audit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "0.0.0.0";
  if (!(await rateLimit(`login:${ip}`, 10, 900)).ok) return NextResponse.json({ error: "Too many attempts" }, { status: 429 });
  const form = await req.formData();
  const token = String(form.get("token") ?? "");
  const url = new URL("/admin", req.url);
  if (!tokenMatches(token)) { await audit("admin.login.failed"); url.searchParams.set("e", "1"); return NextResponse.redirect(url, 303); }
  await audit("admin.login.ok");
  const res = NextResponse.redirect(new URL("/admin/dashboard", req.url), 303);
  res.cookies.set(ADMIN_COOKIE, sessionValue(), { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/", maxAge: 60 * 60 * 12 });
  return res;
}
