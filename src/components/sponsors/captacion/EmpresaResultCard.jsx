import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, Mail, Globe, Plus, Send, Check } from "lucide-react";

export default function EmpresaResultCard({ empresa, yaGuardada, onGuardar, onPropuesta, guardando }) {
  return (
    <div className="bg-white border rounded-xl p-4 space-y-2 flex flex-col">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-slate-900">{empresa.nombre}</p>
          <p className="text-xs text-slate-500">{empresa.sector}</p>
        </div>
        {empresa.paquete_sugerido && <Badge variant="outline">{empresa.paquete_sugerido}</Badge>}
      </div>
      <p className="text-sm text-slate-700 flex-1">{empresa.por_que}</p>
      <div className="text-xs text-slate-600 space-y-1">
        {(empresa.direccion || empresa.localidad) && <p className="flex gap-1"><MapPin className="w-3 h-3 mt-0.5" />{[empresa.direccion, empresa.localidad].filter(Boolean).join(", ")}</p>}
        {empresa.telefono && <p className="flex gap-1"><Phone className="w-3 h-3 mt-0.5" />{empresa.telefono}</p>}
        {empresa.email && <p className="flex gap-1"><Mail className="w-3 h-3 mt-0.5" />{empresa.email}</p>}
        {empresa.web && <a href={empresa.web.startsWith("http") ? empresa.web : `https://${empresa.web}`} target="_blank" rel="noreferrer" className="flex gap-1 text-blue-600"><Globe className="w-3 h-3 mt-0.5" />{empresa.web}</a>}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 [&>button]:px-2">
        <Button size="sm" variant="outline" disabled={yaGuardada || guardando} onClick={onGuardar} className="flex-1">
          {yaGuardada ? <><Check className="w-4 h-4 mr-1" />Guardada</> : <><Plus className="w-4 h-4 mr-1" />Guardar</>}
        </Button>
        <Button size="sm" disabled={guardando} onClick={onPropuesta} className="flex-1 bg-amber-600 hover:bg-amber-700">
          <Send className="w-4 h-4 mr-1" />Propuesta
        </Button>
      </div>
    </div>
  );
}