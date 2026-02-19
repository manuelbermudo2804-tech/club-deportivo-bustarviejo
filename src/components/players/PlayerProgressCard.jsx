import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, XCircle, Trophy, TrendingUp, Star, Clock } from "lucide-react";

function MonthlyBar({ label, pct, count, total }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-slate-400 w-8 text-right">{label}</span>
      <div className="flex-1 h-3 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${pct >= 80 ? "bg-green-500" : pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
          style={{ width: `${Math.max(pct, 4)}%` }}
        />
      </div>
      <span className="text-[10px] text-slate-300 w-14 text-right">{count}/{total} ({pct}%)</span>
    </div>
  );
}

const MONTH_SHORT = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];

export default function PlayerProgressCard({ player }) {
  const playerId = player?.id;
  const categories = useMemo(() => {
    return [player?.categoria_principal, ...(player?.categorias || [])].filter(Boolean);
  }, [player]);

  // Asistencias de los últimos 6 meses
  const sixMonthsAgo = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().split("T")[0];
  }, []);

  const { data: attendances = [], isLoading: loadingAtt } = useQuery({
    queryKey: ["playerProgress_att", playerId, sixMonthsAgo],
    queryFn: () => base44.entities.Attendance.filter({ fecha: { $gte: sixMonthsAgo } }),
    staleTime: 300000,
    enabled: !!playerId,
  });

  // Evaluaciones de este jugador
  const { data: evaluations = [], isLoading: loadingEval } = useQuery({
    queryKey: ["playerProgress_eval", playerId],
    queryFn: () => base44.entities.PlayerEvaluation.filter({ jugador_id: playerId }),
    staleTime: 300000,
    enabled: !!playerId,
  });

  // Convocatorias donde aparece este jugador
  const { data: callups = [] } = useQuery({
    queryKey: ["playerProgress_callups", playerId],
    queryFn: async () => {
      const all = await base44.entities.Convocatoria.list("-fecha_partido", 50);
      return all.filter((c) => c.jugadores_convocados?.some((j) => j.jugador_id === playerId));
    },
    staleTime: 300000,
    enabled: !!playerId,
  });

  // Filtrar asistencias por categorías del jugador
  const playerAttendances = useMemo(() => {
    return attendances.filter((a) => categories.includes(a.categoria));
  }, [attendances, categories]);

  // Calcular asistencia por mes
  const monthlyStats = useMemo(() => {
    const stats = {};
    playerAttendances.forEach((att) => {
      const entry = att.asistencias?.find((a) => a.jugador_id === playerId);
      if (!entry) return;
      const date = new Date(att.fecha);
      const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, "0")}`;
      if (!stats[key]) stats[key] = { total: 0, attended: 0, month: date.getMonth(), year: date.getFullYear() };
      stats[key].total++;
      if (entry.estado === "presente" || entry.estado === "tardanza") stats[key].attended++;
    });
    return Object.values(stats).sort((a, b) => (a.year - b.year) || (a.month - b.month));
  }, [playerAttendances, playerId]);

  // Totales globales
  const totalSessions = monthlyStats.reduce((s, m) => s + m.total, 0);
  const totalAttended = monthlyStats.reduce((s, m) => s + m.attended, 0);
  const globalPct = totalSessions > 0 ? Math.round((totalAttended / totalSessions) * 100) : 0;

  // Última evaluación visible para padres
  const latestEval = evaluations
    .filter((e) => e.visible_para_padres)
    .sort((a, b) => (b.fecha_evaluacion || "").localeCompare(a.fecha_evaluacion || ""))[0];

  // Partidos jugados (convocatorias pasadas)
  const today = new Date().toISOString().split("T")[0];
  const pastCallups = callups.filter((c) => c.fecha_partido < today);
  const totalCallups = callups.length;

  if (loadingAtt) {
    return (
      <Card className="bg-slate-800/50 border-slate-700 animate-pulse">
        <CardContent className="p-4 h-48" />
      </Card>
    );
  }

  return (
    <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700 overflow-hidden">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          {player.foto_url ? (
            <img src={player.foto_url} alt="" className="w-12 h-12 rounded-full object-cover ring-2 ring-orange-500" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-orange-600 flex items-center justify-center text-white font-bold">
              {player.nombre?.charAt(0)}
            </div>
          )}
          <div className="flex-1">
            <h3 className="text-white font-bold">{player.nombre}</h3>
            <p className="text-slate-400 text-xs">{player.categoria_principal || player.deporte}</p>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <CheckCircle2 className="w-4 h-4 text-green-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{globalPct}%</p>
            <p className="text-slate-400 text-[10px]">Asistencia</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <Trophy className="w-4 h-4 text-blue-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{pastCallups.length}</p>
            <p className="text-slate-400 text-[10px]">Partidos</p>
          </div>
          <div className="bg-slate-700/50 rounded-lg p-2 text-center">
            <Star className="w-4 h-4 text-yellow-400 mx-auto mb-1" />
            <p className="text-white font-bold text-lg">{totalCallups}</p>
            <p className="text-slate-400 text-[10px]">Convocado</p>
          </div>
        </div>

        {/* Gráfico asistencia mensual */}
        {monthlyStats.length > 0 && (
          <div className="space-y-1.5">
            <p className="text-slate-400 text-[10px] uppercase tracking-wider flex items-center gap-1">
              <TrendingUp className="w-3 h-3" /> Asistencia por mes
            </p>
            {monthlyStats.slice(-5).map((m) => (
              <MonthlyBar
                key={`${m.year}-${m.month}`}
                label={MONTH_SHORT[m.month]}
                pct={m.total > 0 ? Math.round((m.attended / m.total) * 100) : 0}
                count={m.attended}
                total={m.total}
              />
            ))}
          </div>
        )}

        {totalSessions === 0 && (
          <div className="text-center py-3">
            <Clock className="w-6 h-6 text-slate-500 mx-auto mb-1" />
            <p className="text-slate-500 text-xs">Aún no hay datos de asistencia</p>
          </div>
        )}

        {/* Última evaluación del entrenador */}
        {latestEval && (
          <div className="bg-indigo-900/20 border border-indigo-600/30 rounded-lg p-3 space-y-2">
            <p className="text-indigo-300 text-[10px] uppercase tracking-wider font-bold flex items-center gap-1">
              <Star className="w-3 h-3" /> Evaluación del entrenador
            </p>
            <div className="grid grid-cols-5 gap-1">
              {[
                { label: "Técnica", val: latestEval.tecnica },
                { label: "Táctica", val: latestEval.tactica },
                { label: "Física", val: latestEval.fisica },
                { label: "Actitud", val: latestEval.actitud },
                { label: "Equipo", val: latestEval.trabajo_equipo },
              ].map((item) => (
                <div key={item.label} className="text-center">
                  <div className="text-white font-bold text-sm">{item.val}/5</div>
                  <div className="text-[9px] text-slate-400">{item.label}</div>
                </div>
              ))}
            </div>
            {latestEval.fortalezas && (
              <p className="text-green-300 text-xs">💪 {latestEval.fortalezas}</p>
            )}
            {latestEval.aspectos_mejorar && (
              <p className="text-yellow-300 text-xs">📈 {latestEval.aspectos_mejorar}</p>
            )}
            <p className="text-slate-500 text-[9px]">
              {latestEval.entrenador_nombre} · {new Date(latestEval.fecha_evaluacion).toLocaleDateString("es-ES")}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}