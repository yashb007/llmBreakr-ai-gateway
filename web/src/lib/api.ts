import "server-only";
import { getAccessToken } from "./session";

const BASE_URL = process.env.EXPRESS_API_URL ?? "http://localhost:3000";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(status: number, message: string, body?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

interface ApiFetchOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /** Overrides the access-token cookie's bearer token — used for data-plane calls made with a pasted virtual key. */
  token?: string;
}

// Single fetch helper used by every Server Component and internal Route
// Handler to call the Express API. Resolves the admin access token from the
// httpOnly cookie server-side so it's never exposed to client JS; callers
// special-case ApiError.status (401 -> redirect to login, 403 -> friendly
// access-denied panel) rather than letting a generic error boundary fire.
// A 401 here means the access token AND the refresh token are both gone/
// invalid — middleware.ts already transparently refreshes the access token
// on every request when only it has expired, so by the time a request
// reaches here a 401 means genuinely logged out, not just "token is stale".
export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const { body, token, headers, ...rest } = options;
  const authToken = token ?? (await getAccessToken());

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (res.status === 204) {
    return undefined as T;
  }

  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message =
      (json && typeof json === "object" && "message" in json && String(json.message)) || res.statusText;
    throw new ApiError(res.status, message, json);
  }

  return json as T;
}

export { BASE_URL as EXPRESS_API_URL };

// Shared by Server Component pages: no "my effective permissions" endpoint
// exists on the backend, so pages find out they're forbidden the same way a
// request would — by trying the fetch and reading the status back.
export function classifyApiError(error: unknown): "unauthorized" | "forbidden" | null {
  if (error instanceof ApiError) {
    if (error.status === 401) return "unauthorized";
    if (error.status === 403) return "forbidden";
  }
  return null;
}
