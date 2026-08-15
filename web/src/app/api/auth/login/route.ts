import { NextResponse } from "next/server";
import { EXPRESS_API_URL } from "@/lib/api";
import { ACCESS_COOKIE, ACCESS_MAX_AGE_SECONDS, REFRESH_COOKIE, REFRESH_MAX_AGE_SECONDS } from "@/lib/constants";
import type { User } from "@/types/api";

// BFF proxy: forwards credentials to Express, then re-homes both tokens it
// returns into httpOnly cookies so neither reaches client JS. Only the
// public user object is returned to the browser.
export async function POST(request: Request) {
  const body = await request.json();

  const upstream = await fetch(`${EXPRESS_API_URL}/api/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  const json = await upstream.json();

  if (!upstream.ok) {
    return NextResponse.json({ message: json?.message ?? "Login failed" }, { status: upstream.status });
  }

  const { access_token, refresh_token, user }: { access_token: string; refresh_token: string; user: User } = json;
  const response = NextResponse.json({ user });
  const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  response.cookies.set(ACCESS_COOKIE, access_token, { ...cookieBase, maxAge: ACCESS_MAX_AGE_SECONDS });
  response.cookies.set(REFRESH_COOKIE, refresh_token, { ...cookieBase, maxAge: REFRESH_MAX_AGE_SECONDS });
  return response;
}
