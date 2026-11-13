import { NextResponse, type NextRequest } from "next/server";

/**
 * Keep internal tools, thank-you pages and pre-launch market routes out of search and caches,
 * and pre-check admin access at the edge (Build 04 §5). This is defence in depth: the
 * authoritative check is isAdmin() (HMAC session / bearer token, timing-safe) inside every
 * /admin page and /api/admin route. robots.txt is not access control.
 */
export function middleware(req: NextRequest) {
  const p = req.nextUrl.pathname;
  const hasCred = Boolean(req.cookies.get("sc_admin")?.value || req.headers.get("authorization"));
  if (!hasCred && p.startsWith("/api/admin/") && p !== "/api/admin/login") {
    return NextResponse.json({ error: "unauthorised" }, { status: 401, headers: { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" } });
  }
  if (!hasCred && p.startsWith("/admin/")) {
    const res = NextResponse.redirect(new URL("/admin", req.url));
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    return res;
  }
  const res = NextResponse.next();
  const flPrelaunch = (process.env.MARKET_FL_STATUS ?? "pre-launch") !== "live";
  const prelaunchMarket = flPrelaunch && (p === "/south-florida" || p.startsWith("/south-florida/"));
  const privateOrThankYou = p.startsWith("/admin") || p.startsWith("/api") || p === "/thank-you" || p.startsWith("/thank-you/");
  if (privateOrThankYou || prelaunchMarket) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  if (privateOrThankYou) {
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}
export const config = { matcher: ["/admin/:path*", "/api/:path*", "/thank-you", "/thank-you/:path*", "/south-florida", "/south-florida/:path*"] };
