import { base44 } from "@/api/base44Client";
import { getDeviceCapabilities } from "@/components/utils/deviceCapabilities";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;
const SERVER_PROCESS_LIMIT = 10 * 1024 * 1024;

export function isChatImage(file) {
  return !!file && (
    file.type?.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(file.name || "")
  );
}

/**
 * Shared chat image pipeline:
 * - legacy / low-memory devices: upload original directly (no client canvas).
 * - capable devices: server-side resize to max 1500px, JPEG quality 75%.
 * - server processing failure: direct original upload as fallback.
 */
export async function uploadChatImage(file) {
  if (!file || !isChatImage(file)) throw new Error("El archivo no es una imagen válida.");
  if (!file.size) throw new Error("La imagen está vacía o no se puede leer.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("La foto supera el límite de 15 MB.");

  const caps = getDeviceCapabilities();
  const useDirect = caps.degraded === true || caps.isLowRAM === true || file.size > SERVER_PROCESS_LIMIT;

  if (!useDirect) {
    try {
      const response = await base44.functions.invoke("processImage", { image: file });
      const data = response?.data;
      if (data?.file_url && !data?.error) {
        return {
          url: data.file_url,
          tipo: "image/jpeg",
          tamano: data.size_bytes ?? file.size,
          ancho_original: data.original_width ?? null,
          alto_original: data.original_height ?? null,
          ancho_final: data.output_width ?? null,
          alto_final: data.output_height ?? null,
          metodo_subida: data.note === "uploaded_without_processing" ? "servidor_sin_procesar" : "procesado_servidor",
        };
      }
    } catch (error) {
      console.warn("[ChatImageUpload] Procesado servidor no disponible; se sube el original.", error);
    }
  }

  const uploaded = await base44.integrations.Core.UploadFile({ file });
  const url = uploaded?.file_url || uploaded?.data?.file_url;
  if (!url) throw new Error("No se recibió la dirección de la imagen.");
  return {
    url,
    tipo: file.type || "image/jpeg",
    tamano: file.size,
    ancho_original: null,
    alto_original: null,
    ancho_final: null,
    alto_final: null,
    metodo_subida: "original_directa",
  };
}
