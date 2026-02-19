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

export default function PlayerStatsWidget({ playerId, playerCategory, fechaNacimiento, createdDate, compact = false }) {
  const currentSeason = getCurrentSeason();
  const normalizedSeason = currentSeason.replace(/-/g, "/").trim();

  // Goles de la temporada
  const { data: matchResults = [] } = useQuery({
    queryKey: ["playerGoals", playerId, playerCategory],
    queryFn: () => base44.entities.MatchResult.filter({ categoria: playerCategory }),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    enabled: !!playerCategory,
  });

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

  // Pagos
  const { data: payments = [] } = useQuery({
    queryKey: ["playerPayments", playerId],
    queryFn: () => base44.entities.Payment.filter({ jugador_id: playerId }),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    enabled: !!playerId,
  });

  // === CALCULAR ESTADÍSTICAS ===

  // Goles
  const totalGoals = matchResults.reduce((sum, match) => {
    const playerStats = (match.jugadores_destacados || []).find(j => j.jugador_id === playerId);
    return sum + (playerStats?.goles || 0);
  }, 0);

  // Partidos jugados vs convocados
  const convocadoEn = callups.filter(c => c.jugadores_convocados?.some(j => j.jugador_id === playerId));
  const partidosConvocados = convocadoEn.length;
  const partidosAsistidos = convocadoEn.filter(c => {
    const j = c.jugadores_convocados?.find(j => j.jugador_id === playerId);
    return j?.confirmacion === "asistire";
  }).length;

  // Media de evaluación
  const playerEvals = evaluations.filter(e => e.jugador_id === playerId);
  const avgEval = playerEvals.length > 0
    ? (playerEvals.reduce((sum, e) => sum + ((e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5), 0) / playerEvals.length).toFixed(1)
    : null;

  // Racha de asistencia
  const playerAttendances = attendances
    .filter(a => a.asistencias?.some(att => att.jugador_id === playerId))
    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  
  let racha = 0;
  for (const att of playerAttendances) {
    const playerAtt = att.asistencias.find(a => a.jugador_id === playerId);
    if (playerAtt?.estado === "presente") {
      racha++;
    } else {
      break;
    }
  }

  // Total entrenamientos asistidos
  const totalTrainings = playerAttendances.filter(a => {
    const p = a.asistencias.find(att => att.jugador_id === playerId);
    return p?.estado === "presente";
  }).length;
  const totalTrainingsSessions = playerAttendances.length;

  // Pagos al día
  const seasonPayments = payments.filter(p => {
    const norm = (p.temporada || "").replace(/-/g, "/").trim();
    return norm === normalizedSeason && !p.is_deleted;
  });
  const pendingPayments = seasonPayments.filter(p => p.estado === "Pendiente").length;
  const paymentStatus = pendingPayments === 0 && seasonPayments.length > 0;

  // Antigüedad
  const antiguedad = getAntiguedad(createdDate);

  // Cumpleaños
  const diasParaCumple = getNextBirthday(fechaNacimiento);
  const cumplePronto = diasParaCumple !== null && diasParaCumple <= 30;

  const stats = [
    { icon: "⚽", label: "Goles", value: totalGoals, color: "text-green-700 bg-green-50 border-green-200", show: true },
    { icon: "🏟️", label: "Partidos", value: `${partidosAsistidos}/${partidosConvocados}`, color: "text-blue-700 bg-blue-50 border-blue-200", show: partidosConvocados > 0 },
    { icon: "⭐", label: "Evaluación", value: avgEval ? `${avgEval}/5` : "—", color: "text-yellow-700 bg-yellow-50 border-yellow-200", show: true },
    { icon: "📋", label: "Entrenamientos", value: `${totalTrainings}/${totalTrainingsSessions}`, color: "text-purple-700 bg-purple-50 border-purple-200", show: totalTrainingsSessions > 0 },
    { icon: "🔥", label: "Racha", value: racha > 0 ? `${racha} seguidos` : "—", color: "text-orange-700 bg-orange-50 border-orange-200", show: true },
    { icon: "💳", label: "Pagos", value: paymentStatus ? "Al día ✅" : pendingPayments > 0 ? `${pendingPayments} pend.` : "—", color: paymentStatus ? "text-green-700 bg-green-50 border-green-200" : "text-red-700 bg-red-50 border-red-200", show: seasonPayments.length > 0 },
    { icon: "🏅", label: "Antigüedad", value: `${antiguedad} temp.`, color: "text-slate-700 bg-slate-50 border-slate-200", show: true },
  ];

  if (cumplePronto) {
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
    <div className="space-y-3">
      <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
        📊 Estadísticas de la Temporada
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {visibleStats.map((stat, i) => (
          <div key={i} className={`rounded-xl border-2 p-3 text-center transition-all hover:scale-105 ${stat.color}`}>
            <div className="text-2xl mb-1">{stat.icon}</div>
            <div className="text-lg font-bold">{stat.value}</div>
            <div className="text-xs opacity-70">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Logros */}
      {(totalGoals > 0 || racha >= 5 || totalTrainings >= 20 || avgEval >= 4) && (
        <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-xl p-3">
          <p className="text-xs font-bold text-yellow-900 mb-2">🏅 Logros</p>
          <div className="flex flex-wrap gap-2">
            {totalGoals >= 1 && <Badge className="bg-green-100 text-green-800 text-xs">⚽ Goleador ({totalGoals})</Badge>}
            {totalGoals >= 5 && <Badge className="bg-green-200 text-green-900 text-xs">🔥 Pichichi (+5 goles)</Badge>}
            {racha >= 5 && <Badge className="bg-orange-100 text-orange-800 text-xs">🔥 Racha +5 entrenamientos</Badge>}
            {racha >= 10 && <Badge className="bg-orange-200 text-orange-900 text-xs">💪 Racha +10 entrenamientos</Badge>}
            {totalTrainings >= 20 && <Badge className="bg-purple-100 text-purple-800 text-xs">📋 +20 entrenamientos</Badge>}
            {totalTrainings >= 50 && <Badge className="bg-purple-200 text-purple-900 text-xs">🏆 +50 entrenamientos</Badge>}
            {avgEval >= 4 && <Badge className="bg-yellow-100 text-yellow-800 text-xs">⭐ Evaluación destacada</Badge>}
            {antiguedad >= 3 && <Badge className="bg-slate-200 text-slate-800 text-xs">🏅 Veterano ({antiguedad} temp.)</Badge>}
          </div>
        </div>
      )}
    </div>
  );
}