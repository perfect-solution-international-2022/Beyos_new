import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken, type SessionRole } from "@/lib/session";

const accessRules: Array<{ prefix: string; role: SessionRole }> = [
  { prefix: "/admin", role: "admin" },
  { prefix: "/reseller", role: "reseller" },
  { prefix: "/dashboard", role: "buyer" },
];

export async function middleware(request: NextRequest) {
  const rule = accessRules.find(({ prefix }) => request.nextUrl.pathname.startsWith(prefix));
  if (!rule) return NextResponse.next();

  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const session = token ? await verifySessionToken(token) : null;
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("redirect", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(login);
  }

  if (session.role !== rule.role) {
    const destination = session.role === "admin" ? "/admin" : session.role === "reseller" ? "/reseller" : "/dashboard";
    return NextResponse.redirect(new URL(destination, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/reseller/:path*", "/dashboard/:path*"],
};
