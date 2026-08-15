import { NextResponse } from "next/server";
import { EXPRESS_API_URL } from "@/lib/api";
import { getRefreshToken } from "@/lib/session";
import { ACCESS_COOKIE, REFRESH_COOKIE } from "@/lib/constants";

export async function POST() {
  const refreshToken = await getRefreshToken();

  if (refreshToken) {
    // Express's logout takes the refresh token directly (not a Bearer
    // access token) — it works even if the access token already expired.
    await fetch(`${EXPRESS_API_URL}/api/admin/auth/logout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
      cache: "no-store",
    }).catch(() => {
      // Best-effort — clear the local cookies regardless of upstream result.
    });
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.delete(ACCESS_COOKIE);
  response.cookies.delete(REFRESH_COOKIE);
  return response;
}
