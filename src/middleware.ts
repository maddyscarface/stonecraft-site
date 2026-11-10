import { NextResponse, type NextRequest } from "next/server";

/** Keep internal tools out of search and caches. Auth is enforced in each route/page via isAdmin(). */
export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (req.nextUrl.pathname.startsWith("/admin") || req.nextUrl.pathname.startsWith("/api")) {
    res.headers.set("X-Robots-Tag", "noindex, nofollow");
    res.headers.set("Cache-Control", "no-store");
  }
  return res;
}
export const config = { matcher: ["/admin/:path*", "/api/:path*"] };
