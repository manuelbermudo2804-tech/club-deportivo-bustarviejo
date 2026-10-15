import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FileText, Users } from "lucide-react";

export default function BoardMeetingForm({ meeting, onSubmit, onCancel, isSubmitting }) {
  const [data, setData] = React.useState(() => ({
    titulo: meeting?.titulo || "",
    fecha_reunion: meeting?.fecha_reunion || new Date().toISOString().slice(0, 10),
    asistentes: meeting?.asistentes || "",
    orden_del_dia: meeting?.orden_del_dia || "",
    resumen: meeting?.resumen || "",
    acuerdos: meeting?.acuerdos || ""
  }));
  const update = (field, value) => setData((current) => ({ ...current, [field]: value }));
  const submit = (event) => {
    event.preventDefault();
    if (!data.titulo.trim() || !data.fecha_reunion) return;
    onSubmit({ ...data, titulo: data.titulo.trim() });
  };

  return (
    <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-700"><FileText className="h-5 w-5" /></div>
        <div><h2 className="text-lg font-bold text-slate-900">{meeting ? "Editar acta" : "Registrar reunión de Junta"}</h2><p className="mt-1 text-sm text-slate-600">Deja constancia de lo hablado y de los acuerdos para que no se pierdan en los mensajes.</p></div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
        <div className="grid gap-2"><label className="text-sm font-medium" htmlFor="meeting-title">Título de la reunión *</label><Input id="meeting-title" required value={data.titulo} onChange={(event) => update("titulo", event.target.value)} placeholder="Ej. Reunión ordinaria de octubre" /></div>
        <div className="grid gap-2"><label className="text-sm font-medium" htmlFor="meeting-date">Fecha *</label><Input id="meeting-date" type="date" required value={data.fecha_reunion} onChange={(event) => update("fecha_reunion", event.target.value)} /></div>
      </div>
      <div className="grid gap-2"><label className="flex items-center gap-2 text-sm font-medium" htmlFor="meeting-attendees"><Users className="h-4 w-4" /> Asistentes</label><Input id="meeting-attendees" value={data.asistentes} onChange={(event) => update("asistentes", event.target.value)} placeholder="Nombres separados por comas" /></div>
      <div className="grid gap-2"><label className="text-sm font-medium" htmlFor="meeting-agenda">Puntos tratados / orden del día</label><Textarea id="meeting-agenda" rows={3} value={data.orden_del_dia} onChange={(event) => update("orden_del_dia", event.target.value)} placeholder="Temas que se han comentado…" /></div>
      <div className="grid gap-2"><label className="text-sm font-medium" htmlFor="meeting-summary">Resumen</label><Textarea id="meeting-summary" rows={3} value={data.resumen} onChange={(event) => update("resumen", event.target.value)} placeholder="Resumen breve de lo hablado…" /></div>
      <div className="grid gap-2"><label className="text-sm font-medium" htmlFor="meeting-decisions">Acuerdos y decisiones</label><Textarea id="meeting-decisions" rows={4} value={data.acuerdos} onChange={(event) => update("acuerdos", event.target.value)} placeholder="Anota las decisiones adoptadas. Después, crea una tarea por cada compromiso que requiera seguimiento." /></div>
      <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end"><Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button><Button type="submit" disabled={isSubmitting} className="bg-orange-600 text-white hover:bg-orange-700">{isSubmitting ? "Guardando…" : meeting ? "Guardar acta" : "Guardar acta"}</Button></div>
    </form>
  );
}
