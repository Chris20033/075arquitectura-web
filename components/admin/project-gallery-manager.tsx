"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";

import { useAdminDirtyState } from "@/components/admin/admin-dirty-state";

import {
  cancelProjectMediaUploadAction,
  cleanupPendingUploadsAction,
  deleteProjectImageAction,
  prepareImageUploadsAction,
  setProjectCoverAction,
  updateProjectGalleryAction,
} from "@/lib/admin/image-actions";
import type { PreparedMediaUpload } from "@/lib/admin/image-actions";
import {
  formatImageBytes,
  inspectImageFile,
  uploadImageLocally,
} from "@/lib/media/browser-upload";
import { imageUploadLimits, validateImageMetadata } from "@/lib/media/limits";
import { runWithConcurrency } from "@/lib/media/upload-queue";

type PersistedImage = {
  id: string;
  altText: string | null;
  isCover: boolean;
  width: number;
  height: number;
  position: number;
  format: string;
  bytes: number;
  previewUrl: string;
};

type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  width: number;
  height: number;
  altText: string;
  progress: number;
  status:
    | "ready"
    | "preparing"
    | "uploading"
    | "processing"
    | "cancelling"
    | "complete"
    | "error"
    | "cancelled";
  error?: string;
  preparedUploadId?: string;
};

type ProjectGalleryManagerProps = {
  projectId: string;
  projectName: string;
  status: "DRAFT" | "PUBLISHED";
  images: PersistedImage[];
};

function DeleteImageButton({
  projectId,
  image,
  disabled,
  onComplete,
}: {
  projectId: string;
  image: PersistedImage;
  disabled: boolean;
  onComplete: (message: string, error?: boolean) => void;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [pending, startTransition] = useTransition();

  function close() {
    dialogRef.current?.close();
    triggerRef.current?.focus();
  }

  return (
    <>
      <button
        ref={triggerRef}
        className="admin-text-action"
        data-tone="danger"
        type="button"
        disabled={disabled}
        onClick={() => dialogRef.current?.showModal()}
      >
        Eliminar
      </button>
      <dialog
        ref={dialogRef}
        className="admin-dialog"
        onCancel={(event) => {
          event.preventDefault();
          close();
        }}
      >
        <div className="admin-dialog__body">
          <h2>Eliminar imagen</h2>
          <p>
            Se eliminará del almacenamiento y de la galería. Esta acción no se
            puede deshacer.
          </p>
          <div className="admin-dialog__actions">
            <button
              className="admin-button"
              data-tone="secondary"
              type="button"
              disabled={pending}
              onClick={close}
            >
              Cancelar
            </button>
            <button
              className="admin-button"
              data-tone="danger"
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  const result = await deleteProjectImageAction(
                    projectId,
                    image.id,
                  );
                  onComplete(result.message, !result.ok);
                  if (result.ok) close();
                })
              }
            >
              {pending ? "Eliminando…" : "Eliminar definitivamente"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

export function ProjectGalleryManager({
  projectId,
  projectName,
  status,
  images: initialImages,
}: ProjectGalleryManagerProps) {
  const router = useRouter();
  const dirtyState = useAdminDirtyState();
  const dirtyId = useId();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [images, setImages] = useState(initialImages);
  const [feedback, setFeedback] = useState<{
    message: string;
    error: boolean;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const aborters = useRef(new Map<string, XMLHttpRequest>());
  const previewUrls = useRef(new Set<string>());
  const [savedGallery, setSavedGallery] = useState(() =>
    JSON.stringify(
      initialImages.map((image) => ({
        id: image.id,
        altText: image.altText,
      })),
    ),
  );

  useEffect(
    () => () => {
      for (const previewUrl of previewUrls.current)
        URL.revokeObjectURL(previewUrl);
      for (const request of aborters.current.values()) request.abort();
    },
    [],
  );

  const availableSlots = imageUploadLimits.maxImagesPerProject - images.length;
  const activeQueue = useMemo(
    () => queue.filter((item) => item.status !== "complete"),
    [queue],
  );
  const gallerySignature = JSON.stringify(
    images.map((image) => ({ id: image.id, altText: image.altText })),
  );
  const galleryDirty = gallerySignature !== savedGallery;

  useEffect(() => {
    dirtyState?.setDirty(dirtyId, galleryDirty);
    return () => dirtyState?.setDirty(dirtyId, false);
  }, [dirtyId, dirtyState, galleryDirty]);

  function report(message: string, error = false) {
    setFeedback({ message, error });
    if (!error) {
      router.refresh();
      window.setTimeout(() => router.refresh(), 150);
    }
  }

  async function selectFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (files.length + activeQueue.length > availableSlots) {
      report(
        `Solo quedan ${Math.max(0, availableSlots - activeQueue.length)} espacios disponibles.`,
        true,
      );
      return;
    }
    const additions: QueueItem[] = [];
    for (const file of files) {
      try {
        const inspected = await inspectImageFile(file);
        const issues = validateImageMetadata({
          format:
            file.type === "image/jpeg"
              ? "jpg"
              : file.type.replace("image/", ""),
          width: inspected.width,
          height: inspected.height,
          bytes: file.size,
        });
        if (
          !(imageUploadLimits.allowedMimeTypes as readonly string[]).includes(
            file.type,
          ) ||
          issues.length > 0
        ) {
          URL.revokeObjectURL(inspected.previewUrl);
          report(
            `${file.name}: ${issues[0] ?? "El formato debe ser JPEG, PNG o WebP."}`,
            true,
          );
          continue;
        }
        additions.push({
          id: crypto.randomUUID(),
          file,
          ...inspected,
          altText: "",
          progress: 0,
          status: "ready",
        });
        previewUrls.current.add(inspected.previewUrl);
      } catch (error) {
        report(
          error instanceof Error
            ? `${file.name}: ${error.message}`
            : `${file.name}: archivo inválido.`,
          true,
        );
      }
    }
    setQueue((current) => [...current, ...additions]);
  }

  function patchQueue(id: string, patch: Partial<QueueItem>) {
    setQueue((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function removeQueueItem(id: string) {
    aborters.current.delete(id);
    setQueue((current) =>
      current.filter((item) => {
        if (item.id !== id) return true;
        URL.revokeObjectURL(item.previewUrl);
        previewUrls.current.delete(item.previewUrl);
        return false;
      }),
    );
  }

  async function cancelQueueItem(item: QueueItem) {
    const uploadId = item.preparedUploadId;
    aborters.current.get(item.id)?.abort();
    aborters.current.delete(item.id);
    patchQueue(item.id, { status: "cancelling", error: undefined });
    if (!uploadId) {
      removeQueueItem(item.id);
      return;
    }
    const result = await cancelProjectMediaUploadAction(projectId, uploadId);
    if (!result.ok) {
      patchQueue(item.id, {
        status: "error",
        error: result.message,
        preparedUploadId: undefined,
      });
      report(result.message, true);
      return;
    }
    removeQueueItem(item.id);
    report("Carga cancelada y retirada de la galería.");
  }

  async function uploadItem(item: QueueItem, prepared: PreparedMediaUpload) {
    try {
      patchQueue(item.id, {
        status: "uploading",
        progress: 0,
        error: undefined,
        preparedUploadId: prepared.uploadId,
      });
      await uploadImageLocally(
        item.file,
        prepared.token,
        (progress) =>
          patchQueue(item.id, {
            progress,
            status: progress >= 100 ? "processing" : "uploading",
          }),
        (request) => aborters.current.set(item.id, request),
      );
      aborters.current.delete(item.id);
      patchQueue(item.id, { status: "complete" });
      return true;
    } catch (error) {
      aborters.current.delete(item.id);
      const cancelled =
        error instanceof DOMException && error.name === "AbortError";
      patchQueue(item.id, {
        status: cancelled ? "cancelled" : "error",
        error:
          error instanceof Error
            ? error.message
            : "No pudimos completar la carga.",
      });
      return false;
    }
  }

  async function beginUploads(
    items = queue.filter(
      (item) =>
        item.status === "ready" ||
        item.status === "error" ||
        item.status === "cancelled",
    ),
  ) {
    if (items.length === 0) return;
    if (status === "PUBLISHED" && items.some((item) => !item.altText.trim())) {
      report("Añade texto alternativo a todas las imágenes nuevas.", true);
      return;
    }
    for (const item of items)
      patchQueue(item.id, { status: "preparing", error: undefined });
    const prepared = await prepareImageUploadsAction(
      projectId,
      items.map((item) => ({
        name: item.file.name,
        mimeType: item.file.type,
        format:
          item.file.type === "image/jpeg"
            ? "jpg"
            : item.file.type.replace("image/", ""),
        width: item.width,
        height: item.height,
        bytes: item.file.size,
        altText: item.altText || null,
      })),
    );
    if (!prepared.ok || !prepared.data) {
      for (const item of items)
        patchQueue(item.id, { status: "error", error: prepared.message });
      report(prepared.message, true);
      return;
    }

    let completed = 0;
    await runWithConcurrency(
      items,
      imageUploadLimits.maxConcurrentUploads,
      async (item, index) => {
        if (await uploadItem(item, prepared.data![index])) completed += 1;
      },
    );
    if (completed > 0)
      report(
        `${completed} ${completed === 1 ? "imagen añadida" : "imágenes añadidas"} a la galería.`,
      );
  }

  function moveImage(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;
    setImages((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  return (
    <section
      className="admin-gallery-manager"
      aria-labelledby="gallery-heading"
    >
      <header className="admin-section__header admin-gallery-manager__header">
        <div>
          <h2 id="gallery-heading">Galería de {projectName}</h2>
          <p>
            {images.length} de {imageUploadLimits.maxImagesPerProject} imágenes
            · hasta tres cargas simultáneas
          </p>
        </div>
      </header>

      <div className="admin-upload-zone">
        <label className="admin-upload-picker">
          <span>Seleccionar imágenes</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={availableSlots <= 0}
            onChange={(event) => {
              void selectFiles(event.target.files);
              event.currentTarget.value = "";
            }}
          />
        </label>
        <p>JPEG, PNG o WebP · máximo 20 MB por imagen.</p>
      </div>

      {queue.length > 0 ? (
        <div className="admin-upload-queue">
          <div className="admin-section__header">
            <h3>Cola de carga</h3>
            <button
              className="admin-button"
              type="button"
              disabled={
                !queue.some((item) =>
                  ["ready", "error", "cancelled"].includes(item.status),
                )
              }
              onClick={() => void beginUploads()}
            >
              Iniciar cargas
            </button>
          </div>
          {queue.map((item) => (
            <article className="admin-upload-row" key={item.id}>
              <Image
                src={item.previewUrl}
                alt=""
                width={120}
                height={90}
                unoptimized
              />
              <div className="admin-upload-row__body">
                <strong>{item.file.name}</strong>
                <span>
                  {item.width}×{item.height} ·{" "}
                  {formatImageBytes(item.file.size)}
                </span>
                <label className="admin-field">
                  <span>
                    Descripción de la imagen{" "}
                    {status === "PUBLISHED" ? "obligatorio" : "opcional"}
                  </span>
                  <input
                    value={item.altText}
                    maxLength={500}
                    disabled={[
                      "preparing",
                      "uploading",
                      "processing",
                      "cancelling",
                      "complete",
                    ].includes(item.status)}
                    onChange={(event) =>
                      patchQueue(item.id, { altText: event.target.value })
                    }
                  />
                </label>
                {item.error ? <p role="alert">{item.error}</p> : null}
              </div>
              <div className="admin-upload-row__status">
                <span>
                  {item.status === "uploading"
                    ? `${item.progress}%`
                    : item.status === "preparing"
                      ? "Preparando…"
                      : item.status === "processing"
                        ? "Generando versiones…"
                        : item.status === "cancelling"
                          ? "Cancelando…"
                          : item.status === "complete"
                            ? "Lista"
                            : item.status === "error"
                              ? "Error"
                              : item.status === "cancelled"
                                ? "Cancelada"
                                : "Preparada"}
                </span>
                <progress
                  max={100}
                  value={item.progress}
                  aria-label={`Progreso de ${item.file.name}`}
                />
                {item.status === "uploading" ? (
                  <button
                    className="admin-text-action"
                    type="button"
                    onClick={() => void cancelQueueItem(item)}
                  >
                    Cancelar y quitar
                  </button>
                ) : null}
                {item.status === "error" || item.status === "cancelled" ? (
                  <button
                    className="admin-text-action"
                    type="button"
                    onClick={() => void beginUploads([item])}
                  >
                    Reintentar
                  </button>
                ) : null}
                {["ready", "error", "cancelled"].includes(item.status) ? (
                  <button
                    className="admin-text-action"
                    data-tone="danger"
                    type="button"
                    onClick={() => removeQueueItem(item.id)}
                  >
                    Quitar
                  </button>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {feedback ? (
        <p
          className="admin-feedback"
          data-tone={feedback.error ? "error" : "success"}
          role={feedback.error ? "alert" : "status"}
        >
          {feedback.message}
        </p>
      ) : null}

      {images.length === 0 ? (
        <div className="admin-empty">
          <p>
            Todavía no hay imágenes. La primera carga se convertirá
            automáticamente en portada.
          </p>
        </div>
      ) : (
        <div className="admin-persisted-gallery">
          {images.map((image, index) => (
            <article className="admin-gallery-row" key={image.id}>
              <div className="admin-gallery-row__media">
                <Image
                  src={image.previewUrl}
                  alt={image.altText || "Vista previa sin texto alternativo"}
                  width={image.width}
                  height={image.height}
                  unoptimized
                />
                <span>{String(index + 1).padStart(2, "0")}</span>
              </div>
              <div className="admin-gallery-row__editor">
                <div className="admin-gallery-row__title">
                  <strong>
                    {image.isCover ? "Portada" : "Imagen de galería"}
                  </strong>
                  <span>
                    {image.format.toUpperCase()} · {image.width}×{image.height}{" "}
                    · {formatImageBytes(image.bytes)}
                  </span>
                </div>
                <label className="admin-field">
                  <span>Descripción de la imagen (para accesibilidad)</span>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={image.altText ?? ""}
                    onChange={(event) =>
                      setImages((current) =>
                        current.map((entry) =>
                          entry.id === image.id
                            ? { ...entry, altText: event.target.value }
                            : entry,
                        ),
                      )
                    }
                  />
                </label>
                <div className="admin-gallery-row__actions">
                  <button
                    className="admin-text-action"
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveImage(index, -1)}
                  >
                    Mover arriba
                  </button>
                  <button
                    className="admin-text-action"
                    type="button"
                    disabled={index === images.length - 1}
                    onClick={() => moveImage(index, 1)}
                  >
                    Mover abajo
                  </button>
                  {!image.isCover ? (
                    <button
                      className="admin-text-action"
                      type="button"
                      disabled={pending}
                      onClick={() =>
                        startTransition(async () => {
                          const result = await setProjectCoverAction(
                            projectId,
                            image.id,
                          );
                          report(result.message, !result.ok);
                        })
                      }
                    >
                      Elegir como portada
                    </button>
                  ) : null}
                  <DeleteImageButton
                    projectId={projectId}
                    image={image}
                    disabled={image.isCover && images.length > 1}
                    onComplete={report}
                  />
                </div>
                {image.isCover && images.length > 1 ? (
                  <p className="admin-form-note">
                    Selecciona otra portada antes de eliminar esta imagen.
                  </p>
                ) : null}
              </div>
            </article>
          ))}
          <div className="admin-gallery-savebar">
            <span aria-live="polite">
              {pending
                ? "Guardando…"
                : galleryDirty
                  ? "Cambios sin guardar"
                  : "Sin cambios"}
            </span>
            <button
              className="admin-button"
              type="button"
              disabled={pending || !galleryDirty}
              onClick={() =>
                startTransition(async () => {
                  const result = await updateProjectGalleryAction(
                    projectId,
                    images.map((image) => ({
                      id: image.id,
                      altText: image.altText,
                    })),
                  );
                  report(result.message, !result.ok);
                  if (result.ok) setSavedGallery(gallerySignature);
                })
              }
            >
              {pending ? "Guardando…" : "Guardar cambios en imágenes"}
            </button>
          </div>
        </div>
      )}

      <details className="admin-maintenance">
        <summary>Herramientas de mantenimiento</summary>
        <p>
          Úsalas solamente si una carga quedó incompleta después de un error de
          conexión.
        </p>
        <button
          className="admin-text-action"
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              const result = await cleanupPendingUploadsAction();
              report(result.message, !result.ok);
            })
          }
        >
          {pending ? "Limpiando…" : "Limpiar cargas incompletas"}
        </button>
      </details>
    </section>
  );
}
