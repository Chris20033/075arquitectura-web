export async function inspectImageFile(file: File) {
  const previewUrl = URL.createObjectURL(file);
  try {
    const dimensions = await new Promise<{ width: number; height: number }>(
      (resolve, reject) => {
        const image = new window.Image();
        image.onload = () =>
          resolve({ width: image.naturalWidth, height: image.naturalHeight });
        image.onerror = () => reject(new Error("No pudimos leer esta imagen."));
        image.src = previewUrl;
      },
    );
    return { previewUrl, ...dimensions };
  } catch (error) {
    URL.revokeObjectURL(previewUrl);
    throw error;
  }
}

export function uploadImageLocally(
  file: File,
  token: string,
  onProgress: (progress: number) => void,
  onRequest: (request: XMLHttpRequest) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    onRequest(request);
    request.open("POST", "/api/admin/media/upload");
    request.setRequestHeader("Content-Type", file.type);
    request.setRequestHeader("X-Media-Upload", token);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable)
        onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onerror = () =>
      reject(new Error("La conexión se interrumpió durante la carga."));
    request.onabort = () =>
      reject(new DOMException("Carga cancelada.", "AbortError"));
    request.onload = () => {
      let message = "No pudimos guardar la imagen.";
      try {
        const body = JSON.parse(request.responseText) as { message?: string };
        if (body.message) message = body.message;
      } catch {}
      if (request.status < 200 || request.status >= 300) {
        reject(new Error(message));
        return;
      }
      resolve();
    };
    request.send(file);
  });
}

export function formatImageBytes(bytes: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "unit",
    unit: bytes >= 1_000_000 ? "megabyte" : "kilobyte",
    maximumFractionDigits: 1,
  }).format(bytes / (bytes >= 1_000_000 ? 1_000_000 : 1_000));
}
