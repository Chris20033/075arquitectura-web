import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import {
  getAdminSessionCookie,
  usesSecureAdminCookie,
} from "@/lib/auth/cookie";
import { isAdminTokenWithinAbsoluteLifetime } from "@/lib/auth/session";

export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === "/admin/acceso") {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  const cookieName = getAdminSessionCookie(
    usesSecureAdminCookie(process.env.NEXTAUTH_URL),
  ).name;
  const token = secret
    ? await getToken({ req: request, secret, cookieName })
    : null;

  if (token && isAdminTokenWithinAbsoluteLifetime(token)) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/admin/acceso", request.url);
  loginUrl.searchParams.set(
    "callbackUrl",
    `${request.nextUrl.pathname}${request.nextUrl.search}`,
  );
  loginUrl.searchParams.set("estado", "sesion");
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*"],
};
