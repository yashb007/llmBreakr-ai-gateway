export class ClientApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
  }
}

// All client-side reads/mutations go through the same-origin `/api/proxy/*`
// route (see app/api/proxy/[...path]/route.ts) rather than calling Express
// directly, so the session cookie stays httpOnly and is only ever attached
// server-side.
export async function clientFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers },
  });

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const json = text ? JSON.parse(text) : undefined;

  if (!res.ok) {
    const message = (json && typeof json === "object" && "message" in json && String(json.message)) || res.statusText;
    throw new ClientApiError(res.status, message);
  }

  return json as T;
}

export const swrFetcher = <T>(path: string) => clientFetch<T>(path);
