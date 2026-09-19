import type { DefaultSession, DefaultUser } from "next-auth";

declare module "next-auth" {
  interface Session {
    user?: {
      id: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    passwordChangedAt: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sessionStartedAt?: number;
    passwordChangedAt?: number;
  }
}
