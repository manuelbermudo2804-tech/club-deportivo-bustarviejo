import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

// Comparte un PDF por WhatsApp mediante un enlace privado temporal.
// En modo preferWhatsAppLink se prioriza abrir WhatsApp con el mensaje preparado en cualquier dispositivo.
export async function compartirPdfWhatsApp({ blob, filename, mensaje, telefono, preferWhatsAppLink = false, waWindow = null }) {
  const file = new File([blob], filename, { type: "application/pdf" });

  if (!preferWhatsAppLink && navigator.canShare && navigator.canShare({ files: [file] })) {
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
  if (waWindow && !waWindow.closed) {
    waWindow.location.href = waUrl;
  } else {
    throw new Error("La ventana de WhatsApp ya no está disponible");
  }
  toast.success("WhatsApp preparado con el mensaje y el enlace seguro al PDF");
  return true;
}