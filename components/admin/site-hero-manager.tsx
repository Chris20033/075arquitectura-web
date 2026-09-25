"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { AdminActionForm } from "@/components/admin/admin-action-form";
import { useAdminDirtyState } from "@/components/admin/admin-dirty-state";
import { ConfirmDialog } from "@/components/admin/confirm-dialog";
import {
  deleteHeroImageFormAction,
  prepareHeroUploadAction,
  updateHeroAltTextAction,
} from "@/lib/admin/hero-image-actions";
import { cancelHeroMediaUploadAction } from "@/lib/admin/image-actions";
import {
  formatImageBytes,
  inspectImageFile,
  uploadImageLocally,
} from "@/lib/media/browser-upload";
import { imageUploadLimits, validateImageMetadata } from "@/lib/media/limits";

type HeroImage = {
  id: string;
  altText: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  previewUrl: string;
};

type SelectedHero = {
  file: File;
  previewUrl: string;
  width: number;
  height: number;
};

export function SiteHeroManager({ image }: { image: HeroImage | null }) {
  const router = useRouter();
  const dirtyState = useAdminDirtyState();
  const dirtyId = useId();
  const requestRef = useRef<XMLHttpRequest | null>(null);
  const preparedUploadIdRef = useRef<string | null>(null);
  const cancellingRef = useRef(false);
  const [selected, setSelected] = useState<SelectedHero | null>(null);
  const [altText, setAltText] = useState("");
  const [status, setStatus] = useState<
    "idle" | "ready" | "uploading" | "processing" | "cancelling" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (selected) URL.revokeObjectURL(selected.previewUrl);
      requestRef.current?.abort();
    },
    [selected],
  );

  useEffect(() => {
    dirtyState?.setDirty(dirtyId, Boolean(selected));
    return () => dirtyState?.setDirty(dirtyId, false);
  }, [dirtyId, dirtyState, selected]);

  async function chooseFile(file: File | undefined) {
    if (!file) return;
    if (selected) URL.revokeObjectURL(selected.previewUrl);
    try {
      const inspected = await inspectImageFile(file);
      const format =
        file.type === "image/jpeg" ? "jpeg" : file.type.replace("image/", "");
      const issues = validateImageMetadata({
        format,
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
        throw new Error(issues[0] ?? "El formato debe ser JPEG, PNG o WebP.");
      }
      setSelected({ file, ...inspected });
      setStatus("ready");
      setProgress(0);
      setFeedback(null);
    } catch (error) {
      setStatus("error");
      setFeedback(
        error instanceof Error ? error.message : "No pudimos leer la imagen.",
      );
    }
  }

  async function upload() {
    if (!selected) return;
    if (!altText.trim()) {
      setStatus("error");
      setFeedback("Describe brevemente lo que aparece en la portada.");
      return;
    }
    try {
      const prepared = await prepareHeroUploadAction({
        name: selected.file.name,
        mimeType: selected.file.type,
        format:
          selected.file.type === "image/jpeg"
            ? "jpeg"
            : selected.file.type.replace("image/", ""),
        width: selected.width,
        height: selected.height,
        bytes: selected.file.size,
        altText: altText.trim(),
      });
      if (!prepared.ok || !prepared.data) throw new Error(prepared.message);
      preparedUploadIdRef.current = prepared.data.uploadId;
      setStatus("uploading");
      setProgress(0);
      await uploadImageLocally(
        selected.file,
        prepared.data.token,
        (value) => {
          setProgress(value);
          if (value >= 100) setStatus("processing");
        },
        (request) => {
          requestRef.current = request;
        },
      );
      requestRef.current = null;
      preparedUploadIdRef.current = null;
      URL.revokeObjectURL(selected.previewUrl);
      setSelected(null);
      setAltText("");
      setStatus("idle");
      setFeedback("Portada optimizada y publicada.");
      router.refresh();
    } catch (error) {
      requestRef.current = null;
      if (cancellingRef.current) return;
      const cancelled =
        error instanceof DOMException && error.name === "AbortError";
      setStatus(cancelled ? "ready" : "error");
      setFeedback(
        cancelled
          ? "Carga cancelada. Puedes intentarlo nuevamente."
          : error instanceof Error
            ? error.message
            : "No pudimos completar la carga.",
      );
    }
  }

  async function cancelUpload() {
    const uploadId = preparedUploadIdRef.current;
    cancellingRef.current = true;
    requestRef.current?.abort();
    requestRef.current = null;
    setStatus("cancelling");
    const result = uploadId
      ? await cancelHeroMediaUploadAction(uploadId)
      : null;
    preparedUploadIdRef.current = null;
    cancellingRef.current = false;
    if (result && !result.ok) {
      setStatus("error");
      setFeedback(result.message);
      return;
    }
    setStatus("ready");
    setProgress(0);
    setFeedback("Carga cancelada. La imagen seleccionada sigue disponible.");
    router.refresh();
  }

  const preview = selected?.previewUrl ?? image?.previewUrl;
  const previewAlt = selected ? altText : image?.altText;
  const previewWidth = selected?.width ?? image?.width ?? 16;
  const previewHeight = selected?.height ?? image?.height ?? 9;
  const portrait = previewHeight > previewWidth;
  const busy =
    status === "uploading" ||
    status === "processing" ||
    status === "cancelling";

  return (
    <section className="admin-site-hero" aria-labelledby="site-hero-title">
      <div className="admin-section__header">
        <div>
          <h2 id="site-hero-title">Portada principal</h2>
          <p>La imagen que recibe a quienes visitan el sitio.</p>
        </div>
        <span>{image ? "Configurada" : "Pendiente"}</span>
      </div>

      <div className="admin-site-hero__layout">
        <div className="admin-site-hero__preview">
          {preview ? (
            <Image
              src={preview}
              alt={previewAlt || "Vista previa de la portada"}
              fill
              sizes="(max-width: 700px) 100vw, 58vw"
              unoptimized
            />
          ) : (
            <span>Sin imagen</span>
          )}
          <div className="admin-site-hero__preview-brand" aria-hidden="true">
            <strong>075</strong>
            <span>Arquitectura</span>
          </div>
        </div>

        <div className="admin-site-hero__editor">
          {image && !selected ? (
            <>
              <p className="admin-form-note">
                WEBP optimizado · {image.width}×{image.height} · original{" "}
                {formatImageBytes(image.bytes)}
              </p>
              <AdminActionForm
                key={`${image.id}:${image.previewUrl}:${image.altText}`}
                action={updateHeroAltTextAction}
                className="admin-stack-form"
                submitLabel="Guardar descripción"
              >
                <label className="admin-field">
                  <span>Descripción de la imagen (para accesibilidad)</span>
                  <textarea
                    name="altText"
                    rows={3}
                    maxLength={500}
                    defaultValue={image.altText}
                    required
                  />
                </label>
              </AdminActionForm>
              <ConfirmDialog
                action={deleteHeroImageFormAction}
                title="Eliminar portada principal"
                description="Se eliminarán el original privado y todas sus versiones WebP."
                triggerLabel="Eliminar portada"
                confirmLabel="Eliminar definitivamente"
                tone="danger"
              />
            </>
          ) : null}

          <label className="admin-upload-picker">
            <span>{image ? "Reemplazar imagen" : "Seleccionar imagen"}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              onChange={(event) => {
                void chooseFile(event.target.files?.[0]);
                event.currentTarget.value = "";
              }}
            />
          </label>

          {selected ? (
            <div className="admin-site-hero__selection">
              <p>
                {selected.file.name} · {selected.width}×{selected.height} ·{" "}
                {formatImageBytes(selected.file.size)}
              </p>
              {portrait ? (
                <p className="admin-notice">
                  La imagen es vertical y tendrá un recorte considerable en la
                  portada panorámica.
                </p>
              ) : null}
              <label className="admin-field">
                <span>Descripción de la imagen (para accesibilidad)</span>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  disabled={busy}
                />
                <small>
                  Ej. Fachada principal vista desde el jardín al atardecer.
                </small>
              </label>
              <progress
                max={100}
                value={progress}
                aria-label="Progreso de portada"
              />
              <div className="admin-gallery-row__actions">
                <button
                  className="admin-button"
                  type="button"
                  disabled={busy}
                  onClick={() => void upload()}
                >
                  {status === "processing"
                    ? "Generando versiones…"
                    : status === "cancelling"
                      ? "Cancelando…"
                      : status === "uploading"
                        ? `Subiendo ${progress}%`
                        : status === "error"
                          ? "Reintentar"
                          : "Subir y optimizar portada"}
                </button>
                {status === "uploading" ? (
                  <button
                    className="admin-text-action"
                    type="button"
                    onClick={() => void cancelUpload()}
                  >
                    Cancelar
                  </button>
                ) : null}
              </div>
            </div>
          ) : null}

          <p className="admin-form-note">
            JPEG, PNG o WebP · máximo 20 MB. Generaremos automáticamente las
            versiones para cada pantalla.
          </p>
          {feedback ? (
            <p
              className="admin-feedback"
              data-tone={status === "error" ? "error" : "success"}
              role={status === "error" ? "alert" : "status"}
            >
              {feedback}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
