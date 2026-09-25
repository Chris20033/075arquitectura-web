import { createHash, randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import sharp from "sharp";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  imageUploadLimits,
  isMediaVariantName,
  validateImageMetadata,
} from "@/lib/media/limits";
import { processUploadedImage } from "@/lib/media/processor";
import {
  isUploadCancelled,
  markUploadCancelled,
  retryTransientFileOperation,
  resolveStoragePath,
  stageStoredMediaForDeletion,
} from "@/lib/media/storage";
import { runWithConcurrency } from "@/lib/media/upload-queue";
import {
  createMediaUploadToken,
  verifyMediaUploadToken,
} from "@/lib/media/upload-token";

let workspace: string;

beforeAll(async () => {
  workspace = await mkdtemp(join(tmpdir(), "075-media-test-"));
  process.env.AUTH_SECRET = "test-only-media-signing-secret";
  process.env.UPLOADS_ROOT = workspace;
  sharp.cache(false);
});

afterAll(async () => {
  await rm(workspace, { recursive: true, force: true });
});

describe("local image validation", () => {
  it("accepts any positive resolution while preserving format and size limits", () => {
    expect(
      validateImageMetadata({
        format: "jpeg",
        width: 120,
        height: 80,
        bytes: 10_000,
      }),
    ).toEqual([]);
    expect(
      validateImageMetadata({
        format: "png",
        width: 20_000,
        height: 10_000,
        bytes: imageUploadLimits.maxBytes,
      }),
    ).toEqual([]);
    expect(
      validateImageMetadata({
        format: "gif",
        width: 0,
        height: -1,
        bytes: imageUploadLimits.maxBytes + 1,
      }),
    ).toEqual([
      "El formato debe ser JPEG, PNG o WebP.",
      "La imagen debe pesar como máximo 20 MB.",
      "Las dimensiones de la imagen no son válidas.",
    ]);
  });

  it("accepts only public WebP variant names and never an original", () => {
    expect(isMediaVariantName("mobile")).toBe(true);
    expect(isMediaVariantName("wide")).toBe(true);
    expect(isMediaVariantName("original")).toBe(false);
    expect(isMediaVariantName("original.jpg")).toBe(false);
  });

  it("signs short-lived, tamper-resistant upload descriptors", () => {
    const now = Date.now();
    const token = createMediaUploadToken(
      {
        scope: "project",
        ownerId: randomUUID(),
        uploadId: randomUUID(),
        name: "../fachada final.jpg",
        mimeType: "image/jpeg",
        bytes: 1_000,
        altText: "Fachada principal",
      },
      now,
    );
    expect(verifyMediaUploadToken(token, now + 1_000)).toMatchObject({
      name: "fachada final.jpg",
      scope: "project",
    });
    expect(() => verifyMediaUploadToken(`${token}x`, now)).toThrow();
    expect(() => verifyMediaUploadToken(token, now + 11 * 60 * 1_000)).toThrow(
      "EXPIRED_MEDIA_UPLOAD_TOKEN",
    );
  });
});

describe("Sharp processing", () => {
  it("preserves the exact original and creates only useful WebP screen variants", async () => {
    const source = join(workspace, "source.jpg");
    const output = join(workspace, "asset");
    await sharp({
      create: {
        width: 3000,
        height: 2000,
        channels: 3,
        background: "#9b7653",
      },
    })
      .jpeg({ quality: 96 })
      .toFile(source);
    await import("node:fs/promises").then(({ mkdir }) =>
      mkdir(output, { recursive: true }),
    );

    const processed = await processUploadedImage({
      sourcePath: source,
      outputDirectory: output,
      suppliedName: "Render final.jpg",
    });
    const original = await readFile(join(output, "original.jpg"));
    const sourceBytes = await readFile(source);

    expect(original.equals(sourceBytes)).toBe(true);
    expect(processed.originalSha256).toBe(
      createHash("sha256").update(sourceBytes).digest("hex"),
    );
    expect(processed.variants.map((variant) => variant.name)).toEqual([
      "mobile",
      "tablet",
      "laptop",
      "desktop",
      "wide",
    ]);
    expect(processed.variants.every((variant) => variant.width <= 3000)).toBe(
      true,
    );
    expect(processed.variants.at(-1)!.bytes).toBeLessThan(sourceBytes.length);
    for (const variant of processed.variants) {
      const metadata = await sharp(
        join(output, `${variant.name}.webp`),
      ).metadata();
      expect(metadata.format).toBe("webp");
    }
  });

  it("creates one original-size WebP for an image below the mobile width", async () => {
    const source = join(workspace, "small.png");
    const output = join(workspace, "small-asset");
    await sharp({
      create: {
        width: 320,
        height: 240,
        channels: 4,
        background: { r: 180, g: 90, b: 50, alpha: 0.5 },
      },
    })
      .png()
      .toFile(source);
    await import("node:fs/promises").then(({ mkdir }) =>
      mkdir(output, { recursive: true }),
    );
    const processed = await processUploadedImage({
      sourcePath: source,
      outputDirectory: output,
      suppliedName: "plano.png",
    });
    expect(processed.variants).toHaveLength(1);
    expect(processed.variants[0]).toMatchObject({ name: "mobile", width: 320 });
    const metadata = await sharp(join(output, "mobile.webp")).metadata();
    expect(metadata.format).toBe("webp");
    expect(metadata.hasAlpha).toBe(true);
  });
});

describe("upload queue", () => {
  it("never exceeds three concurrent transfers", async () => {
    let active = 0;
    let maximum = 0;
    await runWithConcurrency([1, 2, 3, 4, 5, 6], 3, async () => {
      active += 1;
      maximum = Math.max(maximum, active);
      await new Promise((resolve) => setTimeout(resolve, 5));
      active -= 1;
    });
    expect(maximum).toBe(3);
  });
});

describe("local media deletion", () => {
  it("persists cancellation markers for in-flight uploads", async () => {
    const uploadId = randomUUID();
    expect(await isUploadCancelled(uploadId)).toBe(false);
    await markUploadCancelled(uploadId);
    expect(await isUploadCancelled(uploadId)).toBe(true);
  });

  it("retries transient Windows file locks without hiding permanent errors", async () => {
    let calls = 0;
    const result = await retryTransientFileOperation(
      async () => {
        calls += 1;
        if (calls < 3)
          throw Object.assign(new Error("locked"), { code: "EBUSY" });
        return "removed";
      },
      { baseDelayMs: 0, waitFor: async () => undefined },
    );
    expect(result).toBe("removed");
    expect(calls).toBe(3);

    await expect(
      retryTransientFileOperation(
        async () => {
          throw Object.assign(new Error("denied"), { code: "EACCES" });
        },
        { baseDelayMs: 0, waitFor: async () => undefined },
      ),
    ).rejects.toMatchObject({ code: "EACCES" });
  });

  it("restores staged directories after a database failure and commits them after success", async () => {
    const storageKey = "projects/casa-demo--12345678/media-key";
    const directory = resolveStoragePath(storageKey);
    await mkdir(directory, { recursive: true });
    await writeFile(join(directory, "mobile.webp"), "demo");

    const firstAttempt = await stageStoredMediaForDeletion(storageKey);
    await expect(access(directory)).rejects.toBeDefined();
    await firstAttempt.rollback();
    await expect(access(directory)).resolves.toBeUndefined();

    const secondAttempt = await stageStoredMediaForDeletion(storageKey);
    await secondAttempt.commit();
    await expect(access(directory)).rejects.toBeDefined();
  });
});
