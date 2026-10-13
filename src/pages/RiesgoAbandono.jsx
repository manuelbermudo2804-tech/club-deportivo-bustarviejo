import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2, RefreshCw, CheckCircle2, Users, AlertTriangle, Activity } from "lucide-react";
import { toast } from "sonner";
import RiesgoCard from "../components/abandono/RiesgoCard";

const FILTROS = [
  { key: "todos", label: "Todos" },
  { key: "alto", label: "Alto" },
  { key: "medio", label: "Medio" },
  { key: "bajo", label: "Bajo" },
];

export default function RiesgoAbandono() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState("todos");

  const cargar = async () => {
    setLoading(true);
    try {
      const res = await base44.functions.invoke("detectarRiesgoAbandono", {});
      setData(res.data);
    } catch (e) {
      toast.error("No se pudo cargar el detector de abandono");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  const jugadores = (data?.jugadores || []).filter(
    (j) => filtro === "todos" || j.nivel === filtro
  );

  return (
    <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-8 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7">
      {/* Hero */}
      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14"><ShieldAlert className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" /></div>
          <div className="min-w-0 flex-1"><p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Área deportiva · Seguimiento de jugadores</p><h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">Riesgo de abandono</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
          Detecta pronto jugadores con riesgo de dejar el club, combinando caída de asistencias,
          cuotas vencidas y lesiones/sanciones largas. Cuanto antes contactes a la familia, más fácil retenerlos.
        </p></div></div>
        <Button onClick={cargar} disabled={loading} className="w-full shrink-0 rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-700 sm:w-auto">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Actualizar</>}
        </Button>
      </div></section>

      {/* Resumen */}
      {data?.meta && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="min-w-0 overflow-hidden rounded-2xl border border-red-100 bg-white shadow-sm"><CardContent className="flex items-center gap-3 p-4 sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-50"><AlertTriangle className="h-5 w-5 text-red-600" /></div><div><p className="m-0 text-2xl font-extrabold tracking-tight text-red-600">{data.meta.alto}</p><p className="mt-0.5 text-xs font-medium text-slate-500">Riesgo alto</p></div></CardContent></Card>
          <Card className="min-w-0 overflow-hidden rounded-2xl border border-amber-100 bg-white shadow-sm"><CardContent className="flex items-center gap-3 p-4 sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50"><Activity className="h-5 w-5 text-amber-600" /></div><div><p className="m-0 text-2xl font-extrabold tracking-tight text-amber-600">{data.meta.medio}</p><p className="mt-0.5 text-xs font-medium text-slate-500">Riesgo medio</p></div></CardContent></Card>
          <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><CardContent className="flex items-center gap-3 p-4 sm:p-5"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50"><Users className="h-5 w-5 text-orange-600" /></div><div><p className="m-0 text-2xl font-extrabold tracking-tight text-slate-800">{data.meta.analizados}</p><p className="mt-0.5 text-xs font-medium text-slate-500">Jugadores analizados</p></div></CardContent></Card>
        </div>
      )}

      {/* Filtros */}
      {data && (
        <div className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`text-sm font-medium rounded-full px-3 py-1.5 transition-colors ${
                filtro === f.key ? "bg-slate-900 text-white shadow-sm" : "bg-slate-50 text-slate-600 hover:bg-orange-50 hover:text-orange-700"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mx-auto" />
        </div>
      ) : jugadores.length === 0 ? (
        <Card><CardContent className="p-8 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
          <p className="text-slate-500">No hay jugadores con este nivel de riesgo. ¡Buena señal!</p>
        </CardContent></Card>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 xl:grid-cols-2">
          {jugadores.map((j) => <RiesgoCard key={j.jugador_id} jugador={j} />)}
        </div>
      )}
    </div>
  );
}