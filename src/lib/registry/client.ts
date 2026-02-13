import { OCI_ACCEPT_HEADERS } from "@/lib/shared/constants";
import { audit } from "@/lib/audit";
import type {
  OCICatalog,
  OCIManifest,
  OCIIndex,
  OCITagList,
  RegistryConfig,
} from "./types";

interface WwwAuthChallenge {
  realm: string;
  service?: string;
  scope?: string;
}

function parseWwwAuthenticate(header: string): WwwAuthChallenge | null {
  const realmMatch = header.match(/realm="([^"]*)"/);
  if (!realmMatch) return null;

  const serviceMatch = header.match(/service="([^"]*)"/);
  const scopeMatch = header.match(/scope="([^"]*)"/);

  return {
    realm: realmMatch[1],
    service: serviceMatch?.[1],
    scope: scopeMatch?.[1],
  };
}

export class RegistryClient {
  private credentials: string; // base64(user:pass)
  private authType: string;
  private tokenCache = new Map<string, { token: string; expiresAt: number }>();

  constructor(
    private config: RegistryConfig,
    credentials: string,
    authType: string
  ) {
    this.credentials = credentials;
    this.authType = authType;
  }

  private get baseUrl() {
    return `${this.config.url}/v2`;
  }

  private async getBearerToken(challenge: WwwAuthChallenge): Promise<string> {
    const cacheKey = `${challenge.realm}|${challenge.service ?? ""}|${challenge.scope ?? ""}`;
    const cached = this.tokenCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.token;
    }

    const url = new URL(challenge.realm);
    if (challenge.service) url.searchParams.set("service", challenge.service);
    if (challenge.scope) url.searchParams.set("scope", challenge.scope);

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Basic ${this.credentials}` },
    });

    if (!res.ok) {
      throw new Error(`Bearer token fetch failed: ${res.status}`);
    }

    const body = await res.json();
    const token: string = body.token ?? body.access_token;
    if (!token) throw new Error("No token in auth response");

    const expiresIn = body.expires_in ?? 300;
    this.tokenCache.set(cacheKey, {
      token,
      expiresAt: Date.now() + expiresIn * 1000 - 10_000, // 10s safety margin
    });

    return token;
  }

  private async fetchWithAuth(
    url: string,
    init: RequestInit = {}
  ): Promise<Response> {
    // For basic auth, just send credentials directly
    if (this.authType === "basic") {
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Basic ${this.credentials}`);
      return fetch(url, { ...init, headers });
    }

    // For bearer auth: first try without token (or with cached token),
    // then handle 401 by parsing WWW-Authenticate and getting a scoped token
    const headers = new Headers(init.headers);

    // Try the request — if we get a 401, we'll use the challenge to get a token
    let res = await fetch(url, { ...init, headers });

    if (res.status === 401) {
      const wwwAuth = res.headers.get("www-authenticate");
      if (wwwAuth) {
        const challenge = parseWwwAuthenticate(wwwAuth);
        if (challenge) {
          const token = await this.getBearerToken(challenge);
          const retryHeaders = new Headers(init.headers);
          retryHeaders.set("Authorization", `Bearer ${token}`);
          res = await fetch(url, { ...init, headers: retryHeaders });
        }
      }
    }

    return res;
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
      throw new Error(`Failed to list repositories: ${res.status}`);
    }

    audit({
      action: "registry.catalog",
      registry: this.config.name,
      status: "success",
    });

    return res.json();
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
      throw new Error(`Failed to list tags for ${name}: ${res.status}`);
    }

    audit({
      action: "registry.tags",
      registry: this.config.name,
      resource: name,
      status: "success",
    });

    return res.json();
  }

  async getManifest(
    name: string,
    reference: string
  ): Promise<{ manifest: OCIManifest | OCIIndex; digest: string; contentType: string }> {
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
      throw new Error(
        `Failed to get manifest ${name}:${reference}: ${res.status}`
      );
    }

    const digest = res.headers.get("docker-content-digest") ?? "";
    const contentType = res.headers.get("content-type") ?? "";
    const manifest = await res.json();

    audit({
      action: "registry.manifest.get",
      registry: this.config.name,
      resource: `${name}:${reference}`,
      status: "success",
    });

    return { manifest, digest, contentType };
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
      throw new Error(
        `Failed to delete manifest ${name}@${digest}: ${res.status}`
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
