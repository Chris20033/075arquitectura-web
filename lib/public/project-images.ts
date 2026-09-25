import "server-only";

import { MediaStorageKind } from "@/generated/prisma/enums";
import type { StoredVariant } from "@/lib/media/processor";

export type PublicImageVariant = Pick<
  StoredVariant,
  "name" | "width" | "height"
>;

export type PublicProjectImage = {
  kind: "bundled" | "managed";
  src: string;
  width: number;
  height: number;
  alt: string;
  position: number;
  isCover: boolean;
  variants: PublicImageVariant[];
};

export type ProjectImageRecord = {
  mediaKey: string;
  storageKind: MediaStorageKind;
  storageKey: string;
  variants: unknown;
  width: number;
  height: number;
  altText: string | null;
  position: number;
  isCover: boolean;
};

export class PublicImageConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicImageConfigurationError";
  }
}

export function parsePublicVariants(value: unknown): PublicImageVariant[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter(
      (item): item is StoredVariant =>
        Boolean(item) &&
        typeof item === "object" &&
        "name" in item &&
        "width" in item &&
        "height" in item &&
        typeof item.name === "string" &&
        typeof item.width === "number" &&
        typeof item.height === "number",
    )
    .map(({ name, width, height }) => ({ name, width, height }));
}

export function resolvePublicProjectImage(
  image: ProjectImageRecord,
): PublicProjectImage {
  const alt = image.altText?.trim();
  if (!alt || image.width <= 0 || image.height <= 0)
    throw new PublicImageConfigurationError(
      "Project image is missing public rendering metadata.",
    );

  if (image.storageKind === MediaStorageKind.BUNDLED) {
    return {
      kind: "bundled",
      src: image.storageKey,
      width: image.width,
      height: image.height,
      alt,
      position: image.position,
      isCover: image.isCover,
      variants: [],
    };
  }

  const variants = parsePublicVariants(image.variants);
  if (variants.length === 0)
    throw new PublicImageConfigurationError(
      "Managed image is missing WebP variants.",
    );
  return {
    kind: "managed",
    src: `/media/${image.mediaKey}/__variant__`,
    width: image.width,
    height: image.height,
    alt,
    position: image.position,
    isCover: image.isCover,
    variants,
  };
}

export function selectPublicVariant(
  image: PublicProjectImage,
  requestedWidth: number,
) {
  if (image.kind === "bundled" || image.variants.length === 0) return null;
  return (
    image.variants.find((variant) => variant.width >= requestedWidth) ??
    image.variants.at(-1)!
  );
}

export function getPublicImageUrl(
  image: PublicProjectImage,
  requestedWidth = 1280,
) {
  const variant = selectPublicVariant(image, requestedWidth);
  return variant ? image.src.replace("__variant__", variant.name) : image.src;
}
