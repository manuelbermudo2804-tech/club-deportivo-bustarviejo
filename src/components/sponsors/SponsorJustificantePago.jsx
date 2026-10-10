import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Paperclip, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

// Adjuntar / ver el recibo o factura del pago de la temporada
export default function SponsorJustificantePago({ pago, onSave }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);

  const subir = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    await onSave({ justificante_uri: file_uri, justificante_nombre: file.name });
    setBusy(false);
    toast.success("Documento adjuntado");
  };

  const ver = async () => {
    const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: pago.justificante_uri });
    window.open(signed_url, "_blank");
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