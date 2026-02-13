import type { AuthProvider } from "../auth-provider";
import type { AuthToken } from "../types";

const DOCKER_AUTH_URL = "https://auth.docker.io/token";
const DOCKER_REGISTRY_SERVICE = "registry.docker.io";

export class DockerHubAuthProvider implements AuthProvider {
  type = "dockerhub" as const;

  constructor(private _registryUrl: string) {}

  async authenticate(username: string, password: string): Promise<AuthToken> {
    // First, authenticate via Docker Hub login to validate credentials
    const loginRes = await fetch("https://hub.docker.com/v2/users/login/", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    if (!loginRes.ok) {
      throw new Error(
        `DockerHub login failed: ${loginRes.status} ${loginRes.statusText}`
      );
    }

    // Then get a registry token for browsing
    const tokenUrl = new URL(DOCKER_AUTH_URL);
    tokenUrl.searchParams.set("service", DOCKER_REGISTRY_SERVICE);
    tokenUrl.searchParams.set("scope", "registry:catalog:*");

    const tokenRes = await fetch(tokenUrl.toString(), {
      headers: {
        Authorization: "Basic " + btoa(`${username}:${password}`),
      },
    });

    if (!tokenRes.ok) {
      throw new Error(
        `DockerHub token fetch failed: ${tokenRes.status} ${tokenRes.statusText}`
      );
    }

    const body = await tokenRes.json();
    const token: string = body.token ?? body.access_token;

    return {
      token,
      expiresAt: body.expires_in
        ? Date.now() + body.expires_in * 1000
        : undefined,
    };
  }
}
