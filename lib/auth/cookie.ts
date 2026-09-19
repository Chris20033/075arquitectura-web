export function getAdminSessionCookie(isProduction: boolean) {
  return {
    name: `${isProduction ? "__Secure-" : ""}next-auth.session-token`,
    options: {
      httpOnly: true,
      sameSite: "lax" as const,
      path: "/",
      secure: isProduction,
    },
  };
}
