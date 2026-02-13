import { auth } from "@/lib/auth";
import { getRegistry } from "@/lib/config";
import { RegistryClient } from "./client";

export async function getAuthedClient(): Promise<{
  client: RegistryClient;
  username: string;
}> {
  const session = await auth();
  if (!session?.user?.name) {
    throw new Error("Unauthorized");
  }

  // Get the token from the JWT directly
  // We need to use the auth() internal token access
  const { encode, decode } = await import("next-auth/jwt");
  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();

  const sessionToken =
    cookieStore.get("authjs.session-token")?.value ??
    cookieStore.get("__Secure-authjs.session-token")?.value;

  if (!sessionToken) throw new Error("No session token");

  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not configured");

  const jwt = await decode({
    token: sessionToken,
    secret,
    salt: cookieStore.get("__Secure-authjs.session-token")
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
  });

  if (!jwt?.registryToken) throw new Error("No registry token in session");

  const registry = getRegistry(jwt.registryName as string | undefined);
  const client = new RegistryClient(registry, {
    token: jwt.registryToken as string,
    expiresAt: jwt.tokenExpiresAt as number | undefined,
  });
  await client.ensureProvider();

  return { client, username: jwt.username as string };
}
