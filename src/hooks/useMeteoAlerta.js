import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fetchPrevision, meteoEnFranja } from "@/lib/meteoApi";
import { evaluarMeteo, getGrupoCategoria, esIndoor } from "@/lib/meteoRules";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Devuelve los entrenamientos de HOY al aire libre con condiciones ámbar/rojas
// y aún SIN decisión tomada. Se usa en el banner del dashboard y en el badge
// del menú inferior.
export default function useMeteoAlerta(categorias = [], enabled = true) {
  const hoy = new Date();
  const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
  const diaSemana = DIAS[hoy.getDay()];

  const { data } = useQuery({
    queryKey: ["meteoAlerta", fecha, categorias.join(",")],
    enabled,
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
  return { avisos, alerta: avisos.length > 0, hayRojo: avisos.some((a) => a.nivel === "rojo") };
}