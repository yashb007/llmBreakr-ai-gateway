import { EXPRESS_API_URL } from "@/lib/api";

// Not proxied through /api/proxy/[...path] like the admin-resource routes:
// this call authenticates with the *virtual key the admin pastes in*, not
// the admin's own session token, and needs to relay a raw SSE stream rather
// than a JSON body.
export async function POST(request: Request) {
  const { virtualKey, ...body } = await request.json();

  if (!virtualKey) {
    return Response.json({ message: "A virtual key is required" }, { status: 400 });
  }

  const upstream = await fetch(`${EXPRESS_API_URL}/api/data/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${virtualKey}`,
    },
    body: JSON.stringify({ ...body, stream: true }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(text, {
      status: upstream.status,
      headers: { "Content-Type": upstream.headers.get("Content-Type") ?? "application/json" },
    });
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
