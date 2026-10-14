import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Paperclip, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Adjuntar / ver el recibo o factura del pago de la temporada
export default function SponsorJustificantePago({ pago, onSave }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const subir = async (e) => {
    const input = e.target;
    const file = input.files?.[0];
    if (!file) return;
    const maxBytes = 10 * 1024 * 1024;
    if (file.size > maxBytes) {
      toast.error("El justificante no puede superar los 10 MB");
      input.value = "";
      return;
    }
    setBusy(true);
    try {
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
      await onSave({ justificante_uri: file_uri, justificante_nombre: file.name });
      toast.success("Documento adjuntado");
    } catch (error) {
      console.error("Error adjuntando justificante:", error);
      toast.error("No se pudo adjuntar el documento. Vuelve a intentarlo.");
    } finally {
      setBusy(false);
      input.value = "";
    }
  };

  const ver = async () => {
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: pago.justificante_uri });
      if (!signed_url) throw new Error("No se recibió un enlace de descarga");
      window.open(signed_url, "_blank", "noopener,noreferrer");
    } catch (error) {
      console.error("Error abriendo justificante:", error);
      toast.error("No se pudo abrir el documento. Comprueba tus permisos e inténtalo de nuevo.");
    }
  };

  return (
    <div className="flex items-center gap-2 mt-2 text-xs">
      {pago.justificante_uri && (
        <button onClick={ver} className="flex items-center gap-1 text-green-800 hover:underline truncate max-w-[160px]">
          <FileText className="w-3.5 h-3.5 shrink-0" /> {pago.justificante_nombre || "Ver documento"}
        </button>
      )}
      <button onClick={() => ref.current?.click()} disabled={busy} className="flex items-center gap-1 text-slate-600 hover:text-orange-600">
        {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Paperclip className="w-3.5 h-3.5" />}
        {pago.justificante_uri ? "Cambiar" : "Adjuntar recibo/factura"}
      </button>
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={subir} />
    </div>
  );
}