import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Envía el PDF por WhatsApp de forma que el archivo llegue siempre.
// Móvil: comparte SOLO el archivo (WhatsApp descarta el adjunto si va con texto) y copia el mensaje.
// Ordenador: sube el PDF y mete el enlace de descarga en el mensaje.
export async function compartirPdfWhatsApp({ blob, filename, mensaje, telefono }) {
  const file = new File([blob], filename, { type: "application/pdf" });

  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.clipboard.writeText(mensaje); } catch {}
    try {
      await navigator.share({ files: [file] });
      toast.success("PDF enviado. El mensaje está copiado: pégalo si quieres añadirlo");
      return true;
    } catch (err) {
      if (err?.name === "AbortError") return false;
    }
  }

  const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
  const { signed_url: file_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri, expires_in: 60 * 60 * 24 * 30 });
  const texto = `${mensaje}\n\n📄 Descargar PDF: ${file_url}`;
  const tel = (telefono || "").replace(/\D/g, "");
  const waUrl = tel
    ? `https://wa.me/${tel.startsWith("34") ? tel : "34" + tel}?text=${encodeURIComponent(texto)}`
    : `https://wa.me/?text=${encodeURIComponent(texto)}`;
  window.open(waUrl, "_blank");
  toast.success("WhatsApp abierto con el enlace al PDF");
  return true;
}