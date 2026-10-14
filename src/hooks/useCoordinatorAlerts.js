import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { fechaISO } from "@/lib/sinEntrenamiento";

// Avisos de supervisión del coordinador: convocatorias sin publicar (partido en ≤2 días)
// y equipos con entrenamientos que llevan 7 días sin pasar lista.
export default function useCoordinatorAlerts(enabled) {
  const hoy = new Date();
  const en2 = new Date(); en2.setDate(en2.getDate() + 2);
  const hace7 = new Date(); hace7.setDate(hace7.getDate() - 7);

  const { data: unpublishedCallups = 0 } = useQuery({
    queryKey: ["coordUnpublishedCallups", fechaISO(hoy)],
    queryFn: () => base44.entities.Convocatoria.count({
      publicada: false, cerrada: false,
      estado_convocatoria: { $ne: "cancelada" },
      fecha_partido: { $gte: fechaISO(hoy), $lte: fechaISO(en2) },
    }),
    enabled, staleTime: 5 * 60_000,
  });

  const { data: teamsWithoutAttendance = [] } = useQuery({
    queryKey: ["coordTeamsNoAttendance", fechaISO(hoy)],
    queryFn: async () => {
      const [sched, att] = await Promise.all([
        base44.entities.TrainingSchedule.filter({ activo: true }, { distinct: "categoria" }),
        base44.entities.Attendance.filter({ fecha: { $gte: fechaISO(hace7) } }, { distinct: "categoria" }),
      ]);
      const hechos = new Set(att.items || []);
      return (sched.items || []).filter((c) => c && !hechos.has(c));
    },
    enabled, staleTime: 10 * 60_000,
  });

  return { unpublishedCallups, teamsWithoutAttendance };
}