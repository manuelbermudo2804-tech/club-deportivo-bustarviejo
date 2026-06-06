import React, { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Carta tipo FIFA para el panel del menor.
 * Resumen visual con 4 stats reales calculadas de los datos del jugador.
 * NO duplica los widgets de detalle de abajo — es solo el "gancho" visual.
 */

const calcularEdad = (fechaNac) => {
  if (!fechaNac) return null;
  const hoy = new Date();
  const nacimiento = new Date(fechaNac);
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const m = hoy.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && hoy.getDate() < nacimiento.getDate())) edad--;
  return edad;
};

// Calcula % asistencia de las últimas convocatorias de asistencia
function calcAsistenciaPct(attendances, playerId) {
  if (!attendances?.length || !playerId) return 0;
  let presentes = 0;
  let total = 0;
  attendances.forEach((a) => {
    const mine = a.asistencias?.find((x) => x.jugador_id === playerId);
    if (mine) {
      total++;
      if (mine.estado === "presente") presentes++;
    }
  });
  return total > 0 ? Math.round((presentes / total) * 100) : 0;
}

// Calcula racha actual de asistencias consecutivas
function calcRacha(attendances, playerId) {
  if (!attendances?.length || !playerId) return 0;
  const sorted = [...attendances].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
  let racha = 0;
  for (const a of sorted) {
    const mine = a.asistencias?.find((x) => x.jugador_id === playerId);
    if (!mine) continue;
    if (mine.estado === "presente") racha++;
    else break;
  }
  return racha;
}

// Determina tier de la carta según nivel (bronce/plata/oro)
function getTier(nivel) {
  if (nivel >= 75) return {
    name: "ORO",
    gradient: "from-yellow-400 via-amber-500 to-yellow-600",
    bgGlow: "from-yellow-500/40 via-amber-500/30 to-yellow-600/40",
    ring: "ring-yellow-300/80",
    text: "text-yellow-900",
    accent: "bg-yellow-900/20",
    border: "border-yellow-200",
  };
  if (nivel >= 50) return {
    name: "PLATA",
    gradient: "from-slate-300 via-slate-400 to-slate-500",
    bgGlow: "from-slate-300/40 via-slate-400/30 to-slate-500/40",
    ring: "ring-slate-200/80",
    text: "text-slate-900",
    accent: "bg-slate-900/20",
    border: "border-slate-200",
  };
  return {
    name: "BRONCE",
    gradient: "from-orange-700 via-amber-700 to-orange-800",
    bgGlow: "from-orange-700/40 via-amber-700/30 to-orange-800/40",
    ring: "ring-orange-400/80",
    text: "text-orange-50",
    accent: "bg-orange-950/30",
    border: "border-orange-300",
  };
}

function StatItem({ icon, label, value, suffix = "" }) {
  return (
    <div className="flex flex-col items-center justify-center">
      <div className="text-2xl font-black leading-none">
        {value}<span className="text-base font-bold">{suffix}</span>
      </div>
      <div className="flex items-center gap-1 mt-0.5 opacity-80">
        <span className="text-xs">{icon}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider">{label}</span>
      </div>
    </div>
  );
}

export default function MinorFifaCard({
  player,
  user,
  attendances = [],
  callupsCount = 0,
  goles = 0,
  isComplementaria = false,
}) {
  const firstName = player?.nombre?.split(" ")[0] || user?.full_name?.split(" ")[0] || "Jugador";
  const edad = calcularEdad(player?.fecha_nacimiento);

  // Cálculos de stats (solo presentación, sin lógica de negocio)
  const { asistenciaPct, racha, nivel, tier } = useMemo(() => {
    const pct = calcAsistenciaPct(attendances, player?.id);
    const r = calcRacha(attendances, player?.id);
    // Nivel 1-99 basado en stats reales
    const statGoles = isComplementaria ? 0 : Math.min(goles * 5, 100);
    const statConvoc = Math.min(callupsCount * 8, 100);
    // Si es complementaria, peso más en asistencia y racha
    const n = isComplementaria
      ? Math.round((pct * 0.5) + (Math.min(r * 6, 100) * 0.5))
      : Math.round((pct * 0.35) + (Math.min(r * 6, 100) * 0.25) + (statConvoc * 0.2) + (statGoles * 0.2));
    const nivelFinal = Math.max(1, Math.min(99, n || 1));
    return {
      asistenciaPct: pct,
      racha: r,
      nivel: nivelFinal,
      tier: getTier(nivelFinal),
    };
  }, [attendances, player?.id, callupsCount, goles, isComplementaria]);

  const posicionCorta = player?.posicion && player.posicion !== "Sin asignar"
    ? player.posicion.substring(0, 3).toUpperCase()
    : "JUG";
  const dorsal = player?.numero_camiseta || "?";

  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", bounce: 0.3, duration: 0.7 }}
      className="relative"
    >
      {/* Glow exterior */}
      <div className={`absolute -inset-2 bg-gradient-to-br ${tier.bgGlow} rounded-3xl blur-xl opacity-70`} />

      {/* Carta */}
      <div className={`relative bg-gradient-to-br ${tier.gradient} rounded-3xl p-4 shadow-2xl ring-2 ${tier.ring} overflow-hidden ${tier.text}`}>
        {/* Shimmer holográfico */}
        <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-50 pointer-events-none" />

        {/* Header: nivel + tier + posición + dorsal */}
        <div className="relative flex items-start justify-between mb-3">
          <div className="flex flex-col items-center">
            <div className="text-5xl font-black leading-none drop-shadow">{nivel}</div>
            <div className={`text-[10px] font-black tracking-widest mt-0.5 px-2 py-0.5 rounded-full ${tier.accent}`}>
              {tier.name}
            </div>
            <div className="text-xs font-bold mt-1.5">{posicionCorta}</div>
          </div>

          {/* Dorsal grande */}
          <div className="flex flex-col items-end">
            <div className={`text-[10px] font-bold uppercase tracking-wider opacity-70`}>Dorsal</div>
            <div className="text-4xl font-black leading-none drop-shadow">{dorsal}</div>
          </div>
        </div>

        {/* Foto + nombre */}
        <div className="relative flex items-center gap-3 mb-3">
          {player?.foto_url ? (
            <img
              src={player.foto_url}
              alt={player.nombre}
              className={`w-20 h-20 rounded-2xl object-cover ring-4 ${tier.ring} shadow-xl`}
            />
          ) : (
            <div className={`w-20 h-20 rounded-2xl bg-white/30 flex items-center justify-center ring-4 ${tier.ring} shadow-xl`}>
              <span className="text-4xl">⚽</span>
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-xl font-black leading-tight truncate uppercase drop-shadow">
              {firstName}
            </div>
            <div className="text-[11px] font-bold opacity-80 mt-0.5 truncate">
              {player?.categoria_principal || player?.deporte || "Jugador"}
            </div>
            {edad && (
              <div className="text-[10px] font-semibold opacity-70 mt-0.5">
                🎂 {edad} años
              </div>
            )}
          </div>
        </div>

        {/* Stats: 4 cuadrantes */}
        <div className={`relative grid ${isComplementaria ? "grid-cols-3" : "grid-cols-4"} gap-1 ${tier.accent} rounded-2xl p-3`}>
          <StatItem icon="⚡" label="Asist." value={asistenciaPct} suffix="%" />
          <StatItem icon="🔥" label="Racha" value={racha} />
          {!isComplementaria && (
            <StatItem icon="⚽" label="Goles" value={goles} />
          )}
          <StatItem icon="🎯" label="Convoc." value={callupsCount} />
        </div>

        {/* Footer */}
        <div className="relative mt-2 text-center">
          <div className="text-[9px] font-bold opacity-60 tracking-widest">
            CD BUSTARVIEJO · TEMPORADA 25/26
          </div>
        </div>
      </div>
    </motion.div>
  );
}