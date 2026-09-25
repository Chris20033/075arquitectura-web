import { AdminContentError } from "./content-result";

export function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("es-MX");
}

export function slugify(value: string, fallback = "contenido") {
  const slug = value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 180)
    .replace(/-+$/g, "");

  return slug || fallback;
}

export function uniqueSlug(base: string, existing: Iterable<string>) {
  const occupied = new Set(existing);
  if (!occupied.has(base)) return base;

  let suffix = 2;
  while (occupied.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

export function requiredText(
  value: FormDataEntryValue | null,
  field: string,
  label: string,
  maxLength: number,
) {
  const text =
    typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
  if (!text) {
    throw new AdminContentError(
      "VALIDATION_ERROR",
      "Revisa los campos indicados.",
      {
        [field]: `${label} es obligatorio.`,
      },
    );
  }
  if (text.length > maxLength) {
    throw new AdminContentError(
      "VALIDATION_ERROR",
      "Revisa los campos indicados.",
      {
        [field]: `${label} admite hasta ${maxLength} caracteres.`,
      },
    );
  }
  return text;
}

export function optionalText(
  value: FormDataEntryValue | null,
  field: string,
  label: string,
  maxLength?: number,
) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return null;
  if (maxLength && text.length > maxLength) {
    throw new AdminContentError(
      "VALIDATION_ERROR",
      "Revisa los campos indicados.",
      {
        [field]: `${label} admite hasta ${maxLength} caracteres.`,
      },
    );
  }
  return text;
}

export function parseExpectedDate(value: FormDataEntryValue | null) {
  const date = new Date(typeof value === "string" ? value : "");
  if (Number.isNaN(date.getTime())) {
    throw new AdminContentError(
      "CONTENT_STALE",
      "El contenido cambió. Recarga la página antes de guardar.",
    );
  }
  return date;
}

export function parseIdList(value: FormDataEntryValue | null) {
  try {
    const parsed = JSON.parse(typeof value === "string" ? value : "[]");
    if (
      !Array.isArray(parsed) ||
      parsed.some((item) => typeof item !== "string") ||
      new Set(parsed).size !== parsed.length
    ) {
      throw new Error("invalid");
    }
    return parsed as string[];
  } catch {
    throw new AdminContentError(
      "INVALID_ORDER",
      "El orden recibido no es válido. Recarga la página e inténtalo otra vez.",
    );
  }
}

export function assertSameIds(received: string[], current: string[]) {
  if (
    received.length !== current.length ||
    received.some((id) => !current.includes(id))
  ) {
    throw new AdminContentError(
      "INVALID_ORDER",
      "La lista cambió mientras la ordenabas. Recarga la página.",
    );
  }
}
