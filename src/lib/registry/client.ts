import {
  OCI_ACCEPT_HEADERS,
  OCI_CONFIG_ACCEPT_HEADERS,
} from "../shared/constants";
import { audit } from "../audit";
import { parseWwwAuthenticate, type AuthChallenge } from "./auth-provider";
import type {
  AuthType,
  ImageConfigResponse,
  ManifestResponse,
  OCICatalog,
  OCIImageConfig,
  OCIManifest,
  OCIIndex,
  OCITagList,
  RegistryConfig,
} from "./types";

export class RegistryRequestError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "RegistryRequestError";
    this.status = status;
  }
}

export class RegistryClient {
  private credentials: string | undefined;
  private authType: AuthType;
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  constructor(
    private config: RegistryConfig,
    credentials: string | undefined,
    authType: AuthType
  ) {
    this.credentials = credentials;
    this.authType = authType;
  }

  private get baseUrl() {
    return `${this.config.url}/v2`;
  }

  private async getBearerToken(challenge: AuthChallenge): Promise<string> {
    if (!challenge.realm) {
      throw new Error("Bearer challenge missing token realm");
    }

    const cacheKey = `${challenge.realm}|${challenge.service ?? ""}|${challenge.scope ?? ""}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const url = new URL(challenge.realm);
    if (challenge.service) url.searchParams.set("service", challenge.service);
    if (challenge.scope) url.searchParams.set("scope", challenge.scope);

    const headers = new Headers();
    if (this.credentials) {
      headers.set("Authorization", `Basic ${this.credentials}`);
    }

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      throw new RegistryRequestError(
        `Bearer token fetch failed: ${res.status}`,
        res.status
      );
    }

    const body: unknown = await res.json();
    const bodyRecord =
      body !== null && typeof body === "object"
        ? (body as Record<string, unknown>)
        : undefined;
    const token = bodyRecord?.token ?? bodyRecord?.access_token;
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("No token in auth response");
    }

    const expiresIn = bodyRecord?.expires_in;
    const expiresInSeconds =
      typeof expiresIn === "number" && Number.isFinite(expiresIn)
        ? expiresIn
        : 300;
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + expiresInSeconds * 1000 - 10_000,
    });

    return token;
  }

  private async fetchWithAuth(
    url: string,
    init: RequestInit = {}
  ): Promise<Response> {
    if (this.authType === "basic") {
      if (!this.credentials) {
        throw new Error("Basic authentication requires credentials");
      }

      const headers = new Headers(init.headers);
      headers.set("Authorization", `Basic ${this.credentials}`);
      return fetch(url, { ...init, headers });
    }

    const headers = new Headers(init.headers);
    headers.delete("Authorization");
    const res = await fetch(url, { ...init, headers });

    if (res.status !== 401) {
      return res;
    }

    const wwwAuth = res.headers.get("www-authenticate");
    if (!wwwAuth) {
      return res;
    }

    const challenge = parseWwwAuthenticate(wwwAuth);
    if (challenge.scheme !== "bearer" || !challenge.realm) {
      return res;
    }

    const token = await this.getBearerToken(challenge);
    const retryHeaders = new Headers(init.headers);
    retryHeaders.delete("Authorization");
    retryHeaders.set("Authorization", `Bearer ${token}`);

    return fetch(url, { ...init, headers: retryHeaders });
  }

  async listRepositories(n?: number, last?: string): Promise<OCICatalog> {
    const url = new URL(`${this.baseUrl}/_catalog`);
    if (n) url.searchParams.set("n", String(n));
    if (last) url.searchParams.set("last", last);

    const res = await this.fetchWithAuth(url.toString());
    if (!res.ok) {
      audit({
        action: "registry.catalog",
        registry: this.config.name,
        status: "failure",
        detail: `${res.status}`,
      });
      throw new RegistryRequestError(
        `Failed to list repositories: ${res.status}`,
        res.status
      );
    }

    audit({
      action: "registry.catalog",
      registry: this.config.name,
      status: "success",
    });

    return (await res.json()) as OCICatalog;
  }

  async listTags(name: string, n?: number, last?: string): Promise<OCITagList> {
    const url = new URL(`${this.baseUrl}/${name}/tags/list`);
    if (n) url.searchParams.set("n", String(n));
    if (last) url.searchParams.set("last", last);

    const res = await this.fetchWithAuth(url.toString());
    if (!res.ok) {
      audit({
        action: "registry.tags",
        registry: this.config.name,
        resource: name,
        status: "failure",
        detail: `${res.status}`,
      });
      throw new RegistryRequestError(
        `Failed to list tags for ${name}: ${res.status}`,
        res.status
      );
    }

    audit({
      action: "registry.tags",
      registry: this.config.name,
      resource: name,
      status: "success",
    });

    return (await res.json()) as OCITagList;
  }

  async getManifest(name: string, reference: string): Promise<ManifestResponse> {
    const url = `${this.baseUrl}/${name}/manifests/${reference}`;

    const res = await this.fetchWithAuth(url, {
      headers: { Accept: OCI_ACCEPT_HEADERS },
    });

    if (!res.ok) {
      audit({
        action: "registry.manifest.get",
        registry: this.config.name,
        resource: `${name}:${reference}`,
        status: "failure",
        detail: `${res.status}`,
      });
      throw new RegistryRequestError(
        `Failed to get manifest ${name}:${reference}: ${res.status}`,
        res.status
      );
    }

    const digest = res.headers.get("docker-content-digest") ?? "";
    const contentType = res.headers.get("content-type") ?? "";
    const manifest = (await res.json()) as OCIManifest | OCIIndex;

    audit({
      action: "registry.manifest.get",
      registry: this.config.name,
      resource: `${name}:${reference}`,
      status: "success",
    });

    return { manifest, digest, contentType };
  }

  async getImageConfig(
    name: string,
    digest: string
  ): Promise<ImageConfigResponse> {
    const resource = `${name}@${digest}`;
    const url = `${this.baseUrl}/${name}/blobs/${digest}`;
    let res: Response;

    try {
      res = await this.fetchWithAuth(url, {
        headers: { Accept: OCI_CONFIG_ACCEPT_HEADERS },
      });
    } catch (error) {
      audit({
        action: "registry.config.get",
        registry: this.config.name,
        resource,
        status: "failure",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }

    if (!res.ok) {
      audit({
        action: "registry.config.get",
        registry: this.config.name,
        resource,
        status: "failure",
        detail: `${res.status}`,
      });
      throw new RegistryRequestError(
        `Failed to get image config ${resource}: ${res.status}`,
        res.status
      );
    }

    try {
      const config = (await res.json()) as OCIImageConfig;
      const contentType = res.headers.get("content-type") ?? "";

      audit({
        action: "registry.config.get",
        registry: this.config.name,
        resource,
        status: "success",
      });

      return { config, contentType };
    } catch (error) {
      audit({
        action: "registry.config.get",
        registry: this.config.name,
        resource,
        status: "failure",
        detail: error instanceof Error ? error.message : "Unknown error",
      });
      throw error;
    }
  }

  async deleteManifest(name: string, digest: string): Promise<void> {
    const url = `${this.baseUrl}/${name}/manifests/${digest}`;

    const res = await this.fetchWithAuth(url, { method: "DELETE" });

    if (!res.ok) {
      audit({
        action: "registry.manifest.delete",
        registry: this.config.name,
        resource: `${name}@${digest}`,
        status: "failure",
        detail: `${res.status}`,
      });
      throw new RegistryRequestError(
        `Failed to delete manifest ${name}@${digest}: ${res.status}`,
        res.status
      );
    }

    audit({
      action: "registry.manifest.delete",
      registry: this.config.name,
      resource: `${name}@${digest}`,
      status: "success",
    });
  }
}
