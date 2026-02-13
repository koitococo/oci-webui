import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    registryName: string;
    user: {
      name: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    username?: string;
    registryName?: string;
    registryCredentials?: string;
    authType?: string;
  }
}
