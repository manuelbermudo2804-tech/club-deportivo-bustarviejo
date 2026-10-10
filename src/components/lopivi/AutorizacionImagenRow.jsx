import React, { useRef, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Paperclip, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ESTADOS = [
  { v: "SI AUTORIZO", label: "Autoriza" },
  { v: "NO AUTORIZO", label: "No autoriza" },
];

// Fila de un jugador: cambiar su autorización de imagen y adjuntar el documento firmado
export default function AutorizacionImagenRow({ player, onChanged }) {
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const tieneDoc = (player.documentos_adicionales || []).some((d) => d.tipo === "autorizacion_imagen");

  const cambiar = async (valor) => {
    if (valor === player.autorizacion_fotografia) return;
    setSaving(true);
    await base44.entities.Player.update(player.id, { autorizacion_fotografia: valor });
    setSaving(false);
    toast.success(`${player.nombre}: ${valor === "SI AUTORIZO" ? "ahora autoriza" : "no autoriza"}`);
    onChanged({ ...player, autorizacion_fotografia: valor });
  };

  const subir = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });
    const docs = [...(player.documentos_adicionales || []), {
      nombre: `Autorización de imagen - ${file.name}`, url: file_uri, tipo: "autorizacion_imagen", fecha_subida: new Date().toISOString(),
    }];
    await base44.entities.Player.update(player.id, { documentos_adicionales: docs });
    setSaving(false);
    toast.success("Documento guardado en su ficha");
    onChanged({ ...player, documentos_adicionales: docs });
  };

  const actual = player.autorizacion_fotografia;
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5 flex-wrap">
      <span className="text-sm text-slate-800 flex items-center gap-2">
        {(player.nombre || "").trim()}
        {!actual && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">Sin responder</Badge>}
        {tieneDoc && <Badge variant="outline" className="text-xs">📎 Firmada</Badge>}
      </span>
      <div className="flex items-center gap-2">
        {saving && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        <div className="flex rounded-full border border-slate-200 overflow-hidden text-xs">
          {ESTADOS.map((e) => (
            <button key={e.v} disabled={saving} onClick={() => cambiar(e.v)}
              className={`px-3 py-1 font-medium ${actual === e.v
                ? (e.v === "SI AUTORIZO" ? "bg-green-600 text-white" : "bg-red-600 text-white")
                : "bg-white text-slate-500 hover:bg-slate-50"}`}>
              {e.label}
            </button>
          ))}
        </div>
        <button title="Adjuntar autorización firmada" disabled={saving} onClick={() => fileRef.current?.click()}
          className="p-1.5 rounded-full text-slate-400 hover:text-orange-600 hover:bg-orange-50">
          <Paperclip className="w-4 h-4" />
        </button>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={subir} />
      </div>
    </li>
  );
}