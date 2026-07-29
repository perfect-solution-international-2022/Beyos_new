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

  const configuredOrigin = normalizedOrigin(process.env.APP_BASE_URL);
  const requestOrigin = normalizedOrigin(request.nextUrl.origin);
  const origin = normalizedOrigin(request.headers.get("origin"));
  const refererOrigin = normalizedOrigin(request.headers.get("referer"));
  const sourceOrigin = origin || refererOrigin;
  if (!sourceOrigin) return false;

  const allowedOrigins = new Set([configuredOrigin, requestOrigin].filter((item): item is string => Boolean(item)));
  if (!allowedOrigins.has(sourceOrigin)) return false;

  // Modern browsers provide an additional signal. Reject explicit cross-site
  // requests even if a proxy supplied misleading URL headers.
  const fetchSite = request.headers.get("sec-fetch-site");
  return fetchSite !== "cross-site";
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
