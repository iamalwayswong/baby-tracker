// Tiny fetch wrapper for client components.
export async function api<T = any>(path: string, opts?: RequestInit & { json?: unknown }): Promise<T> {
  const init: RequestInit = { ...opts, headers: { ...(opts?.headers || {}) } };
  if (opts?.json !== undefined) {
    init.method = init.method || "POST";
    init.headers = { ...init.headers, "content-type": "application/json" };
    init.body = JSON.stringify(opts.json);
  }
  const res = await fetch(path, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error || `Request failed (${res.status})`);
  return body as T;
}
