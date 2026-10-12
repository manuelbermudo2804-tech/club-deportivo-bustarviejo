import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Users, CalendarDays, ClipboardList, PlusCircle } from "lucide-react";
import JuntaConfigForm from "@/components/junta/JuntaConfigForm";
import JuntaStats from "@/components/junta/JuntaStats";
import JuntaAsistentesTabla from "@/components/junta/JuntaAsistentesTabla";
import { unirRespuestas } from "@/lib/juntaUtils";

export default function JuntaSocios() {
  const qc = useQueryClient();
  const [juntaId, setJuntaId] = useState(null);
  const { data: juntas = [], isLoading } = useQuery({ queryKey: ["juntas"], queryFn: () => base44.entities.JuntaSocios.list("-fecha", 20), refetchOnMount: "always" });
  useEffect(() => { if (!juntaId && juntas.length) setJuntaId(juntas[0].id); }, [juntas, juntaId]);
  const junta = juntas.find((j) => j.id === juntaId) || null;

  const { data: rows = [], isLoading: loadingRows } = useQuery({
    queryKey: ["juntaRespuestas", junta?.id, junta?.landing_slug],
    enabled: !!junta,
    queryFn: async () => {
      const [app, web, socios, pages] = await Promise.all([
        base44.entities.JuntaAsistencia.filter({ junta_id: junta.id }, "-updated_date", 1000),
        junta.landing_slug ? base44.entities.LandingSubmission.filter({ landing_slug: junta.landing_slug }, "-created_date", 1000) : [],
        base44.entities.ClubMember.list("-created_date", 2000),
        junta.landing_slug ? base44.entities.LandingPage.filter({ slug: junta.landing_slug }) : [],
      ]);
      return unirRespuestas(app, web, socios, pages?.[0]?.config?.formulario?.campos || []);
    },
  });

  const onSaved = (saved) => {
    setJuntaId(saved.id);
    qc.invalidateQueries({ queryKey: ["juntas"] });
    qc.invalidateQueries({ queryKey: ["juntaActiva"] });
    qc.invalidateQueries({ queryKey: ["juntaRespuestas"] });
  };

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-orange-600" /></div>;

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 px-3 py-4 sm:px-4 sm:py-6 lg:px-6">
      <header className="flex flex-col gap-4 rounded-2xl border border-orange-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 p-4 shadow-lg sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-orange-600 shadow-md">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">Junta de Socios</h1>
            <p className="mt-1 text-sm text-orange-100/90">Organización, configuración y control de asistentes</p>
          </div>
        </div>
        <div className="w-full sm:w-auto sm:min-w-64">
          <label htmlFor="junta-selector" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-300">Junta que estás gestionando</label>
          <select id="junta-selector" className="w-full rounded-lg border border-slate-600 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-orange-500" value={juntaId || ""} onChange={(e) => setJuntaId(e.target.value || null)}>
            {juntas.length === 0 && <option value="">Crear la primera junta</option>}
            {juntas.map((j) => <option key={j.id} value={j.id}>{j.titulo || "Junta General"} · {j.fecha?.slice(0, 10) || "Sin fecha"}</option>)}
            {juntas.length > 0 && <option value="">+ Nueva junta</option>}
          </select>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5 sm:p-4">
        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
        <div>
          <p className="text-sm font-semibold text-slate-800">{junta ? "Estás editando una junta existente" : "Crear una nueva junta"}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{junta ? "Modifica los datos y pulsa «Guardar cambios». La opción de cancelar elimina la junta, así que úsala con cuidado." : "Completa los datos de la convocatoria y pulsa «Crear junta» para empezar."}</p>
        </div>
      </div>

      <section className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <CalendarDays className="h-5 w-5 text-orange-600" />
          <h2 className="text-base font-bold text-slate-900 sm:text-lg">Datos y configuración</h2>
        </div>
        <JuntaConfigForm junta={junta} onSaved={onSaved} onDeleted={() => {
          setJuntaId(null);
          qc.setQueryData(["juntas"], (old = []) => old.filter((j) => j.id !== junta.id));
          qc.invalidateQueries({ queryKey: ["juntaActiva"] });
        }} />
      </section>

      {junta && (loadingRows ? <div className="rounded-xl border bg-white py-12 text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-orange-600" /><p className="mt-3 text-sm text-slate-500">Cargando respuestas y asistentes…</p></div> : (
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Users className="h-5 w-5 text-orange-600" />
            <h2 className="text-base font-bold text-slate-900 sm:text-lg">Asistencia y participación</h2>
          </div>
          <JuntaStats rows={rows} />
          <div className="flex items-start gap-2 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs leading-relaxed text-blue-900 sm:text-sm">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Se combinan las respuestas de la app y del formulario público. El sistema identifica a los socios cuando coincide el email o el nombre con los datos de Gestión de Socios.</p>
          </div>
          <JuntaAsistentesTabla rows={rows} />
        </section>
      ))}
    </div>
  );
}