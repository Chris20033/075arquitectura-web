import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";
import { basename } from "node:path";

export type MediaUploadTarget =
  | { scope: "project"; ownerId: string }
  | { scope: "site_hero"; ownerId: string };

export type MediaUploadPayload = MediaUploadTarget & {
  uploadId: string;
  name: string;
  mimeType: string;
  bytes: number;
  altText: string | null;
  expiresAt: number;
};

function signingSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for media uploads.");
  return secret;
}

function signature(value: string) {
  return createHmac("sha256", signingSecret())
    .update(`075arquitectura-media:${value}`)
    .digest("base64url");
}

export function createMediaUploadToken(
  input: Omit<MediaUploadPayload, "name" | "expiresAt"> & { name: string },
  now = Date.now(),
) {
  const payload: MediaUploadPayload = {
    ...input,
    name: basename(input.name).slice(0, 255) || "imagen",
    expiresAt: now + 10 * 60 * 1_000,
  };
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyMediaUploadToken(token: string, now = Date.now()) {
  const [encoded, supplied] = token.split(".");
  if (!encoded || !supplied) throw new Error("INVALID_MEDIA_UPLOAD_TOKEN");
  const expected = signature(encoded);
  const left = Buffer.from(supplied);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right))
    throw new Error("INVALID_MEDIA_UPLOAD_TOKEN");
  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString("utf8"),
  ) as MediaUploadPayload;
  if (payload.expiresAt < now) throw new Error("EXPIRED_MEDIA_UPLOAD_TOKEN");
  return payload;
}
