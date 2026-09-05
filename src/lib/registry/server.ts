import { getRegistry } from "@/lib/config";
import { RegistryClient } from "./client";
import type { AuthType } from "./types";

export async function getAuthedClient(): Promise<{
  client: RegistryClient;
  username: string;
}> {
  const { decode } = await import("next-auth/jwt");
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  const sessionToken =
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) throw new Error("Unauthorized");

  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not configured");

  const jwt = await decode({
    token: sessionToken,
    secret,
    salt: cookieStore.get("__Secure-authjs.session-token")
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
  });

  const registryName = jwt?.registryName;
  const authType = jwt?.authType;
  if (!registryName || !isAuthType(authType)) {
    throw new Error("Unauthorized");
  }

  const credentials = jwt.registryCredentials;
  if (authType !== "none" && !credentials) {
    throw new Error("Unauthorized");
  }

  const registry = getRegistry(registryName);
  const client = new RegistryClient(registry, credentials, authType);

  return { client, username: jwt.username as string };
}

function isAuthType(value: unknown): value is AuthType {
  return (
    value === "none" ||
    value === "basic" ||
    value === "bearer" ||
    value === "dockerhub"
  );
}
