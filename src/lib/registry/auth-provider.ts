import type { AuthToken, AuthType } from "./types";
import { BearerAuthProvider } from "./providers/bearer";
import { BasicAuthProvider } from "./providers/basic";
import { DockerHubAuthProvider } from "./providers/dockerhub";

export interface AuthProvider {
  type: AuthType;
  authenticate(username: string, password: string): Promise<AuthToken>;
  refreshToken?(token: AuthToken): Promise<AuthToken>;
}

interface AuthChallenge {
  scheme: string;
  realm?: string;
  service?: string;
  scope?: string;
}

function parseWwwAuthenticate(header: string): AuthChallenge {
  const schemeMatch = header.match(/^(\w+)\s/);
  const scheme = schemeMatch?.[1]?.toLowerCase() ?? "basic";

  const params: Record<string, string> = {};
  const paramRegex = /(\w+)="([^"]*)"/g;
  let match;
  while ((match = paramRegex.exec(header)) !== null) {
    params[match[1]] = match[2];
  }

  return {
    scheme,
    realm: params.realm,
    service: params.service,
    scope: params.scope,
  };
}

export async function discoverAuthProvider(
  registryUrl: string
): Promise<{ provider: AuthProvider; challenge?: AuthChallenge }> {
  const url = `${registryUrl}/v2/`;

  const isDockerHub =
    registryUrl.includes("registry-1.docker.io") ||
    registryUrl.includes("docker.io");

  if (isDockerHub) {
    return {
      provider: new DockerHubAuthProvider(registryUrl),
    };
  }

  try {
    const res = await fetch(url, { redirect: "follow" });

    if (res.status === 401) {
      const wwwAuth = res.headers.get("www-authenticate");
      if (wwwAuth) {
        const challenge = parseWwwAuthenticate(wwwAuth);

        if (challenge.scheme === "bearer" && challenge.realm) {
          return {
            provider: new BearerAuthProvider(
              challenge.realm,
              challenge.service,
              challenge.scope
            ),
            challenge,
          };
        }
      }

      return {
        provider: new BasicAuthProvider(registryUrl),
      };
    }

    // Registry doesn't require auth — still use Basic as fallback for write ops
    return {
      provider: new BasicAuthProvider(registryUrl),
    };
  } catch {
    return {
      provider: new BasicAuthProvider(registryUrl),
    };
  }
}
