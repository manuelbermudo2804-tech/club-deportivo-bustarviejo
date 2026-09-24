import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Upload, Eye, Loader2, Sparkles, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { uploadPrivateFile, getSignedUrl } from "@/components/utils/privateUpload";
import { TAB_LABEL } from "@/components/subvencion/expedienteConfig";

const ESTADO_STYLE = {
  pendiente: "bg-amber-100 text-amber-800",
  listo: "bg-green-100 text-green-800",
  no_aplica: "bg-slate-100 text-slate-600",
};
const ESTADO_LABEL = { pendiente: "Pendiente", listo: "Listo", no_aplica: "No hace falta" };

export default function DocumentoRow({ def, doc, fechaLimite, onChange, onGoTab }) {
  const [uploading, setUploading] = useState(false);
  const estado = doc.estado || "pendiente";
  const caducaAntes = def.caduca && doc.fecha_caducidad && fechaLimite && doc.fecha_caducidad < fechaLimite;

  const upload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const uri = await uploadPrivateFile(file);
    await onChange({ archivo_uri: uri, archivo_nombre: file.name, estado: "listo" });
    setUploading(false);
    toast.success("Documento guardado");
  };

  const view = async () => {
    const url = await getSignedUrl(doc.archivo_uri);
    window.open(url, "_blank");
  };

  return (
    <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-2">
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="font-medium text-slate-800 text-sm">{def.titulo}</p>
          {def.opcional && <p className="text-xs text-slate-500">Solo si no consta ya en el expediente del Ayuntamiento</p>}
          {def.ayuda && <p className="text-xs text-slate-500">{def.ayuda}</p>}
          {doc.archivo_nombre && <p className="text-xs text-green-700 mt-1">📎 {doc.archivo_nombre}</p>}
        </div>
        <Badge className={ESTADO_STYLE[estado]}>{ESTADO_LABEL[estado]}</Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {def.auto && (
          <Button size="sm" variant="outline" onClick={() => onGoTab(def.auto)} className="text-orange-700 border-orange-200">
            <Sparkles className="w-3.5 h-3.5 mr-1" /> Generar en «{TAB_LABEL[def.auto]}»
          </Button>
        )}
        <label className="inline-flex">
          <input type="file" className="hidden" onChange={upload} disabled={uploading} accept=".pdf,.jpg,.jpeg,.png,.xlsx,.docx" />
          <span className="inline-flex items-center gap-1 text-xs px-3 h-8 rounded-md border border-slate-200 cursor-pointer hover:bg-slate-50">
            {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
            {doc.archivo_uri ? "Sustituir archivo" : def.auto ? "Subir versión firmada" : "Subir archivo"}
          </span>
        </label>
        {doc.archivo_uri && (
          <Button size="sm" variant="ghost" onClick={view}><Eye className="w-3.5 h-3.5 mr-1" /> Ver</Button>
        )}
        <Select value={estado} onValueChange={(v) => onChange({ estado: v })}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="listo">Listo</SelectItem>
            <SelectItem value="no_aplica">No hace falta</SelectItem>
          </SelectContent>
        </Select>
        {def.caduca && (
          <div className="flex items-center gap-1 text-xs text-slate-500">
            Caduca:
            <Input type="date" className="h-8 w-36 text-xs" value={doc.fecha_caducidad || ""} onChange={(e) => onChange({ fecha_caducidad: e.target.value })} />
          </div>
        )}
      </div>
      {caducaAntes && (
        <p className="text-xs text-red-600 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" /> Caduca antes de la fecha límite: pide uno nuevo cerca de la entrega.
        </p>
      )}
    </div>
  );
}