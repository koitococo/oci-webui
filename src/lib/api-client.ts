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
  const params = new URLSearchParams();
  if (n) params.set("n", String(n));
  if (last) params.set("last", last);
  const qs = params.toString();
  return fetchApi(`${BASE}/${name}/tags${qs ? `?${qs}` : ""}`);
}

export function fetchManifest(
  name: string,
  ref: string
): Promise<{ manifest: OCIManifest | OCIIndex; digest: string; contentType: string }> {
  return fetchApi(`${BASE}/${name}/manifests/${ref}`);
}

export function deleteManifest(
  name: string,
  digest: string
): Promise<{ ok: boolean }> {
  return fetchApi(`${BASE}/${name}/manifests/${digest}`, {
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
