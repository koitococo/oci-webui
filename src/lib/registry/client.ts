import { OCI_ACCEPT_HEADERS } from "@/lib/shared/constants";
import { audit } from "@/lib/audit";
import type {
  AuthToken,
  OCICatalog,
  OCIManifest,
  OCIIndex,
  OCITagList,
  RegistryConfig,
} from "./types";
import { discoverAuthProvider, type AuthProvider } from "./auth-provider";

export class RegistryClient {
  private token: AuthToken;
  private provider: AuthProvider | null = null;

  constructor(
    private config: RegistryConfig,
    token: AuthToken
  ) {
    this.token = token;
  }

  private get baseUrl() {
    return `${this.config.url}/v2`;
  }

  private authHeader(): Record<string, string> {
    if (this.provider?.type === "basic") {
      return { Authorization: `Basic ${this.token.token}` };
    }
    return { Authorization: `Bearer ${this.token.token}` };
  }

  private async fetchWithAuth(
    url: string,
    init: RequestInit = {}
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    const auth = this.authHeader();
    for (const [k, v] of Object.entries(auth)) {
      headers.set(k, v);
    }

    let res = await fetch(url, { ...init, headers });

    // Auto-refresh on 401
    if (res.status === 401 && this.provider?.refreshToken) {
      this.token = await this.provider.refreshToken(this.token);
      const retryHeaders = new Headers(init.headers);
      const newAuth = this.authHeader();
      for (const [k, v] of Object.entries(newAuth)) {
        retryHeaders.set(k, v);
      }
      res = await fetch(url, { ...init, headers: retryHeaders });
    }

    return res;
  }

  async ensureProvider(): Promise<void> {
    if (!this.provider) {
      const { provider } = await discoverAuthProvider(this.config.url);
      this.provider = provider;
    }
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
