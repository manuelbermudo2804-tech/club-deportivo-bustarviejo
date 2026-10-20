import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Flame, Trophy, Star, Calendar, CreditCard, Cake } from "lucide-react";

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

// Calcular antigüedad en temporadas
const getAntiguedad = (createdDate) => {
  if (!createdDate) return 0;
  const created = new Date(createdDate);
  const now = new Date();
  const years = now.getFullYear() - created.getFullYear();
  return Math.max(1, years);
};

// Próximo cumpleaños
const getNextBirthday = (fechaNac) => {
  if (!fechaNac) return null;
  const nac = new Date(fechaNac);
  const now = new Date();
  const thisYear = new Date(now.getFullYear(), nac.getMonth(), nac.getDate());
  if (thisYear < now) thisYear.setFullYear(thisYear.getFullYear() + 1);
  const diff = Math.ceil((thisYear - now) / (1000 * 60 * 60 * 24));
  return diff;
};

export default function PlayerStatsWidget({ playerId, playerName, playerCategory, fechaNacimiento, createdDate, compact = false, showSharedStats = true }) {
  const currentSeason = getCurrentSeason();
  const normalizedSeason = currentSeason.replace(/-/g, "/").trim();

  // Evaluaciones del entrenador
  const { data: evaluations = [] } = useQuery({
    queryKey: ["playerEvals", playerId],
    queryFn: () => base44.entities.PlayerEvaluation.filter({ jugador_id: playerId }),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    enabled: !!playerId,
  });

  // Asistencia (entrenamientos)
  const { data: attendances = [] } = useQuery({
    queryKey: ["playerAttendance", playerId, playerCategory],
    queryFn: () => base44.entities.Attendance.filter({ categoria: playerCategory }),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    enabled: !!playerCategory,
  });

  // Convocatorias
  const { data: callups = [] } = useQuery({
    queryKey: ["playerCallups", playerId, playerCategory],
    queryFn: () => base44.entities.Convocatoria.filter({ categoria: playerCategory }),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    enabled: !!playerCategory,
  });

  // Goles oficiales importados desde el centro de competición (temporada actual).
  const { data: scorerRecords = [] } = useQuery({
    queryKey: ["playerScorerRecords", normalizedSeason],
    queryFn: () => base44.entities.Goleador.filter({ temporada: normalizedSeason, categoria: playerCategory }, "-goles", 500),
    staleTime: 300_000,
    refetchOnWindowFocus: true,
    enabled: !!playerName && !!playerCategory,
  });

  const normalizeName = (value) => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/).filter(Boolean).sort().join(" ");
  const normalizedPlayerName = normalizeName(playerName);
  const clubScorerRecords = scorerRecords.filter(record =>
    String(record.equipo || "").toUpperCase().includes("BUSTARVIEJO") &&
    normalizeName(record.jugador_nombre) === normalizedPlayerName
  );
  const playerGoals = clubScorerRecords.reduce((sum, record) => sum + (Number(record.goles) || 0), 0);

  // Pagos
  const { data: payments = [] } = useQuery({
    queryKey: ["playerPayments", playerId],
    queryFn: () => base44.entities.Payment.filter({ jugador_id: playerId }),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    enabled: !!playerId,
  });

  // === CALCULAR ESTADÍSTICAS ===

  // Confirmaciones de convocatoria: no equivalen a partidos realmente jugados.
  const convocadoEn = callups.filter(c => c.jugadores_convocados?.some(j => j.jugador_id === playerId));
  const totalConvocatorias = convocadoEn.length;
  const convocatoriasConfirmadas = convocadoEn.filter(c => {
    const j = c.jugadores_convocados?.find(j => j.jugador_id === playerId);
    return j?.confirmacion === "asistire";
  }).length;

  // Media de evaluación: usar solo puntuaciones numéricas existentes para evitar NaN.
  // La consulta ya está filtrada por jugador. No volver a filtrar por jugador_id,
  // porque algunas evaluaciones históricas pueden devolver ese campo con otro formato.
  const evaluationScores = (showSharedStats ? evaluations : [])
    .map(e => [e.tecnica, e.tactica, e.fisica, e.actitud, e.trabajo_equipo]
      .map(value => value === "" || value === null || value === undefined ? null : Number(value))
      .filter(value => value !== null && Number.isFinite(value)))
    .filter(values => values.length > 0)
    .map(values => values.reduce((sum, value) => sum + value, 0) / values.length);
  const avgEval = evaluationScores.length > 0
    ? (evaluationScores.reduce((sum, value) => sum + value, 0) / evaluationScores.length).toFixed(1)
    : null;

  // Racha de asistencia
  const playerAttendances = attendances
    .filter(a => a.asistencias?.some(att => String(att.jugador_id) === String(playerId)))
    .sort((a, b) => new Date(b.fecha || b.created_date || 0) - new Date(a.fecha || a.created_date || 0));

  const getAttendanceStatus = (attendance) => {
    const entry = attendance.asistencias?.find(a => String(a.jugador_id) === String(playerId));
    return String(entry?.estado || "").trim().toLowerCase();
  };
  const attendedStatus = status => ["presente", "tardanza", "asistio", "asistió"].includes(status);

  // Las faltas justificadas no rompen la racha (tampoco suman)
  let racha = 0;
  for (const att of playerAttendances) {
    const status = getAttendanceStatus(att);
    if (status === "justificado") continue;
    if (attendedStatus(status)) racha++;
    else break;
  }

  // Si no hay evaluaciones formales, usar la nota de actitud que pone el entrenador al pasar lista
  const actitudScores = playerAttendances
    .map(a => Number(a.asistencias?.find(x => String(x.jugador_id) === String(playerId))?.actitud))
    .filter(v => Number.isFinite(v) && v > 0);
  const avgEvalFinal = avgEval ?? (actitudScores.length > 0
    ? (actitudScores.reduce((s, v) => s + v, 0) / actitudScores.length).toFixed(1)
    : null);

  // Total entrenamientos asistidos
  const totalTrainings = playerAttendances.filter(a => attendedStatus(getAttendanceStatus(a))).length;
  const totalTrainingsSessions = playerAttendances.length;

  // Pagos al día
  const seasonPayments = payments.filter(p => {
    const norm = (p.temporada || "").replace(/-/g, "/").trim();
    // No atribuir pagos históricos sin categoría a una actividad concreta.
    return norm === normalizedSeason && !p.is_deleted && p.categoria_actividad === playerCategory;
  });
  const pendingPayments = seasonPayments.filter(p => p.estado === "Pendiente").length;
  const paymentsInReview = seasonPayments.filter(p => p.estado === "En revisión").length;
  const paymentStatus = pendingPayments === 0 && paymentsInReview === 0 && seasonPayments.length > 0;

  // Antigüedad
  const antiguedad = getAntiguedad(createdDate);

  // Cumpleaños
  const diasParaCumple = getNextBirthday(fechaNacimiento);
  const cumplePronto = diasParaCumple !== null && diasParaCumple <= 30;

  const stats = [
    { icon: "⚽", label: "Goles", value: String(playerGoals), color: "text-orange-800 bg-orange-50 border-orange-200", show: true },
    { icon: "🏟️", label: "Convocatorias", value: `${convocatoriasConfirmadas}/${totalConvocatorias}`, color: "text-blue-700 bg-blue-50 border-blue-200", show: totalConvocatorias > 0 },
    { icon: "⭐", label: "Evaluación general", value: avgEvalFinal ? `${avgEvalFinal}/5` : "—", color: "text-yellow-700 bg-yellow-50 border-yellow-200", show: showSharedStats },
    { icon: "📋", label: "Entrenamientos", value: `${totalTrainings}/${totalTrainingsSessions}`, color: "text-purple-700 bg-purple-50 border-purple-200", show: totalTrainingsSessions > 0 },
    { icon: "🔥", label: "Racha", value: racha > 0 ? `${racha} seguidos` : "—", color: "text-orange-700 bg-orange-50 border-orange-200", show: true },
    { icon: "💳", label: "Pagos", value: paymentStatus ? "Al día ✅" : pendingPayments > 0 ? `${pendingPayments} pend.` : paymentsInReview > 0 ? `${paymentsInReview} en revisión` : "—", color: paymentStatus ? "text-green-700 bg-green-50 border-green-200" : "text-amber-700 bg-amber-50 border-amber-200", show: seasonPayments.length > 0 },
    { icon: "🏅", label: "Antigüedad", value: `${antiguedad} temp.`, color: "text-slate-700 bg-slate-50 border-slate-200", show: showSharedStats },
  ];

  if (cumplePronto && showSharedStats) {
    stats.push({
      icon: "🎂",
      label: "Cumpleaños",
      value: diasParaCumple === 0 ? "¡Hoy!" : `En ${diasParaCumple} días`,
      color: "text-pink-700 bg-pink-50 border-pink-200",
      show: true,
    });
  }

  const visibleStats = stats.filter(s => s.show);

  if (compact) {
    // Versión compacta para PlayerCard
    return (
      <div className="grid grid-cols-4 gap-1.5">
        {visibleStats.slice(0, 4).map((stat, i) => (
          <div key={i} className={`rounded-lg border p-1.5 text-center ${stat.color}`}>
            <div className="text-base leading-none">{stat.icon}</div>
            <div className="text-xs font-bold mt-0.5">{stat.value}</div>
            <div className="text-[10px] opacity-70">{stat.label}</div>
          </div>
        ))}
        {visibleStats.length > 4 && (
          <>
            {visibleStats.slice(4).map((stat, i) => (
              <div key={i + 4} className={`rounded-lg border p-1.5 text-center ${stat.color}`}>
                <div className="text-base leading-none">{stat.icon}</div>
                <div className="text-xs font-bold mt-0.5">{stat.value}</div>
                <div className="text-[10px] opacity-70">{stat.label}</div>
              </div>
            ))}
          </>
        )}
      </div>
    );
  }

  // Versión expandida para PlayerProfile
  return (
    <div className="player-season-stats space-y-4">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-orange-600 mb-1">Tu rendimiento</p>
          <h3 className="font-extrabold text-slate-950 text-base sm:text-lg flex items-center gap-2">📊 {playerCategory} · Estadísticas de la temporada</h3>
        </div>
        <span className="hidden sm:inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-[11px] font-semibold text-slate-500">C.D. Bustarviejo</span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3">
        {visibleStats.map((stat, i) => (
          <div key={i} className={`player-stat-tile min-w-0 rounded-2xl border p-3 sm:p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md ${stat.color}`}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <span className="text-xl sm:text-2xl leading-none">{stat.icon}</span>
              <span className="h-1.5 w-1.5 rounded-full bg-current opacity-30" aria-hidden="true"></span>
            </div>
            <div className="text-lg sm:text-xl font-extrabold tracking-tight tabular-nums break-words">{stat.value}</div>
            <div className="text-[11px] sm:text-xs font-semibold opacity-70 mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Logros */}
      {(racha >= 5 || totalTrainings >= 20 || Number(avgEvalFinal) >= 4) && (
        <div className="player-achievements bg-gradient-to-r from-amber-50 via-white to-orange-50 border border-amber-200 rounded-2xl p-4 shadow-sm">
          <p className="text-sm font-extrabold text-amber-950 mb-3">🏅 Tus logros</p>
          <div className="flex flex-wrap gap-2">
            {racha >= 5 && <Badge className="bg-orange-100 text-orange-800 text-xs">🔥 Racha +5 entrenamientos</Badge>}
            {racha >= 10 && <Badge className="bg-orange-200 text-orange-900 text-xs">💪 Racha +10 entrenamientos</Badge>}
            {totalTrainings >= 20 && <Badge className="bg-purple-100 text-purple-800 text-xs">📋 +20 entrenamientos</Badge>}
            {totalTrainings >= 50 && <Badge className="bg-purple-200 text-purple-900 text-xs">🏆 +50 entrenamientos</Badge>}
            {Number(avgEvalFinal) >= 4 && <Badge className="bg-yellow-100 text-yellow-800 text-xs">⭐ Evaluación destacada</Badge>}
            {antiguedad >= 3 && <Badge className="bg-slate-200 text-slate-800 text-xs">🏅 Veterano ({antiguedad} temp.)</Badge>}
          </div>
        </div>
      )}
    </div>
  );
}