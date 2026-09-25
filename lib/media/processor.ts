import "server-only";

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { copyFile, stat } from "node:fs/promises";
import { join } from "node:path";

import sharp, { type Metadata } from "sharp";

import { imageUploadLimits, mediaVariants } from "./limits";

// Windows can retain recently-read files in libvips' file cache briefly.
// Runtime variants are generated once, so keeping file handles cached has no benefit.
sharp.cache({ files: 0 });

export type StoredVariant = {
  name: (typeof mediaVariants)[number]["name"];
  width: number;
  height: number;
  bytes: number;
};

export type ProcessedMedia = {
  originalFilename: string;
  originalFormat: "jpeg" | "png" | "webp";
  originalBytes: number;
  originalSha256: string;
  width: number;
  height: number;
  variants: StoredVariant[];
};

let processingTail = Promise.resolve();

export function withImageProcessingLock<T>(operation: () => Promise<T>) {
  const result = processingTail.then(operation, operation);
  processingTail = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}

function orientedDimensions(metadata: Metadata) {
  if (!metadata.width || !metadata.height) throw new Error("INVALID_IMAGE");
  const swaps = metadata.orientation && metadata.orientation >= 5;
  return swaps
    ? { width: metadata.height, height: metadata.width }
    : { width: metadata.width, height: metadata.height };
}

function extensionFor(format: string) {
  return format === "jpeg" ? "jpg" : format;
}

async function sha256(path: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(path)) hash.update(chunk);
  return hash.digest("hex");
}

export async function processUploadedImage(input: {
  sourcePath: string;
  outputDirectory: string;
  suppliedName: string;
}) {
  const metadata = await sharp(input.sourcePath).metadata();
  const format = metadata.format?.toLowerCase();
  if (
    !format ||
    !(imageUploadLimits.allowedFormats as readonly string[]).includes(format)
  )
    throw new Error("UNSUPPORTED_IMAGE_FORMAT");
  const dimensions = orientedDimensions(metadata);
  const original = `original.${extensionFor(format)}`;
  const originalPath = join(input.outputDirectory, original);
  await copyFile(input.sourcePath, originalPath);
  const variants: StoredVariant[] = [];
  const usedWidths = new Set<number>();

  for (const variant of mediaVariants) {
    const width = Math.min(dimensions.width, variant.width);
    if (usedWidths.has(width)) continue;
    usedWidths.add(width);
    const pipeline = sharp(input.sourcePath).autoOrient().resize({
      width,
      withoutEnlargement: true,
      fit: "inside",
    });
    const webp =
      format === "png"
        ? pipeline.webp({
            quality: 90,
            alphaQuality: 100,
            nearLossless: true,
            effort: 5,
          })
        : pipeline.webp({
            quality: 88,
            alphaQuality: 100,
            smartSubsample: true,
            preset: "photo",
            effort: 5,
          });
    const info = await webp.toFile(
      join(input.outputDirectory, `${variant.name}.webp`),
    );
    variants.push({
      name: variant.name,
      width: info.width,
      height: info.height,
      bytes: info.size,
    });
  }

  const sourceStats = await stat(input.sourcePath);
  return {
    originalFilename: input.suppliedName.slice(0, 255),
    originalFormat: format as ProcessedMedia["originalFormat"],
    originalBytes: sourceStats.size,
    originalSha256: await sha256(originalPath),
    width: dimensions.width,
    height: dimensions.height,
    variants,
  } satisfies ProcessedMedia;
}
