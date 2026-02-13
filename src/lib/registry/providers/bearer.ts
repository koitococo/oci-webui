import type { AuthProvider } from "../auth-provider";
import type { AuthToken } from "../types";

export class BearerAuthProvider implements AuthProvider {
  type = "bearer" as const;

  constructor(
    private realm: string,
    private service?: string,
    private scope?: string
  ) {}

  async authenticate(username: string, password: string): Promise<AuthToken> {
    const url = new URL(this.realm);
    if (this.service) url.searchParams.set("service", this.service);
    if (this.scope) url.searchParams.set("scope", this.scope);

    const headers: Record<string, string> = {};
    if (username && password) {
      headers["Authorization"] =
        "Basic " + btoa(`${username}:${password}`);
    }

    const res = await fetch(url.toString(), { headers });

    if (!res.ok) {
      throw new Error(`Bearer auth failed: ${res.status} ${res.statusText}`);
    }

    const body = await res.json();
    const token: string = body.token ?? body.access_token;

    if (!token) {
      throw new Error("No token in auth response");
    }

    return {
      token,
      expiresAt: body.expires_in
        ? Date.now() + body.expires_in * 1000
        : undefined,
    };
  }

  async refreshToken(oldToken: AuthToken): Promise<AuthToken> {
    // Re-authenticate with same credentials is not possible without storing them.
    // The caller should re-authenticate on 401.
    return oldToken;
  }
}
