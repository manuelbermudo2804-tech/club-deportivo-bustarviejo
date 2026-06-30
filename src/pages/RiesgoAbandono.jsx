import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2, RefreshCw, CheckCircle2 } from "lucide-react";
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
    <div className="max-w-4xl mx-auto p-4 space-y-5">
      {/* Hero */}
      <div className="rounded-2xl bg-gradient-to-br from-rose-600 to-orange-600 p-6 text-white">
        <div className="flex items-center gap-2 mb-2">
          <ShieldAlert className="w-7 h-7" />
          <h1 className="text-white m-0">Riesgo de Abandono</h1>
        </div>
        <p className="text-white/90 text-sm max-w-lg leading-relaxed">
          Detecta pronto jugadores con riesgo de dejar el club, combinando caída de asistencias,
          cuotas vencidas y lesiones/sanciones largas. Cuanto antes contactes a la familia, más fácil retenerlos.
        </p>
        <Button onClick={cargar} disabled={loading} className="mt-4 bg-white text-rose-700 hover:bg-white/90 font-semibold">
          {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analizando...</> : <><RefreshCw className="w-4 h-4 mr-2" /> Actualizar</>}
        </Button>
      </div>

      {/* Resumen */}
      {data?.meta && (
        <div className="grid grid-cols-3 gap-3">
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-red-600 m-0">{data.meta.alto}</p>
            <p className="text-xs text-slate-500 mt-0.5">Riesgo alto</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-amber-600 m-0">{data.meta.medio}</p>
            <p className="text-xs text-slate-500 mt-0.5">Riesgo medio</p>
          </CardContent></Card>
          <Card><CardContent className="p-3 text-center">
            <p className="text-2xl font-bold text-slate-700 m-0">{data.meta.analizados}</p>
            <p className="text-xs text-slate-500 mt-0.5">Analizados</p>
          </CardContent></Card>
        </div>
      )}

      {/* Filtros */}
      {data && (
        <div className="flex gap-2">
          {FILTROS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`text-sm font-medium rounded-full px-3 py-1.5 transition-colors ${
                filtro === f.key ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
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
        <div className="space-y-3">
          {jugadores.map((j) => <RiesgoCard key={j.jugador_id} jugador={j} />)}
        </div>
      )}
    </div>
  );
}