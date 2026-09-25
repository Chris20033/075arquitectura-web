export function getAdminSessionCookie(isSecure: boolean) {
  return {
    name: `${isSecure ? "__Secure-" : ""}next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: isSecure,
    },
  };
}

export function usesSecureAdminCookie(
  nextAuthUrl: string | undefined,
  environment: string | undefined = process.env.NODE_ENV,
) {
  if (nextAuthUrl) {
    try {
      return new URL(nextAuthUrl).protocol === "https:";
    } catch {
      // Fall through to the safe production default.
    }
  }

  return environment === "production";
}
