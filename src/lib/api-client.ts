import type {
  ImageConfigResponse,
  ManifestResponse,
  OCICatalog,
  OCITagList,
} from "./registry/types";
import { filterRepositoriesWithTags } from "./registry/catalog-filter";
import {
  OCI_ACCEPT_HEADERS,
  OCI_CONFIG_ACCEPT_HEADERS,
} from "./shared/constants";

const BASE = "/api/v2";

class RegistryApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "RegistryApiError";
  }
}

async function fetchResponse(url: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(url, init);
  if (!res.ok) {
    const text = await res.text();
    let message = text.trim() || res.statusText || "Request failed";
    try {
      const body: unknown = JSON.parse(text);
      if (body && typeof body === "object") {
        if ("errors" in body && Array.isArray(body.errors)) {
          const errors = body.errors.flatMap((error: unknown) => {
            if (!error || typeof error !== "object") return [];
            const code = "code" in error && typeof error.code === "string"
              ? error.code
              : "";
            const description = "message" in error && typeof error.message === "string"
              ? error.message
              : "";
            const detail = "detail" in error && error.detail != null
              ? typeof error.detail === "string" ? error.detail : JSON.stringify(error.detail)
              : "";
            const message = [code, description, detail].filter(Boolean).join(": ");
            return message ? [message] : [];
          });
          if (errors.length) message = errors.join("; ");
        } else if ("error" in body && typeof body.error === "string") {
          message = body.error;
        }
      }
    } catch {
      // Registries can return plain text or HTML errors instead of OCI JSON.
    }
    throw new RegistryApiError(`Request failed (${res.status}): ${message}`, res.status);
  }
  return res;
}

function repositoryPath(name: string): string {
  return name.split("/").map(encodeURIComponent).join("/");
}

function pagination(n?: number, last?: string): string {
  const params = new URLSearchParams();
  if (n !== undefined) params.set("n", String(n));
  if (last !== undefined) params.set("last", last);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchCatalog(n?: number, last?: string): Promise<OCICatalog> {
  const res = await fetchResponse(`${BASE}/_catalog${pagination(n, last)}`);
  const catalog: OCICatalog = await res.json();
  const repositories = await filterRepositoriesWithTags(
    catalog.repositories,
    fetchTags,
    (error) => error instanceof RegistryApiError
  );
  return { ...catalog, repositories };
}

export async function fetchTags(
  name: string,
  n?: number,
  last?: string
): Promise<OCITagList> {
  const res = await fetchResponse(
    `${BASE}/${repositoryPath(name)}/tags/list${pagination(n, last)}`
  );
  return res.json();
}

function referencePath(reference: string): string {
  // OCI registries expect the digest algorithm separator as a literal colon.
  return encodeURIComponent(reference).replaceAll("%3A", ":");
}

export async function fetchManifest(
  name: string,
  ref: string
): Promise<ManifestResponse> {
  const res = await fetchResponse(
    `${BASE}/${repositoryPath(name)}/manifests/${referencePath(ref)}`,
    { headers: { Accept: OCI_ACCEPT_HEADERS } }
  );
  return {
    manifest: await res.json(),
    digest: res.headers.get("docker-content-digest") ?? "",
    contentType: res.headers.get("content-type") ?? "",
  };
}

export async function fetchImageConfig(
  name: string,
  digest: string
): Promise<ImageConfigResponse> {
  const res = await fetchResponse(
    `${BASE}/${repositoryPath(name)}/blobs/${referencePath(digest)}`,
    { headers: { Accept: OCI_CONFIG_ACCEPT_HEADERS } }
  );
  return {
    config: await res.json(),
    contentType: res.headers.get("content-type") ?? "",
  };
}

export async function deleteManifest(
  name: string,
  digest: string
): Promise<{ ok: boolean }> {
  await fetchResponse(
    `${BASE}/${repositoryPath(name)}/manifests/${referencePath(digest)}`,
    { method: "DELETE" }
  );
  return { ok: true };
}
