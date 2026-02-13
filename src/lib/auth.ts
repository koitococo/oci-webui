import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { discoverAuthProvider } from "@/lib/registry/auth-provider";
import { getRegistry } from "@/lib/config";
import { audit } from "@/lib/audit";

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        registryName: { label: "Registry", type: "text" },
      },
      async authorize(credentials) {
        const username = credentials.username as string;
        const password = credentials.password as string;
        const registryName = (credentials.registryName as string) || undefined;

        if (!username || !password) return null;

        try {
          const registry = getRegistry(registryName);
          const { provider } = await discoverAuthProvider(registry.url);
          const token = await provider.authenticate(username, password);

          audit({
            action: "auth.login",
            user: username,
            registry: registry.name,
            status: "success",
          });

          return {
            id: username,
            name: username,
            registryName: registry.name,
            registryToken: token.token,
            tokenExpiresAt: token.expiresAt,
            authType: provider.type,
          };
        } catch (error) {
          audit({
            action: "auth.login",
            user: username,
            status: "failure",
            detail: error instanceof Error ? error.message : "Unknown error",
          });
          return null;
        }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.registryName = (user as Record<string, unknown>).registryName as string;
        token.registryToken = (user as Record<string, unknown>).registryToken as string;
        token.tokenExpiresAt = (user as Record<string, unknown>).tokenExpiresAt as number | undefined;
        token.authType = (user as Record<string, unknown>).authType as string;
        token.username = user.name ?? user.id;
      }
      return token;
    },
    session({ session, token }) {
      session.user.name = token.username as string;
      (session as unknown as Record<string, unknown>).registryName = token.registryName;
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
});
