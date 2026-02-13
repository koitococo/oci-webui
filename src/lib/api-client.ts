import type { OCICatalog, OCITagList, OCIManifest, OCIIndex } from "./registry/types";

const BASE = "/api/registry";

async function fetchApi<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }
  return res.json();
}

export function fetchCatalog(n?: number, last?: string): Promise<OCICatalog> {
  const params = new URLSearchParams();
  if (n) params.set("n", String(n));
  if (last) params.set("last", last);
  const qs = params.toString();
  return fetchApi(`${BASE}/catalog${qs ? `?${qs}` : ""}`);
}

export function fetchTags(
  name: string,
  n?: number,
  last?: string
): Promise<OCITagList> {
  const params = new URLSearchParams({ repo: name });
  if (n) params.set("n", String(n));
  if (last) params.set("last", last);
  return fetchApi(`${BASE}/tags?${params}`);
}

export function fetchManifest(
  name: string,
  ref: string
): Promise<{ manifest: OCIManifest | OCIIndex; digest: string; contentType: string }> {
  const params = new URLSearchParams({ repo: name, ref });
  return fetchApi(`${BASE}/manifests?${params}`);
}

export function deleteManifest(
  name: string,
  digest: string
): Promise<{ ok: boolean }> {
  const params = new URLSearchParams({ repo: name, ref: digest });
  return fetchApi(`${BASE}/manifests?${params}`, {
    method: "DELETE",
  });
}

export function discoverAuth(
  registryUrl: string
): Promise<{ authType: string }> {
  return fetchApi(`${BASE}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ registryUrl }),
  });
}
