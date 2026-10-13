import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Users, CalendarDays, ClipboardList } from "lucide-react";
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
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-24 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      <header className="relative isolate flex min-w-0 flex-col gap-4 overflow-hidden rounded-3xl border border-orange-500/20 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7 lg:flex-row lg:items-center lg:justify-between"><div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div className="min-w-0">
            <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Participación · Club Deportivo Bustarviejo</p>
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Junta de Socios</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Gestiona la convocatoria, revisa las respuestas y organiza la asistencia de los socios.</p>
          </div>
        </div>
        <div className="relative w-full min-w-0 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm lg:w-auto lg:min-w-72">
          <label htmlFor="junta-selector" className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-orange-200">Junta que estás gestionando</label>
          <select id="junta-selector" className="w-full min-w-0 rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm font-semibold text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-orange-500" value={juntaId || ""} onChange={(e) => setJuntaId(e.target.value || null)}>
            {juntas.length === 0 && <option value="">Crear la primera junta</option>}
            {juntas.map((j) => <option key={j.id} value={j.id}>{j.titulo || "Junta General"} · {j.fecha?.slice(0, 10) || "Sin fecha"}</option>)}
            {juntas.length > 0 && <option value="">+ Nueva junta</option>}
          </select>
        </div>
      </header>

      <div className="flex min-w-0 items-start gap-3 rounded-2xl border border-orange-100 bg-white p-4 shadow-sm sm:p-5">
        <ClipboardList className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
        <div>
          <p className="text-sm font-semibold text-slate-800">{junta ? "Estás editando una junta existente" : "Crear una nueva junta"}</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">{junta ? "Modifica los datos y pulsa «Guardar cambios». La opción de cancelar elimina la junta, así que úsala con cuidado." : "Completa los datos de la convocatoria y pulsa «Crear junta» para empezar."}</p>
        </div>
      </div>

      <section className="min-w-0 space-y-3">
        <div className="flex items-center gap-3 px-1">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 ring-1 ring-orange-100"><CalendarDays className="h-5 w-5 text-orange-600" /></div>
          <div className="min-w-0"><h2 className="text-base font-bold text-slate-900 sm:text-lg">Datos y configuración</h2><p className="text-xs text-slate-500 sm:text-sm">Prepara y publica la convocatoria de la junta.</p></div>
        </div>
        <JuntaConfigForm junta={junta} onSaved={onSaved} onDeleted={() => {
          setJuntaId(null);
          qc.setQueryData(["juntas"], (old = []) => old.filter((j) => j.id !== junta.id));
          qc.invalidateQueries({ queryKey: ["juntaActiva"] });
        }} />
      </section>

      {junta && (loadingRows ? <div className="rounded-2xl border border-slate-200 bg-white py-12 text-center shadow-sm"><Loader2 className="mx-auto h-7 w-7 animate-spin text-orange-600" /><p className="mt-3 text-sm text-slate-500">Cargando respuestas y asistentes…</p></div> : (
        <section className="min-w-0 space-y-4">
          <div className="flex items-center gap-3 px-1">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 ring-1 ring-orange-100"><Users className="h-5 w-5 text-orange-600" /></div>
            <div className="min-w-0"><h2 className="text-base font-bold text-slate-900 sm:text-lg">Asistencia y participación</h2><p className="text-xs text-slate-500 sm:text-sm">Resumen de respuestas y listado completo de participantes.</p></div>
          </div>
          <JuntaStats rows={rows} />
          <div className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-3 text-xs leading-relaxed text-slate-600 shadow-sm sm:text-sm">
            <ClipboardList className="mt-0.5 h-4 w-4 shrink-0" />
            <p>Se combinan las respuestas de la app y del formulario público. El sistema identifica a los socios cuando coincide el email o el nombre con los datos de Gestión de Socios.</p>
          </div>
          <JuntaAsistentesTabla rows={rows} />
        </section>
      ))}
    </div>
  );
}