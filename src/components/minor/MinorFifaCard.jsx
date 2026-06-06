import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Flame, TrendingUp, Clock, Award, Goal, Target, Trophy } from "lucide-react";

/**
 * Carta tipo FIFA Ultimate Team (estilo referencia EA Sports).
 * Forma con corona arriba, foto circular grande, stats en píldoras de colores.
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

function calcAsistenciaPct(attendances, playerId) {
  if (!attendances?.length || !playerId) return 0;
  let presentes = 0, total = 0;
  attendances.forEach((a) => {
    const mine = a.asistencias?.find((x) => x.jugador_id === playerId);
    if (mine) { total++; if (mine.estado === "presente") presentes++; }
  });
  return total > 0 ? Math.round((presentes / total) * 100) : 0;
}

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

// Posición → código corto FIFA
function posCorta(posicion) {
  if (!posicion || posicion === "Sin asignar") return "JUG";
  const map = { "Portero": "POR", "Defensa": "DEF", "Medio": "MED", "Delantero": "DEL" };
  return map[posicion] || posicion.substring(0, 3).toUpperCase();
}

// Píldora de stat con icono coloreado a la izquierda
function StatPill({ icon: Icon, color, label, value }) {
  return (
    <div className="relative flex items-center bg-white/20 rounded-full overflow-hidden backdrop-blur-sm">
      {/* Icono circular a la izquierda */}
      <div
        className="flex items-center justify-center rounded-full shrink-0"
        style={{
          width: 34,
          height: 34,
          background: color,
          boxShadow: `0 2px 6px ${color}80`,
        }}
      >
        <Icon className="w-4 h-4 text-white" strokeWidth={2.5} />
      </div>
      {/* Texto */}
      <div className="flex-1 flex items-center justify-between px-3">
        <span className="text-white font-extrabold text-[11px] tracking-wider uppercase drop-shadow">
          {label}
        </span>
        <span className="text-white font-black text-base drop-shadow">
          {value}
        </span>
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
  const fullName = (player?.nombre || user?.full_name || "Jugador").toUpperCase();
  const edad = calcularEdad(player?.fecha_nacimiento);
  const dorsal = player?.numero_camiseta || "?";
  const posicion = posCorta(player?.posicion);
  const categoria = player?.categoria_principal || player?.deporte || "Jugador";

  const { asistenciaPct, racha } = useMemo(() => ({
    asistenciaPct: calcAsistenciaPct(attendances, player?.id),
    racha: calcRacha(attendances, player?.id),
  }), [attendances, player?.id]);

  // Nivel y XP (basado en stats reales)
  const { nivel, xpPct } = useMemo(() => {
    const score = asistenciaPct * 0.4 + Math.min(racha * 6, 100) * 0.2
      + Math.min(callupsCount * 8, 100) * 0.2 + Math.min(goles * 5, 100) * 0.2;
    const nivelNum = Math.max(1, Math.floor(score / 7) + 1);
    const pct = Math.round(((score / 7) - Math.floor(score / 7)) * 100);
    return { nivel: nivelNum, xpPct: pct };
  }, [asistenciaPct, racha, callupsCount, goles]);

  // Logros: cuántos badges desbloqueados
  const logrosCount = useMemo(() => {
    let n = 0;
    if (asistenciaPct >= 70) n++;
    if (asistenciaPct >= 90) n++;
    if (racha >= 3) n++;
    if (racha >= 10) n++;
    if (callupsCount >= 1) n++;
    if (callupsCount >= 5) n++;
    if (!isComplementaria && goles >= 1) n++;
    if (!isComplementaria && goles >= 5) n++;
    return n;
  }, [asistenciaPct, racha, callupsCount, goles, isComplementaria]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", bounce: 0.3, duration: 0.8 }}
      className="relative mx-auto w-full"
      style={{ maxWidth: 360 }}
    >
      {/* Glow exterior naranja */}
      <div
        className="absolute -inset-6 rounded-full blur-3xl opacity-50 pointer-events-none"
        style={{ background: "radial-gradient(circle at center, #fb923c, transparent 65%)" }}
      />

      {/* SVG card shape con forma FIFA (corona arriba, base tipo escudo) */}
      <div className="relative" style={{ filter: "drop-shadow(0 20px 40px rgba(234,88,12,0.5))" }}>
        <svg
          viewBox="0 0 360 540"
          className="w-full h-auto"
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            {/* Gradiente naranja FIFA */}
            <linearGradient id="cardBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="35%" stopColor="#f97316" />
              <stop offset="70%" stopColor="#ea580c" />
              <stop offset="100%" stopColor="#c2410c" />
            </linearGradient>
            {/* Brillo lateral */}
            <linearGradient id="shine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="white" stopOpacity="0" />
              <stop offset="50%" stopColor="white" stopOpacity="0.25" />
              <stop offset="100%" stopColor="white" stopOpacity="0" />
            </linearGradient>
            {/* Borde dorado */}
            <linearGradient id="border" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fcd34d" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#fcd34d" />
            </linearGradient>
          </defs>
          {/* Forma de la carta FIFA: corona arriba con curva, base con bordes redondeados */}
          <path
            d="M 60 30
               Q 100 30 130 18
               Q 180 0 230 18
               Q 260 30 300 30
               L 320 60
               Q 340 80 340 110
               L 340 480
               Q 340 510 310 520
               Q 270 535 180 535
               Q 90 535 50 520
               Q 20 510 20 480
               L 20 110
               Q 20 80 40 60
               Z"
            fill="url(#cardBg)"
            stroke="url(#border)"
            strokeWidth="3"
          />
          {/* Líneas de brillo diagonal */}
          <path
            d="M 60 30 Q 100 30 130 18 Q 180 0 230 18 Q 260 30 300 30 L 320 60 Q 340 80 340 110 L 340 480 Q 340 510 310 520 Q 270 535 180 535 Q 90 535 50 520 Q 20 510 20 480 L 20 110 Q 20 80 40 60 Z"
            fill="url(#shine)"
            opacity="0.4"
          />
        </svg>

        {/* Contenido superpuesto */}
        <div className="absolute inset-0 flex flex-col px-6 pt-5 pb-4">

          {/* HEADER: dorsal+pos izquierda, nivel+xp derecha */}
          <div className="flex items-start justify-between">
            {/* Dorsal + Posición */}
            <div className="flex items-baseline gap-2">
              <span className="text-white text-4xl font-black leading-none drop-shadow-lg">
                {dorsal}
              </span>
              <span className="text-white text-lg font-extrabold tracking-wider drop-shadow">
                {posicion}
              </span>
            </div>

            {/* Escudo del club (placeholder simple) + Nivel/XP */}
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-end">
                <span className="text-white text-[11px] font-extrabold tracking-wider drop-shadow">
                  NIVEL {nivel}
                </span>
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-white/90 text-[9px] font-bold">XP</span>
                  <div className="w-16 h-1.5 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${xpPct}%`,
                        background: "linear-gradient(90deg, #4ade80, #22c55e)",
                      }}
                    />
                  </div>
                </div>
                <span className="text-white/90 text-[9px] font-bold mt-0.5">{xpPct}%</span>
              </div>
              {/* Escudo */}
              <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/40">
                <span className="text-white text-[10px] font-black">CB</span>
              </div>
            </div>
          </div>

          {/* FOTO circular con anillo plateado/azul */}
          <div className="flex justify-center mt-3">
            <div className="relative" style={{ width: 130, height: 130 }}>
              {/* Anillo exterior con brillo */}
              <div
                className="absolute inset-0 rounded-full"
                style={{
                  background: "linear-gradient(135deg, #e0f2fe, #7dd3fc, #38bdf8, #0ea5e9, #e0f2fe)",
                  padding: 4,
                  boxShadow: "0 0 25px rgba(255,255,255,0.5)",
                }}
              >
                <div className="w-full h-full rounded-full bg-orange-600 overflow-hidden">
                  {player?.foto_url ? (
                    <img
                      src={player.foto_url}
                      alt={player.nombre}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-5xl">⚽</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* NOMBRE */}
          <div className="text-center mt-2">
            <div
              className="text-white font-black uppercase tracking-wide leading-tight drop-shadow-lg"
              style={{ fontSize: fullName.length > 14 ? 18 : 22 }}
            >
              {fullName}
            </div>
            <div className="text-white/90 text-[10px] font-bold tracking-widest uppercase mt-0.5 drop-shadow">
              {categoria} {edad ? `· ${edad} AÑOS` : ""}
            </div>
          </div>

          {/* STATS píldoras */}
          <div className="space-y-1.5 mt-3">
            <StatPill
              icon={Zap}
              color="linear-gradient(135deg, #22c55e, #15803d)"
              label="Asistencia"
              value={`${asistenciaPct}%`}
            />
            <StatPill
              icon={Flame}
              color="linear-gradient(135deg, #fb923c, #ea580c)"
              label="Racha"
              value={racha}
            />
            {!isComplementaria && (
              <StatPill
                icon={Goal}
                color="linear-gradient(135deg, #38bdf8, #0284c7)"
                label="Goles"
                value={goles}
              />
            )}
            <StatPill
              icon={Target}
              color="linear-gradient(135deg, #a78bfa, #7c3aed)"
              label="Convocatorias"
              value={callupsCount}
            />
          </div>

          {/* LOGROS */}
          <div className="flex flex-col items-center mt-3">
            <div className="flex items-center gap-2">
              {[Trophy, Goal, Flame, Target].map((Ic, i) => (
                <div
                  key={i}
                  className="w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: i < logrosCount
                      ? "linear-gradient(135deg, #fde047, #facc15)"
                      : "rgba(0,0,0,0.25)",
                  }}
                >
                  <Ic className="w-3.5 h-3.5 text-white" strokeWidth={2.5} />
                </div>
              ))}
            </div>
            <div className="text-white text-[10px] font-bold tracking-widest uppercase mt-1 drop-shadow">
              {logrosCount} LOGRO{logrosCount === 1 ? "" : "S"}
            </div>
          </div>

        </div>
      </div>
    </motion.div>
  );
}