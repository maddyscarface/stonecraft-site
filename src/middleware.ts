import { NextResponse, type NextRequest } from "next/server";

/**
 * Keep internal tools, thank-you pages and pre-launch market routes out of search and caches,
 * and pre-check admin access at the edge (Build 04 §5). This is defence in depth: the
 * authoritative check is isAdmin() (HMAC session / bearer token, timing-safe) inside every
 * /admin page and /api/admin route. robots.txt is not access control.
 */
export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  const hasCred = Boolean(req.cookies.get("sc_admin")?.value || req.cookies.get("sc_ops")?.value || req.headers.get("authorization"));
  // Phase 4 ops console signs in on its own page (/admin/ops) via /api/admin/ops/session.
  const opsLogin = p === "/admin/ops" || p === "/api/admin/ops/session";
  if (!hasCred && !opsLogin && p.startsWith("/api/admin/") && p !== "/api/admin/login") {
    return NextResponse.json({ error: "unauthorised" }, { status: 401, headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
  }
  if (!hasCred && !opsLogin && p.startsWith("/admin/")) {
    const res = NextResponse.redirect(new URL("/admin", req.url));
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  const res = NextResponse.next();
  // FL is owner-confirmed live (Phase 4); only MARKET_FL_PAUSED=true (kill switch) noindexes it again.
  const flPrelaunch = (process.env.MARKET_FL_PAUSED || "").trim().toLowerCase() === "true";
  const prelaunchMarket = flPrelaunch && (p === "/south-florida" || p.startsWith("/south-florida/"));
  const privateOrThankYou = p.startsWith("/admin") || p.startsWith("/api") || p === "/thank-you" || p.startsWith("/thank-you/") || p === "/walkthrough" || p.startsWith("/walkthrough/");
  if (privateOrThankYou || prelaunchMarket) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  if (privateOrThankYou) {
    res.headers.set("Cache-Control", "no-store");
  }
  if (p === "/walkthrough" || p.startsWith("/walkthrough/")) res.headers.set("Referrer-Policy", "no-referrer");
  return res;
}
export const config = { matcher: ["/admin/:path*", "/api/:path*", "/thank-you", "/thank-you/:path*", "/walkthrough", "/walkthrough/:path*", "/south-florida", "/south-florida/:path*"] };
