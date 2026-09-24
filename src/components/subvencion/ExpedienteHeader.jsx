import React from "react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, CalendarClock } from "lucide-react";
import { DOCUMENTOS_BASE } from "@/components/subvencion/expedienteConfig";

export default function ExpedienteHeader({ exp, temporada, temporadas, onTemporada, updateExp }) {
  const docs = exp?.documentos || [];
  const hechos = DOCUMENTOS_BASE.filter((d) => ["listo", "no_aplica"].includes(docs.find((x) => x.clave === d.clave)?.estado)).length;
  const dias = exp?.fecha_limite_justificacion ? Math.ceil((new Date(exp.fecha_limite_justificacion) - new Date()) / 86400000) : null;

  return (
    <div className="bg-gradient-to-br from-emerald-900 to-emerald-800 rounded-3xl p-5 lg:p-7 text-white space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 flex items-center justify-center"><Landmark className="w-6 h-6 text-emerald-300" /></div>
        <div className="flex-1 min-w-[200px]">
          <h1 className="text-2xl lg:text-3xl font-bold">Expediente de subvención</h1>
          <p className="text-emerald-100 text-sm">Todo lo que pide el convenio, preparado durante la temporada</p>
        </div>
        <Select value={temporada} onValueChange={onTemporada}>
          <SelectTrigger className="w-44 bg-white/10 border-white/20 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>{temporadas.map((t) => <SelectItem key={t} value={t}>Temporada {t}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      {exp && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <label className="space-y-1"><span className="text-emerald-200 text-xs">Entidad</span>
              <Input defaultValue={exp.entidad} onBlur={(e) => e.target.value !== exp.entidad && updateExp({ entidad: e.target.value })} className="bg-white/10 border-white/20 text-white" /></label>
            <label className="space-y-1"><span className="text-emerald-200 text-xs">Importe concedido (€)</span>
              <Input type="number" defaultValue={exp.importe_concedido} onBlur={(e) => Number(e.target.value) !== exp.importe_concedido && updateExp({ importe_concedido: Number(e.target.value) })} className="bg-white/10 border-white/20 text-white" /></label>
            <label className="space-y-1"><span className="text-emerald-200 text-xs">Fecha límite de justificación</span>
              <Input type="date" defaultValue={exp.fecha_limite_justificacion} onBlur={(e) => e.target.value !== exp.fecha_limite_justificacion && updateExp({ fecha_limite_justificacion: e.target.value })} className="bg-white/10 border-white/20 text-white" /></label>
          </div>
          <div className="flex items-center gap-3 flex-wrap text-sm">
            <span>{hechos} de {DOCUMENTOS_BASE.length} documentos listos</span>
            <Progress value={(hechos / DOCUMENTOS_BASE.length) * 100} className="flex-1 min-w-[120px] h-2 bg-white/20" />
            {dias !== null && <span className="flex items-center gap-1 text-emerald-100"><CalendarClock className="w-4 h-4" /> {dias >= 0 ? `Quedan ${dias} días` : "Plazo vencido"}</span>}
          </div>
        </>
      )}
    </div>
  );
}