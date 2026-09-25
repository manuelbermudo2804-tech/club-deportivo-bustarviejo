import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Loader2, ArrowRight, Building2, AlertTriangle } from "lucide-react";
import { TAB_LABEL } from "@/components/subvencion/expedienteConfig";
import { PLANTILLAS } from "@/components/subvencion/documentosPlantillas";
import { descargarDocumentoOficial } from "@/components/subvencion/pdfOficial";
import OtrasSubvencionesBloque from "@/components/subvencion/OtrasSubvencionesBloque";

const ESTADO_STYLE = { pendiente: "bg-amber-100 text-amber-800", listo: "bg-green-100 text-green-800", no_aplica: "bg-slate-100 text-slate-600" };
const ESTADO_LABEL = { pendiente: "Pendiente", listo: "Hecho", no_aplica: "No hace falta" };

export default function DocumentoRow({ def, doc, exp, onChange, onGoTab }) {
  const [bajando, setBajando] = useState(false);
  const estado = doc.estado || "pendiente";
  const caducaAntes = def.caduca && doc.fecha_caducidad && exp.fecha_limite_justificacion && doc.fecha_caducidad < exp.fecha_limite_justificacion;

  const descargar = async () => {
    setBajando(true);
    await descargarDocumentoOficial(PLANTILLAS[def.pdf](exp.temporada));
    setBajando(false);
  };

  return (
    <div className="p-3 border border-slate-200 rounded-xl bg-white space-y-2">
      <div className="flex items-start gap-2 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <p className="font-medium text-slate-800 text-sm">{def.titulo}</p>
          {def.opcional && <p className="text-xs text-slate-500">Solo si no consta ya en el expediente del Ayuntamiento</p>}
          {def.tipo === "externo" && <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5"><Building2 className="w-3.5 h-3.5" /> {def.emisor} Lo entregas directamente al Ayuntamiento.</p>}
        </div>
        <Badge className={ESTADO_STYLE[estado]}>{ESTADO_LABEL[estado]}</Badge>
      </div>

      {def.tipo === "otras" && <OtrasSubvencionesBloque temporada={exp.temporada} entidad={exp.entidad} />}

      <div className="flex items-center gap-2 flex-wrap">
        {def.tipo === "pdf" && (
          <Button size="sm" onClick={descargar} disabled={bajando} className="bg-orange-600 hover:bg-orange-700">
            {bajando ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <Download className="w-3.5 h-3.5 mr-1" />} Descargar PDF para firmar
          </Button>
        )}
        {def.tipo === "tab" && (
          <Button size="sm" variant="outline" onClick={() => onGoTab(def.auto)} className="text-orange-700 border-orange-200">
            <Download className="w-3.5 h-3.5 mr-1" /> Descargar en «{TAB_LABEL[def.auto]}»
          </Button>
        )}
        {def.tipo === "link" && (
          <Link to={def.link}>
            <Button size="sm" variant="outline" className="text-orange-700 border-orange-200">
              <ArrowRight className="w-3.5 h-3.5 mr-1" /> Generar en {def.linkLabel}
            </Button>
          </Link>
        )}
        <Select value={estado} onValueChange={(v) => onChange({ estado: v })}>
          <SelectTrigger className="w-36 h-8 text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="listo">Hecho</SelectItem>
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