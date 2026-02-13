import type { AuthProvider } from "../auth-provider";
import type { AuthToken } from "../types";

export class BasicAuthProvider implements AuthProvider {
  type = "basic" as const;

  constructor(private registryUrl: string) {}

  async authenticate(username: string, password: string): Promise<AuthToken> {
    const token = btoa(`${username}:${password}`);

    // Verify credentials by hitting /v2/
    const res = await fetch(`${this.registryUrl}/v2/`, {
      headers: { Authorization: `Basic ${token}` },
    });

    if (!res.ok && res.status !== 404) {
      throw new Error(`Basic auth failed: ${res.status} ${res.statusText}`);
    }

    return { token };
  }
}
