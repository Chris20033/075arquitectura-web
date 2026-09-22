import "server-only";

export function getSiteUrl(
  value = process.env.SITE_URL ?? process.env.NEXTAUTH_URL,
) {
  const fallback = "http://localhost:3000";
  const candidate = value?.trim() || fallback;

  try {
    const url = new URL(candidate);
    if (url.protocol !== "http:" && url.protocol !== "https:") {
      return new URL(fallback);
    }
    return new URL(url.origin);
  } catch {
    return new URL(fallback);
  }
}
