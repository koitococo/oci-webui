import { parseWwwAuthenticate, type AuthChallenge } from "./auth-provider";
import type { AuthType, RegistryConfig } from "./types";

const HOP_BY_HOP_HEADERS = [
  "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
  "te", "trailer", "transfer-encoding", "upgrade",
];

function endToEndHeaders(source: Headers): Headers {
  const headers = new Headers(source);
  for (const name of source.get("connection")?.split(",") ?? []) {
    headers.delete(name.trim());
  }
  for (const name of HOP_BY_HOP_HEADERS) headers.delete(name);
  return headers;
}

export class RegistryClient {
  constructor(
    private config: RegistryConfig,
    private credentials: string | undefined,
    private authType: AuthType
  ) {}

  private async getBearerToken(challenge: AuthChallenge): Promise<string> {
    if (!challenge.realm) throw new Error("Bearer challenge missing token realm");
    const url = new URL(challenge.realm);
    if (challenge.service) url.searchParams.set("service", challenge.service);
    if (challenge.scope) url.searchParams.set("scope", challenge.scope);
    const headers = new Headers();
    if (this.credentials) headers.set("Authorization", `Basic ${this.credentials}`);
    const response = await fetch(url, { headers, cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Bearer token fetch failed: ${response.status}`);
    }
    const body: unknown = await response.json();
    const record = body !== null && typeof body === "object"
      ? (body as Record<string, unknown>) : undefined;
    const token = record?.token ?? record?.access_token;
    if (typeof token !== "string" || token.length === 0) {
      throw new Error("No token in auth response");
    }
    return token;
  }

  async proxy(request: Request): Promise<Response> {
    // Use the raw URL path, not decoded catch-all params, to retain OCI names.
    const incoming = new URL(request.url);
    const suffix = incoming.pathname.slice("/api/v2".length);
    const url = `${this.config.url}/v2${suffix}${incoming.search}`;
    const headers = endToEndHeaders(request.headers);
    for (const name of ["authorization", "cookie", "host", "content-length"]) {
      headers.delete(name);
    }
    headers.set("accept-encoding", "identity");
    if (this.authType === "basic") {
      if (!this.credentials) throw new Error("Basic authentication requires credentials");
      headers.set("authorization", `Basic ${this.credentials}`);
    }
    const init: RequestInit = {
      method: request.method,
      headers,
      cache: "no-store",
      signal: request.signal,
      // Native fetch follows blob redirects and strips Authorization on cross-origin hops.
      redirect: "follow",
    };
    let response = await fetch(url, init);
    if (response.status === 401 && this.authType !== "basic") {
      const authenticate = response.headers.get("www-authenticate");
      if (authenticate) {
        const challenge = parseWwwAuthenticate(authenticate);
        if (challenge.scheme === "bearer" && challenge.realm) {
          await response.body?.cancel();
          const token = await this.getBearerToken(challenge);
          headers.set("authorization", `Bearer ${token}`);
          response = await fetch(url, init);
        }
      }
    }
    const responseHeaders = endToEndHeaders(response.headers);
    // Undici decodes compressed bodies without adjusting these upstream headers.
    if (responseHeaders.has("content-encoding")) {
      responseHeaders.delete("content-encoding");
      responseHeaders.delete("content-length");
    }
    responseHeaders.delete("set-cookie");
    return new Response(request.method === "HEAD" ? null : response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  }
}
