import "server-only";

import { getContentMode } from "./landing";

const DEMO_IMAGE_SOURCES: Record<string, string> = {
  "075arquitectura/demo/casa-luz-cover":
    "/images/concept/courtyard-house-demo.webp",
  "075arquitectura/demo/casa-luz-gallery":
    "/images/concept/stair-interior-demo.webp",
  "075arquitectura/demo/patio-tierra-cover":
    "/images/concept/brick-pavilion-demo.webp",
  "075arquitectura/demo/patio-tierra-gallery":
    "/images/concept/patio-tierra-detail-demo.webp",
  "075arquitectura/demo/casa-umbral-cover":
    "/images/concept/casa-umbral-cover-demo.webp",
  "075arquitectura/demo/casa-umbral-gallery":
    "/images/concept/casa-umbral-stair-demo.webp",
};

export type PublicProjectImage = {
  kind: "local" | "cloudinary";
  src: string;
  width: number;
  height: number;
  alt: string;
  position: number;
  isCover: boolean;
};

export type ProjectImageRecord = {
  cloudinaryPublicId: string;
  cloudinaryVersion: bigint;
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

function encodePublicId(publicId: string) {
  return publicId.split("/").map(encodeURIComponent).join("/");
}

export function getCloudinaryCloudName(value = process.env.CLOUDINARY_URL) {
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value);
    if (url.protocol !== "cloudinary:" || !url.hostname) {
      return null;
    }
    return url.hostname;
  } catch {
    return null;
  }
}

export function buildCloudinaryImageTemplate(input: {
  cloudName: string;
  publicId: string;
  version: bigint | number | string;
}) {
  const cloudName = encodeURIComponent(input.cloudName);
  const publicId = encodePublicId(input.publicId);
  const version = String(input.version);

  if (!/^\d+$/.test(version)) {
    throw new PublicImageConfigurationError(
      "Cloudinary image version must be numeric.",
    );
  }

  return `https://res.cloudinary.com/${cloudName}/image/upload/c_limit,w_auto/f_auto/q_auto/v${version}/${publicId}`;
}

export function resolveImageWidth(sourceWidth: number, requestedWidth: number) {
  const safeSourceWidth = Math.max(1, Math.round(sourceWidth));
  const safeRequestedWidth = Math.max(1, Math.round(requestedWidth));
  return Math.min(safeSourceWidth, safeRequestedWidth);
}

export function resolveCloudinaryImageUrl(
  template: string,
  sourceWidth: number,
  requestedWidth: number,
) {
  return template.replace(
    "w_auto",
    `w_${resolveImageWidth(sourceWidth, requestedWidth)}`,
  );
}

export function resolvePublicProjectImage(
  image: ProjectImageRecord,
  options: {
    mode?: "demo" | "live";
    cloudinaryUrl?: string;
  } = {},
): PublicProjectImage {
  const alt = image.altText?.trim();
  if (!alt || image.width <= 0 || image.height <= 0) {
    throw new PublicImageConfigurationError(
      "Project image is missing public rendering metadata.",
    );
  }

  const mode = options.mode ?? getContentMode();
  const demoSource = DEMO_IMAGE_SOURCES[image.cloudinaryPublicId];
  if (mode === "demo" && demoSource) {
    return {
      kind: "local",
      src: demoSource,
      width: image.width,
      height: image.height,
      alt,
      position: image.position,
      isCover: image.isCover,
    };
  }

  const cloudName = getCloudinaryCloudName(
    options.cloudinaryUrl ?? process.env.CLOUDINARY_URL,
  );
  if (!cloudName) {
    throw new PublicImageConfigurationError(
      "Cloudinary delivery is not configured for public project images.",
    );
  }

  return {
    kind: "cloudinary",
    src: buildCloudinaryImageTemplate({
      cloudName,
      publicId: image.cloudinaryPublicId,
      version: image.cloudinaryVersion,
    }),
    width: image.width,
    height: image.height,
    alt,
    position: image.position,
    isCover: image.isCover,
  };
}

export function getPublicImageUrl(
  image: PublicProjectImage,
  requestedWidth = 1200,
) {
  return image.kind === "cloudinary"
    ? resolveCloudinaryImageUrl(image.src, image.width, requestedWidth)
    : image.src;
}
