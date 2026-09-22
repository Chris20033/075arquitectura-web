import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import { database } from "@/lib/db";

import { sanitizeAdminCallback } from "./callback-url";
import { getAdminSessionCookie, usesSecureAdminCookie } from "./cookie";
import { authenticateAdmin, getClientIdentity } from "./credentials";
import { adminSessionMaxAgeSeconds, validateAdminClaims } from "./session";

export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: adminSessionMaxAgeSeconds,
  },
  jwt: {
    maxAge: adminSessionMaxAgeSeconds,
  },
  cookies: {
    sessionToken: getAdminSessionCookie(
      usesSecureAdminCookie(process.env.NEXTAUTH_URL),
    ),
  },
  pages: {
    signIn: "/admin/acceso",
    error: "/admin/acceso",
  },
  providers: [
    CredentialsProvider({
      name: "Acceso privado",
      credentials: {
        email: { label: "Correo", type: "email" },
        password: { label: "Contraseña", type: "password" },
      },
      async authorize(credentials, request) {
        const secret = process.env.AUTH_SECRET;
        if (!secret) throw new Error("AUTH_SECRET is required.");

        return authenticateAdmin(
          database,
          {
            email: credentials?.email,
            password: credentials?.password,
          },
          {
            authSecret: secret,
            clientIdentity: getClientIdentity(request),
          },
        );
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
        token.sessionStartedAt = Date.now();
        token.passwordChangedAt = user.passwordChangedAt;
      }
      return token;
    },
    async session({ session, token }) {
      const admin = await validateAdminClaims(database, token);
      if (!admin) {
        session.user = undefined;
        return session;
      }

      session.user = {
        id: admin.id,
        name: "Propietaria",
        email: admin.email,
        image: null,
      };
      return session;
    },
    async redirect({ url, baseUrl }) {
      const candidate = url.startsWith(baseUrl)
        ? url.slice(baseUrl.length)
        : url;

      if (candidate === "/admin/acceso?estado=cerrada") {
        return `${baseUrl}${candidate}`;
      }

      return `${baseUrl}${sanitizeAdminCallback(candidate)}`;
    },
  },
  logger: {
    error(code) {
      console.error(`[auth] ${code}`);
    },
    warn(code) {
      console.warn(`[auth] ${code}`);
    },
  },
};
