import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionRole } from "@/lib/session";

const accessRules: Array<{ prefix: string; role: SessionRole }> = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/reseller", role: "reseller" },
  { prefix: "/dashboard", role: "buyer" },
];

const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CSRF_EXEMPT_PATHS = new Set([
  // OnePay calls this endpoint from its own servers. The callback payload is
  // not trusted: the handler independently verifies the transaction with
  // OnePay before changing payment state.
  "/api/payments/onepay/callback",
  // This endpoint is called by the server's cron job and verifies its own
  // bearer secret before doing any work. A cron job does not send a browser
  // Origin/Referer header, so the normal browser CSRF check cannot apply.
  "/api/internal/courier-sync",
]);

function normalizedOrigin(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

function csrfAllowed(request: NextRequest): boolean {
  if (!request.nextUrl.pathname.startsWith("/api/") || !UNSAFE_METHODS.has(request.method)) return true;
  if (CSRF_EXEMPT_PATHS.has(request.nextUrl.pathname)) return true;

  // Sec-Fetch-Site is set by the browser itself and can't be stripped by the
  // page or a same-site request, so trust an explicit verdict from it first.
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite === "cross-site") return false;
  if (fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none") return true;

  const configuredOrigin = normalizedOrigin(process.env.APP_BASE_URL);
  const requestOrigin = normalizedOrigin(request.nextUrl.origin);
  const origin = normalizedOrigin(request.headers.get("origin"));
  const refererOrigin = normalizedOrigin(request.headers.get("referer"));
  const sourceOrigin = origin || refererOrigin;

  // No Sec-Fetch-Site (older browser) and no Origin/Referer: some browsers,
  // antivirus "web shields", and corporate proxies strip these for legitimate
  // requests too, so their absence isn't proof of a forged request. The
  // session cookie's SameSite=Lax attribute is the real backstop here - it
  // simply won't be attached to an actual cross-site request.
  if (!sourceOrigin) return true;

  const allowedOrigins = new Set([configuredOrigin, requestOrigin].filter((item): item is string => Boolean(item)));
  return allowedOrigins.has(sourceOrigin);
}

export async function middleware(request: NextRequest) {
  if (!csrfAllowed(request)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  const rule = accessRules.find(({ prefix }) => request.nextUrl.pathname.startsWith(prefix));
  if (!rule) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    const response = NextResponse.redirect(login);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  if (session.role !== rule.role) {
    const destination = session.role === "admin" ? "/admin" : session.role === "reseller" ? "/reseller" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*", "/admin/:path*", "/reseller/:path*", "/dashboard/:path*"],
};
