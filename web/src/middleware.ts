import { NextRequest, NextResponse } from "next/server";
import { ACCESS_COOKIE, ACCESS_MAX_AGE_SECONDS, REFRESH_COOKIE } from "@/lib/constants";

const EXPRESS_API_URL = process.env.EXPRESS_API_URL ?? "http://localhost:3000";

// Decodes (does NOT verify — Express still checks the signature on every
// real request) the access token's exp claim, purely to decide whether it's
// worth trying as-is vs. refreshing first. A forged/tampered token would
// just fail Express's check downstream; this is a perf/UX shortcut, not a
// security boundary.
function isExpiredOrUnreadable(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] ?? ""));
    return typeof payload.exp !== "number" || payload.exp * 1000 < Date.now() + 5000;
  } catch {
    return true;
  }
}

// Keeps the 15-minute access token invisible to the user during a normal
// active session: if it's missing/near-expiry but the long-lived refresh
// token is still good, silently mint a fresh access token here — before the
// page or /api/proxy call ever runs — instead of letting a stale token
// surface as a 401. Can't verify tokens against Express beyond what the
// refresh call itself does, so this isn't the sole authority — lib/api.ts
// still throws a typed 401 on a genuinely dead refresh token, and
// pages/layouts redirect on that too (defense in depth).
export async function middleware(request: NextRequest) {
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const refreshToken = request.cookies.get(REFRESH_COOKIE)?.value;

  if (!refreshToken) {
    // An API route returns its own 401 JSON — redirecting an XHR to an HTML
    // login page would just break whatever was parsing the response.
    if (isApiRoute) return NextResponse.next();
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  const accessToken = request.cookies.get(ACCESS_COOKIE)?.value;
  if (accessToken && !isExpiredOrUnreadable(accessToken)) {
    return NextResponse.next();
  }

  try {
    const upstream = await fetch(`${EXPRESS_API_URL}/api/admin/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    });

    if (!upstream.ok) {
      // Refresh token itself is dead/revoked — let the request through as-is;
      // downstream 401 handling (lib/api.ts / clientFetch) takes it from here.
      return NextResponse.next();
    }

    const { access_token }: { access_token: string } = await upstream.json();
    const response = NextResponse.next();
    response.cookies.set(ACCESS_COOKIE, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: ACCESS_MAX_AGE_SECONDS,
    });
    return response;
  } catch {
    return NextResponse.next();
  }
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/virtual-keys/:path*",
    "/models/:path*",
    "/providers/:path*",
    "/projects/:path*",
    "/users-roles/:path*",
    "/logs/:path*",
    "/playground/:path*",
    "/audit-logs/:path*",
    "/profile/:path*",
    "/api/proxy/:path*",
  ],
};
