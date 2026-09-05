import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { discoverAuthProvider } from "@/lib/registry/auth-provider";
import { getRegistry } from "@/lib/config";
import { audit } from "@/lib/audit";
import type { AuthType } from "@/lib/registry/types";
export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
        registryName: { label: "Registry", type: "text" },
        anonymous: { label: "Anonymous", type: "text" },
      },
      async authorize(credentials) {
        const raw = credentials.registryName as string;
        const registryName = raw && raw !== "undefined" ? raw : undefined;
        const isAnonymous = credentials.anonymous === "true";

        try {
          const registry = getRegistry(registryName);

          if (isAnonymous) {
            audit({
              action: "auth.login",
              user: "anonymous",
              registry: registry.name,
              status: "success",
            });

            return {
              id: "anonymous",
              name: "Anonymous",
              registryName: registry.name,
              authType: "none",
            };
          }

          const username = credentials.username as string;
          const password = credentials.password as string;
          if (!username || !password) return null;

          const { provider } = await discoverAuthProvider(registry.url);
          // Validate credentials by attempting auth
          await provider.authenticate(username, password);

          audit({
            action: "auth.login",
            user: username,
            registry: registry.name,
            status: "success",
          });

          // Store base64 credentials for on-demand token fetching
          const basicCredentials = btoa(`${username}:${password}`);

          return {
            id: username,
            name: username,
            registryName: registry.name,
            registryCredentials: basicCredentials,
            authType: provider.type,
          };
        } catch (error) {
          audit({
            action: "auth.login",
            user: isAnonymous
              ? "anonymous"
              : (credentials.username as string),
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
        const userData = user as Record<string, unknown>;
        const authType = userData.authType as AuthType;

        token.registryName = userData.registryName as string;
        token.authType = authType;
        token.username = user.name ?? user.id;
        token.registryCredentials =
          authType === "none"
            ? undefined
            : (userData.registryCredentials as string);
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
