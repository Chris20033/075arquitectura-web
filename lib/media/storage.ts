import "server-only";

import { randomUUID } from "node:crypto";
import {
  access,
  mkdir,
  readdir,
  rename,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { setTimeout as wait } from "node:timers/promises";

import { imageUploadLimits } from "./limits";

const transientFileSystemErrors = new Set(["EBUSY", "EPERM", "ENOTEMPTY"]);

function fileSystemErrorCode(error: unknown) {
  return error && typeof error === "object" && "code" in error
    ? String(error.code)
    : null;
}

export async function retryTransientFileOperation<T>(
  operation: () => Promise<T>,
  options: {
    attempts?: number;
    baseDelayMs?: number;
    waitFor?: (milliseconds: number) => Promise<unknown>;
  } = {},
) {
  const attempts = Math.max(1, options.attempts ?? 6);
  const baseDelayMs = Math.max(0, options.baseDelayMs ?? 30);
  const waitFor = options.waitFor ?? ((milliseconds) => wait(milliseconds));

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      if (
        !transientFileSystemErrors.has(fileSystemErrorCode(error) ?? "") ||
        attempt === attempts
      )
        throw error;
      await waitFor(baseDelayMs * 2 ** (attempt - 1));
    }
  }
  throw new Error("FILE_OPERATION_RETRY_EXHAUSTED");
}

export function uploadsRoot() {
  return resolve(
    /* turbopackIgnore: true */
    process.env.UPLOADS_ROOT || join(process.cwd(), "uploads"),
  );
}

export function resolveStoragePath(storageKey: string) {
  if (isAbsolute(storageKey)) throw new Error("ABSOLUTE_STORAGE_KEY");
  const root = uploadsRoot();
  const target = resolve(root, storageKey);
  if (target !== root && !target.startsWith(`${root}${sep}`))
    throw new Error("INVALID_STORAGE_KEY");
  return target;
}

export async function ensureStorageDirectories() {
  const root = uploadsRoot();
  await Promise.all([
    mkdir(root, { recursive: true }),
    mkdir(join(root, ".tmp"), { recursive: true }),
    mkdir(join(root, ".trash"), { recursive: true }),
  ]);
}

export async function createTemporaryUploadPath(uploadId: string) {
  await ensureStorageDirectories();
  return join(uploadsRoot(), ".tmp", `${uploadId}.upload`);
}

function cancellationMarkerPath(uploadId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      uploadId,
    )
  )
    throw new Error("INVALID_UPLOAD_ID");
  return join(uploadsRoot(), ".tmp", `${uploadId}.cancelled`);
}

export async function markUploadCancelled(uploadId: string) {
  await ensureStorageDirectories();
  await writeFile(cancellationMarkerPath(uploadId), "", { flag: "a" });
}

export async function isUploadCancelled(uploadId: string) {
  try {
    await access(cancellationMarkerPath(uploadId));
    return true;
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return false;
    throw error;
  }
}

export async function createTemporaryAssetDirectory(mediaKey: string) {
  await ensureStorageDirectories();
  const target = join(uploadsRoot(), ".tmp", mediaKey);
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  return target;
}

export async function finalizeAssetDirectory(
  temporaryDirectory: string,
  storageKey: string,
) {
  const target = resolveStoragePath(storageKey);
  await mkdir(dirname(target), { recursive: true });
  await rename(temporaryDirectory, target);
  return target;
}

export async function discardPath(path: string) {
  await retryTransientFileOperation(() =>
    rm(path, { recursive: true, force: true }),
  );
}

export async function removeStoredMedia(storageKey: string) {
  const source = resolveStoragePath(storageKey);
  await ensureStorageDirectories();
  const trash = join(uploadsRoot(), ".trash", randomUUID());
  try {
    await retryTransientFileOperation(() => rename(source, trash));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return;
    throw error;
  }
  await retryTransientFileOperation(() =>
    rm(trash, { recursive: true, force: true }),
  );
}

export async function stageStoredMediaForDeletion(storageKey: string) {
  const source = resolveStoragePath(storageKey);
  await ensureStorageDirectories();
  const trash = join(uploadsRoot(), ".trash", randomUUID());
  try {
    await retryTransientFileOperation(() => rename(source, trash));
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    )
      return {
        commit: async () => undefined,
        rollback: async () => undefined,
      };
    throw error;
  }

  return {
    commit: () =>
      retryTransientFileOperation(() =>
        rm(trash, { recursive: true, force: true }),
      ),
    rollback: async () => {
      await mkdir(dirname(source), { recursive: true });
      await retryTransientFileOperation(() => rename(trash, source));
    },
  };
}

export async function cleanupTemporaryStorage(now = Date.now()) {
  await ensureStorageDirectories();
  let deleted = 0;
  let failed = 0;
  for (const directory of [".tmp", ".trash"]) {
    const parent = join(/* turbopackIgnore: true */ uploadsRoot(), directory);
    for (const entry of await readdir(/* turbopackIgnore: true */ parent)) {
      const candidate = join(/* turbopackIgnore: true */ parent, entry);
      try {
        const details = await stat(/* turbopackIgnore: true */ candidate);
        if (now - details.mtimeMs >= imageUploadLimits.temporaryMaxAgeMs) {
          await rm(candidate, { recursive: true, force: true });
          deleted += 1;
        }
      } catch {
        failed += 1;
      }
    }
  }
  return { deleted, failed };
}

export function relativeStorageKey(path: string) {
  return relative(uploadsRoot(), path).split(sep).join("/");
}
