import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

const media = (ev) => {
  const vals = [ev.tecnica, ev.tactica, ev.fisica, ev.actitud, ev.trabajo_equipo].filter((v) => typeof v === "number");
  if (!vals.length) return null;
  return vals.reduce((s, v) => s + v, 0) / vals.length;
};

/**
 * Datos de evolución de un jugador: evaluaciones, objetivos, notas y asistencia.
 * Si isStaff es false, solo devuelve lo marcado como visible para las familias.
 */
export default function usePlayerEvolution(player, isStaff = false) {
  const playerId = player?.id;

  const categories = useMemo(
    () => [player?.categoria_principal, player?.deporte, ...(player?.categorias || [])].filter(Boolean),
    [player]
  );

  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  }, []);

  const { data: evaluations = [], isLoading: loadingEval } = useQuery({
    queryKey: ["evolution_eval", playerId, isStaff],
    queryFn: async () => {
      const all = await base44.entities.PlayerEvaluation.filter({ jugador_id: playerId });
      return all
        .filter((e) => isStaff || e.visible_para_padres)
        .sort((a, b) => (a.fecha_evaluacion || "").localeCompare(b.fecha_evaluacion || ""));
    },
    staleTime: 300000,
    enabled: !!playerId,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["evolution_goals", playerId, isStaff],
    queryFn: async () => {
      const all = await base44.entities.PlayerGoal.filter({ jugador_id: playerId });
      return all.filter((g) => isStaff || g.visible_para_padres);
    },
    staleTime: 300000,
    enabled: !!playerId,
  });

  const { data: notes = [] } = useQuery({
    queryKey: ["evolution_notes", playerId, isStaff],
    queryFn: async () => {
      const all = await base44.entities.PlayerDevelopmentNote.filter({ jugador_id: playerId });
      return all
        .filter((n) => isStaff || n.visible_para_padres)
        .sort((a, b) => (b.fecha_evento || b.created_date || "").localeCompare(a.fecha_evento || a.created_date || ""));
    },
    staleTime: 300000,
    enabled: !!playerId,
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ["evolution_att", playerId, sixMonthsAgo],
    queryFn: () => base44.entities.Attendance.filter({ fecha: { $gte: sixMonthsAgo } }),
    staleTime: 300000,
    enabled: !!playerId,
  });

  // Asistencia mensual (últimos 6 meses) en las categorías del jugador
  const attendanceByMonth = useMemo(() => {
    const stats = {};
    attendances
      .filter((a) => categories.includes(a.categoria))
      .forEach((att) => {
        const entry = att.asistencias?.find((a) => a.jugador_id === playerId);
        if (!entry) return;
        const date = new Date(att.fecha);
        const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
        if (!stats[key]) stats[key] = { total: 0, attended: 0, month: date.getMonth(), year: date.getFullYear() };
        stats[key].total++;
        if (entry.estado === "presente" || entry.estado === "tardanza") stats[key].attended++;
      });
    return Object.values(stats)
      .sort((a, b) => a.year - b.year || a.month - b.month)
      .map((m) => ({
        mes: MONTH_SHORT[m.month],
        asistencia: m.total > 0 ? Math.round((m.attended / m.total) * 100) : 0,
        sesiones: m.total,
        asistidas: m.attended,
      }));
  }, [attendances, categories, playerId]);

  // Evolución de la valoración del entrenador
  const evaluationChart = useMemo(
    () =>
      evaluations
        .map((ev) => ({
          fecha: ev.fecha_evaluacion ? ev.fecha_evaluacion.slice(8, 10) + "/" + ev.fecha_evaluacion.slice(5, 7) : "",
          media: media(ev) ? Number(media(ev).toFixed(1)) : null,
          tecnica: ev.tecnica,
          tactica: ev.tactica,
          fisica: ev.fisica,
          actitud: ev.actitud,
          trabajo_equipo: ev.trabajo_equipo,
        }))
        .filter((d) => d.media !== null),
    [evaluations]
  );

  const stats = useMemo(() => {
    const totalSessions = attendanceByMonth.reduce((s, m) => s + m.sesiones, 0);
    const attended = attendanceByMonth.reduce((s, m) => s + m.asistidas, 0);
    const medias = evaluations.map(media).filter((v) => v !== null);
    return {
      totalSessions,
      attendedSessions: attended,
      attendanceRate: totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0,
      totalEvaluations: evaluations.length,
      avgScore: medias.length ? (medias.reduce((s, v) => s + v, 0) / medias.length).toFixed(1) : null,
      activeGoals: goals.filter((g) => g.estado === "En progreso" || g.estado === "Pendiente").length,
      completedGoals: goals.filter((g) => g.estado === "Completado" || g.completada).length,
      totalNotes: notes.length,
    };
  }, [attendanceByMonth, evaluations, goals, notes]);

  const latestEvaluation = evaluations.length ? evaluations[evaluations.length - 1] : null;

  return { evaluations, latestEvaluation, goals, notes, attendanceByMonth, evaluationChart, stats, isLoading: loadingEval };
}

export { media as mediaEvaluacion };