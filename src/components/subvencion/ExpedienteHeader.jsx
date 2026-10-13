import React from "react";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, CalendarClock, FileCheck2 } from "lucide-react";
import { DOCUMENTOS_BASE } from "@/components/subvencion/expedienteConfig";

export default function ExpedienteHeader({ exp, temporada, temporadas, onTemporada, updateExp }) {
  const docs = exp?.documentos || [];
  const hechos = DOCUMENTOS_BASE.filter((d) => ["listo", "no_aplica"].includes(docs.find((x) => x.clave === d.clave)?.estado)).length;
  const dias = exp?.fecha_limite_justificacion ? Math.ceil((new Date(exp.fecha_limite_justificacion) - new Date()) / 86400000) : null;

  return (
    <section className="relative isolate min-w-0 overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
      <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
      <div className="relative space-y-4">
      <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:gap-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14"><Landmark className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" /></div>
        <div className="min-w-0 flex-1">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Administración · Ayudas públicas</p>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Expediente de subvención</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Toda la documentación, los gastos y los datos necesarios para justificar la ayuda de la temporada.</p>
        </div>
        <div className="w-full sm:w-48">
          <label className="mb-1.5 block text-xs font-semibold text-slate-300">Temporada</label>
        <Select value={temporada} onValueChange={onTemporada}>
          <SelectTrigger className="w-full rounded-xl border-white/20 bg-white/10 text-white"><SelectValue /></SelectTrigger>
          <SelectContent>{temporadas.map((t) => <SelectItem key={t} value={t}>Temporada {t}</SelectItem>)}</SelectContent>
        </Select>
        </div>
      </div>
      {exp && (
        <>
          <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
            <label className="space-y-1"><span className="text-xs font-medium text-slate-300">Entidad</span>
              <Input defaultValue={exp.entidad} onBlur={(e) => e.target.value !== exp.entidad && updateExp({ entidad: e.target.value })} className="bg-white/10 border-white/20 text-white" /></label>
            <label className="space-y-1"><span className="text-xs font-medium text-slate-300">Importe concedido (€)</span>
              <Input type="number" defaultValue={exp.importe_concedido} onBlur={(e) => Number(e.target.value) !== exp.importe_concedido && updateExp({ importe_concedido: Number(e.target.value) })} className="bg-white/10 border-white/20 text-white" /></label>
            <label className="space-y-1"><span className="text-xs font-medium text-slate-300">Fecha límite de justificación</span>
              <Input type="date" defaultValue={exp.fecha_limite_justificacion} onBlur={(e) => e.target.value !== exp.fecha_limite_justificacion && updateExp({ fecha_limite_justificacion: e.target.value })} className="bg-white/10 border-white/20 text-white" /></label>
          </div>
          <div className="flex min-w-0 flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 sm:flex-row sm:items-center sm:gap-4 sm:p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><FileCheck2 className="h-4 w-4 shrink-0 text-orange-300" /><span>{hechos} de {DOCUMENTOS_BASE.length} documentos listos</span></div>
            <Progress value={(hechos / DOCUMENTOS_BASE.length) * 100} className="h-2 min-w-0 flex-1 bg-white/20" />
            {dias !== null && <span className={`flex shrink-0 items-center gap-1 text-sm ${dias < 0 ? "text-red-200" : "text-slate-200"}`}><CalendarClock className="h-4 w-4" /> {dias >= 0 ? `Quedan ${dias} días` : "Plazo vencido"}</span>}
          </div>
        </>
      )}
      </div>
    </section>
  );
}