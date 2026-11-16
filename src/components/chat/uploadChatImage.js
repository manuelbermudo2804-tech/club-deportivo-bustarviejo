import { base44 } from "@/api/base44Client";
import { getDeviceCapabilities } from "@/components/utils/deviceCapabilities";

const MAX_IMAGE_BYTES = 15 * 1024 * 1024;

export function isChatImage(file) {
  return !!file && (
    file.type?.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp|heic|heif|bmp|avif)$/i.test(file.name || "")
  );
}

const waitForFileReady = async (file) => {
  for (let i = 0; i < 6; i++) {
    if (file?.size > 0) return file;
    await new Promise(resolve => setTimeout(resolve, 200 * Math.pow(1.5, i)));
  }
  if (file?.slice) {
    try { await file.slice(0, 1).arrayBuffer(); } catch {}
  }
  return file;
};

const directUpload = async (file) => {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      const url = response?.file_url || response?.data?.file_url;
      if (!url) throw new Error("El servidor no ha devuelto la dirección de la foto.");
      return {
        url, tipo: file.type || "image/jpeg", tamano: file.size,
        ancho_original: null, alto_original: null, ancho_final: null, alto_final: null,
        metodo_subida: "original_directa",
      };
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise(resolve => setTimeout(resolve, 700));
    }
  }
  throw lastError;
};

const serverProcess = async (file, maxSide, quality) => {
  const response = await base44.functions.invoke("processImage", {
    image: file,
    max_side: maxSide,
    quality,
  });
  const data = response?.data;
  if (!data?.file_url || data?.error) {
    throw new Error(data?.userMessage || data?.error || "No se pudo procesar la foto en el servidor.");
  }
  return {
    url: data.file_url,
    tipo: data.note === "uploaded_without_processing" ? (file.type || "image/jpeg") : "image/jpeg",
    tamano: data.size_bytes ?? file.size,
    ancho_original: data.original_width ?? null,
    alto_original: data.original_height ?? null,
    ancho_final: data.output_width ?? null,
    alto_final: data.output_height ?? null,
    metodo_subida: data.note === "uploaded_without_processing" ? "servidor_sin_procesar" : "procesado_servidor",
  };
};

/**
 * Subida adaptativa común para los chats:
 * detecta WebView/Android/iOS antiguos y RAM limitada; nunca comprime en el móvil.
 * Si falla la vía preferida, cambia de estrategia y reduce progresivamente en servidor.
 */
export async function uploadChatImage(rawFile) {
  const file = await waitForFileReady(rawFile);
  if (!file || !isChatImage(file)) throw new Error("El archivo no es una imagen válida.");
  if (!file.size) throw new Error("La foto está vacía o el móvil no ha terminado de prepararla. Vuelve a seleccionarla.");
  if (file.size > MAX_IMAGE_BYTES) throw new Error("La foto supera el límite de 15 MB.");

  const caps = getDeviceCapabilities();
  const constrained = caps.degraded === true || caps.isLowRAM === true || caps.isVeryLowRAM === true;
  const errors = [];

  // En dispositivos limitados se intenta primero el original: cero trabajo de imagen local.
  if (constrained) {
    try { return await directUpload(file); }
    catch (error) { errors.push("original: " + (error?.message || error)); }
  }

  // El teléfono solo envía el archivo; la decodificación y compresión se hacen en servidor.
  const stages = constrained
    ? [[1200, 68], [900, 58], [700, 45]]
    : [[1500, 75], [1200, 65], [900, 55], [700, 45]];

  for (const [maxSide, quality] of stages) {
    try { return await serverProcess(file, maxSide, quality); }
    catch (error) {
      errors.push("servidor " + maxSide + "px: " + (error?.message || error));
      console.warn("[ChatImageUpload] Falló procesamiento " + maxSide + "px", error);
    }
  }

  // Último intento: original directo, por si el fallo fue exclusivo del procesador.
  if (!constrained) {
    try { return await directUpload(file); }
    catch (error) { errors.push("original: " + (error?.message || error)); }
  }

  throw new Error("No se ha podido subir la foto tras varios intentos. Comprueba la conexión y vuelve a intentarlo. " + errors.slice(-3).join(" | "));
}
