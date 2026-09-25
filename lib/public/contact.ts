export function normalizeWhatsAppUrl(value: string | null) {
  if (!value) return null;

  const digits = value.replace(/\D/g, "");
  if (
    digits.length < 10 ||
    digits.length > 15 ||
    /^0+$/.test(digits) ||
    /0{6,}/.test(digits)
  ) {
    return null;
  }

  return `https://wa.me/${digits}`;
}

export function normalizeEmailUrl(value: string | null) {
  if (!value) return null;

  const email = value.trim().toLowerCase();
  const domain = email.split("@")[1];
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !domain ||
    domain.endsWith(".test") ||
    domain.endsWith(".invalid") ||
    domain === "example.com"
  ) {
    return null;
  }

  return `mailto:${email}`;
}

export function normalizeSocialUrl(value: string) {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.hostname === "example.com" ||
      url.hostname.endsWith(".test") ||
      url.hostname.endsWith(".invalid")
    ) {
      return null;
    }

    return url.toString();
  } catch {
    return null;
  }
}
