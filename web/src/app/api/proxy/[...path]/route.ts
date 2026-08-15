import { NextRequest, NextResponse } from "next/server";
import { getAccessToken } from "@/lib/session";
import { EXPRESS_API_URL } from "@/lib/api";

type RouteParams = { params: Promise<{ path: string[] }> };

// Generic same-origin proxy for every admin-resource read/mutation a Client
// Component needs to trigger (create/revoke a key, toggle a model, edit a
// project, etc). Resolves the access-token cookie server-side and attaches
// it as a Bearer token, so the browser only ever talks to this same-origin
// route and never sees the raw token — middleware.ts already refreshes that
// cookie before this handler runs if it was stale. The one-off BFF routes
// (auth login/logout, the playground's SSE relay) stay separate since they
// need bespoke cookie-setting/streaming logic this generic proxy doesn't.
async function proxy(request: NextRequest, { path }: { path: string[] }) {
  const token = await getAccessToken();
  const url = `${EXPRESS_API_URL}/api/admin/${path.join("/")}${request.nextUrl.search}`;

  const hasBody = !["GET", "HEAD", "DELETE"].includes(request.method);

  const upstream = await fetch(url, {
    method: request.method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: hasBody ? await request.text() : undefined,
    cache: "no-store",
  });

  const text = await upstream.text();
  return new NextResponse(text.length ? text : null, {
    status: upstream.status,
    headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
  });
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  return proxy(request, await params);
}
export async function POST(request: NextRequest, { params }: RouteParams) {
  return proxy(request, await params);
}
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return proxy(request, await params);
}
export async function PUT(request: NextRequest, { params }: RouteParams) {
  return proxy(request, await params);
}
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return proxy(request, await params);
}
