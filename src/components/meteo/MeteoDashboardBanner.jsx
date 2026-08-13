import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { CloudSun } from "lucide-react";
import { fetchPrevision, meteoEnFranja } from "@/lib/meteoApi";
import { evaluarMeteo, getGrupoCategoria, esIndoor } from "@/lib/meteoRules";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Aviso compacto en el dashboard: solo aparece si HOY hay algún entrenamiento
// al aire libre con condiciones ámbar/rojas y aún sin decisión tomada.
export default function MeteoDashboardBanner({ categorias = [] }) {
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const diaSemana = DIAS[hoy.getDay()];

  const { data } = useQuery({
    queryKey: ["meteoDashboardBanner", fecha, categorias.join(",")],
    queryFn: async () => {
      const [cfgs, horarios, decisiones, hourly] = await Promise.all([
        base44.entities.MeteoConfig.list().catch(() => []),
        base44.entities.TrainingSchedule.filter({ activo: true }).catch(() => []),
        base44.entities.MeteoDecision.filter({ fecha }).catch(() => []),
        fetchPrevision().catch(() => null),
      ]);
      if (!hourly) return [];
      const config = cfgs?.[0] || null;

      return (horarios || [])
        .filter((h) => h.dia_semana === diaSemana && !esIndoor(h.categoria))
        .filter((h) => !h.fecha_inicio || h.fecha_inicio <= fecha)
        .filter((h) => !categorias.length || categorias.includes(h.categoria))
        .filter((h) => !decisiones.some((d) => d.horario_id === h.id))
        .map((h) => {
          const meteo = meteoEnFranja(hourly, fecha, h.hora_inicio, h.hora_fin);
          if (!meteo) return null;
          const ev = evaluarMeteo(meteo, getGrupoCategoria(h.categoria), config);
          return { ...h, ...ev };
        })
        .filter((i) => i && i.nivel !== "verde")
        .sort((a, b) => (a.hora_inicio || "").localeCompare(b.hora_inicio || ""));
    },
    staleTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  const avisos = data || [];
  const hayRojo = avisos.some((a) => a.nivel === "rojo");
  const alerta = avisos.length > 0;
  const primero = avisos[0];

  // Botón SIEMPRE visible (sirve para cualquier aviso: tiempo, recoger antes,
  // cambio de campo...). Parpadea cuando la previsión es ámbar/roja.
  const estilo = hayRojo
    ? "border-red-400 bg-red-50 animate-pulse-strong"
    : alerta
      ? "border-amber-400 bg-amber-50 animate-pulse-strong"
      : "border-slate-700/50 bg-slate-800/60";

  return (
    <div className={`rounded-xl border-2 p-3 flex items-center gap-3 ${estilo}`}>
      <CloudSun className={`w-6 h-6 flex-shrink-0 ${hayRojo ? "text-red-600" : alerta ? "text-amber-600" : "text-sky-400"}`} />
      <div className="flex-1 min-w-0">
        <p className={`font-bold text-sm ${hayRojo ? "text-red-900" : alerta ? "text-amber-900" : "text-white"}`}>
          {hayRojo ? "🔴 Entrenamiento · condiciones malas hoy" : alerta ? "🟠 Entrenamiento · ojo al tiempo hoy" : "🏃 Entrenamiento"}
          {avisos.length > 1 && ` · ${avisos.length} entrenos`}
        </p>
        <p className={`text-xs truncate ${hayRojo ? "text-red-800" : alerta ? "text-amber-800" : "text-slate-400"}`}>
          {alerta
            ? `${primero.categoria} ${primero.hora_inicio} · ${primero.recomendacion}`
            : "Avisos, asistencia, ejercicios, pizarra y reportes"}
        </p>
      </div>
      <Link to={alerta ? "/MeteoClub" : "/EntrenamientoHub"} className="flex-shrink-0">
        <Button size="sm" className={hayRojo ? "bg-red-600 hover:bg-red-700" : alerta ? "bg-amber-600 hover:bg-amber-700" : "bg-sky-600 hover:bg-sky-700"}>
          {alerta ? "Decidir y avisar" : "Abrir"}
        </Button>
      </Link>
    </div>
  );
}