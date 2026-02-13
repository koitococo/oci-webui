import { getRegistry } from "@/lib/config";
import { RegistryClient } from "./client";

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

  if (!jwt?.registryCredentials) throw new Error("Unauthorized");

  const registry = getRegistry(jwt.registryName as string | undefined);
  const client = new RegistryClient(
    registry,
    jwt.registryCredentials,
    jwt.authType ?? "bearer"
  );

  return { client, username: jwt.username as string };
}
