export function sanitizeAdminCallback(value: string | null | undefined) {
  if (!value) return "/admin";

  try {
    const decoded = decodeURIComponent(value);
    if (
      decoded.startsWith("/admin") &&
      !decoded.startsWith("/admin/acceso") &&
      !decoded.startsWith("//") &&
      !decoded.includes("\\")
    ) {
      return decoded;
    }
  } catch {
    return "/admin";
  }

  return "/admin";
}
