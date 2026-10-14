import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import useSinEntrenamiento from "@/hooks/useSinEntrenamiento";
import { esDiaSinEntreno, fechaISO } from "@/lib/sinEntrenamiento";

const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

// Entrenamientos de los últimos 7 días (ya terminados) de mis equipos sin lista pasada
export default function usePendingAttendance(categories = []) {
  const key = categories.join(",");
  const desde = new Date();
  desde.setDate(desde.getDate() - 7);
  const desdeISO = fechaISO(desde);

  const { data: schedules = [] } = useQuery({
    queryKey: ["coachSchedules", key],
    queryFn: () => base44.entities.TrainingSchedule.filter({ categoria: { $in: categories }, activo: true }),
    enabled: categories.length > 0,
    staleTime: 10 * 60_000,
  });
  const { data: attendances = [] } = useQuery({
    queryKey: ["coachTeamAttendances", key, desdeISO],
    queryFn: () => base44.entities.Attendance.filter({ categoria: { $in: categories }, fecha: { $gte: desdeISO } }, "-fecha", 100),
    enabled: categories.length > 0,
    staleTime: 5 * 60_000,
  });
  const cancelaciones = useSinEntrenamiento();

  return useMemo(() => {
    const now = new Date();
    const hechos = new Set(attendances.map((a) => `${a.categoria}|${(a.fecha || "").slice(0, 10)}`));
    let count = 0;
    for (let i = 0; i <= 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = fechaISO(d);
      schedules.forEach((s) => {
        if (s.dia_semana !== DIAS[d.getDay()]) return;
        if (s.fecha_inicio && iso < s.fecha_inicio) return;
        if (i === 0 && s.hora_fin) {
          const [h, m] = s.hora_fin.split(":").map(Number);
          const fin = new Date(d);
          fin.setHours(h, m, 0, 0);
          if (now < fin) return;
        }
        if (esDiaSinEntreno(cancelaciones, iso, s.categoria)) return;
        if (!hechos.has(`${s.categoria}|${iso}`)) count++;
      });
    }
    return count;
  }, [schedules, attendances, cancelaciones]);
}