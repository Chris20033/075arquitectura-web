export const imageUploadLimits = {
  maxBytes: 20 * 1024 * 1024,
  maxImagesPerProject: 30,
  maxConcurrentUploads: 3,
  temporaryMaxAgeMs: 24 * 60 * 60 * 1_000,
  allowedFormats: ["jpeg", "png", "webp"] as const,
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"] as const,
} as const;

export const mediaVariants = [
  { name: "mobile", width: 480 },
  { name: "tablet", width: 768 },
  { name: "laptop", width: 1280 },
  { name: "desktop", width: 1920 },
  { name: "wide", width: 2560 },
] as const;

export type MediaVariantName = (typeof mediaVariants)[number]["name"];

export function isMediaVariantName(value: string): value is MediaVariantName {
  return mediaVariants.some((variant) => variant.name === value);
}

export type ImageMetadata = {
  format: string;
  width: number;
  height: number;
  bytes: number;
};

export function validateImageMetadata(metadata: ImageMetadata) {
  const format = metadata.format.toLowerCase().replace("jpg", "jpeg");
  const issues: string[] = [];
  if (!(imageUploadLimits.allowedFormats as readonly string[]).includes(format))
    issues.push("El formato debe ser JPEG, PNG o WebP.");
  if (
    !Number.isSafeInteger(metadata.bytes) ||
    metadata.bytes <= 0 ||
    metadata.bytes > imageUploadLimits.maxBytes
  )
    issues.push("La imagen debe pesar como máximo 20 MB.");
  if (
    !Number.isSafeInteger(metadata.width) ||
    !Number.isSafeInteger(metadata.height) ||
    metadata.width <= 0 ||
    metadata.height <= 0
  )
    issues.push("Las dimensiones de la imagen no son válidas.");
  return issues;
}
