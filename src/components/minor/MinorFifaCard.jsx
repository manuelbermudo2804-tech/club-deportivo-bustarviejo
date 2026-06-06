import React, { useMemo } from "react";
import { motion } from "framer-motion";

/**
 * Carta tipo FIFA Ultimate Team para el panel del menor.
 * Diseño premium con foto vertical grande, fondo oscuro y efectos holográficos.
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

// Tier visual de la carta. Tres niveles tipo FIFA: ORO / PLATA / BRONCE.
function getTier(nivel) {
  if (nivel >= 75) return {
    name: "ORO",
    // Carta entera dorada (estilo FIFA Gold)
    bg: "linear-gradient(160deg, #4a3408 0%, #8a6b1f 35%, #f5d76e 50%, #8a6b1f 65%, #2d1f04 100%)",
    glow: "rgba(245, 215, 110, 0.55)",
    accentText: "#fff7d1",
    primaryText: "#fffbe6",
    statText: "#fffbe6",
    borderColor: "#f5d76e",
    framePhoto: "#f5d76e",
    stripe: "linear-gradient(90deg, transparent, rgba(255,247,210,0.35), transparent)",
  };
  if (nivel >= 50) return {
    name: "PLATA",
    bg: "linear-gradient(160deg, #1f2937 0%, #4b5563 35%, #d1d5db 50%, #4b5563 65%, #111827 100%)",
    glow: "rgba(209, 213, 219, 0.5)",
    accentText: "#f8fafc",
    primaryText: "#ffffff",
    statText: "#ffffff",
    borderColor: "#e5e7eb",
    framePhoto: "#e5e7eb",
    stripe: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)",
  };
  return {
    name: "BRONCE",
    bg: "linear-gradient(160deg, #2a1505 0%, #6b3815 35%, #c97a3b 50%, #6b3815 65%, #1a0a02 100%)",
    glow: "rgba(201, 122, 59, 0.55)",
    accentText: "#ffe4c4",
    primaryText: "#ffffff",
    statText: "#ffffff",
    borderColor: "#c97a3b",
    framePhoto: "#c97a3b",
    stripe: "linear-gradient(90deg, transparent, rgba(255,228,196,0.3), transparent)",
  };
}

function MainStat({ value, suffix = "", label, color }) {
  return (
    <div className="flex flex-col items-center">
      <div className="text-2xl font-black leading-none tracking-tight" style={{ color }}>
        {value}<span className="text-base">{suffix}</span>
      </div>
      <div className="text-[9px] font-extrabold uppercase tracking-[0.15em] mt-1 opacity-80" style={{ color }}>
        {label}
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

  const { asistenciaPct, racha, nivel, tier } = useMemo(() => {
    const pct = calcAsistenciaPct(attendances, player?.id);
    const r = calcRacha(attendances, player?.id);
    const statGoles = isComplementaria ? 0 : Math.min(goles * 5, 100);
    const statConvoc = Math.min(callupsCount * 8, 100);
    const n = isComplementaria
      ? Math.round((pct * 0.5) + (Math.min(r * 6, 100) * 0.5))
      : Math.round((pct * 0.35) + (Math.min(r * 6, 100) * 0.25) + (statConvoc * 0.2) + (statGoles * 0.2));
    // Mínimo 55 para que se vea con presencia desde el principio
    const nivelFinal = Math.max(55, Math.min(99, n || 55));
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
  const dorsal = player?.numero_camiseta;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, rotateY: -15 }}
      animate={{ opacity: 1, y: 0, rotateY: 0 }}
      transition={{ type: "spring", bounce: 0.35, duration: 0.9 }}
      className="relative mx-auto"
      style={{ maxWidth: 340, perspective: 1000 }}
    >
      {/* Glow exterior fuerte */}
      <div
        className="absolute -inset-4 rounded-[2rem] blur-2xl opacity-80 pointer-events-none"
        style={{ background: `radial-gradient(circle at center, ${tier.glow}, transparent 70%)` }}
      />

      {/* CARTA */}
      <div
        className="relative rounded-[2rem] overflow-hidden shadow-2xl"
        style={{
          background: tier.bg,
          aspectRatio: "63 / 88", // proporción real de carta FIFA
          border: `2px solid ${tier.borderColor}`,
          boxShadow: `0 25px 50px -12px ${tier.glow}, inset 0 0 60px rgba(0,0,0,0.3)`,
        }}
      >
        {/* Brillo holográfico diagonal */}
        <div
          className="absolute inset-0 pointer-events-none opacity-30"
          style={{
            background: "linear-gradient(135deg, transparent 30%, rgba(255,255,255,0.4) 50%, transparent 70%)",
          }}
        />

        {/* Patrón de líneas finas (textura premium) */}
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "repeating-linear-gradient(45deg, rgba(255,255,255,0.1) 0px, rgba(255,255,255,0.1) 1px, transparent 1px, transparent 8px)",
          }}
        />

        {/* CONTENIDO */}
        <div className="relative h-full flex flex-col p-5">

          {/* TOP ROW: Rating + Posición (izq) | Dorsal (der) */}
          <div className="flex items-start justify-between">
            {/* Rating + Posición vertical (estilo FIFA clásico) */}
            <div className="flex flex-col items-center">
              <div
                className="font-black leading-none tracking-tighter"
                style={{
                  fontSize: 56,
                  color: tier.primaryText,
                  textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {nivel}
              </div>
              <div
                className="font-black tracking-widest mt-1"
                style={{ fontSize: 14, color: tier.accentText, letterSpacing: "0.15em" }}
              >
                {posicionCorta}
              </div>
              {/* Línea decorativa */}
              <div className="w-8 h-px mt-1" style={{ background: tier.accentText, opacity: 0.5 }} />
              {/* Badge tier pequeño */}
              <div
                className="mt-1.5 px-2 py-0.5 rounded-full text-[8px] font-black tracking-[0.2em]"
                style={{ background: "rgba(0,0,0,0.4)", color: tier.accentText }}
              >
                {tier.name}
              </div>
            </div>

            {/* Dorsal grande arriba derecha */}
            {dorsal && (
              <div className="flex flex-col items-end">
                <div className="text-[8px] font-bold uppercase tracking-widest opacity-70" style={{ color: tier.accentText }}>
                  Dorsal
                </div>
                <div
                  className="font-black leading-none"
                  style={{
                    fontSize: 44,
                    color: tier.primaryText,
                    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  {dorsal}
                </div>
              </div>
            )}
          </div>

          {/* FOTO grande centrada (estilo FIFA: foto recortada al pecho) */}
          <div className="flex-1 flex items-center justify-center relative -mt-2">
            {player?.foto_url ? (
              <div
                className="relative"
                style={{
                  width: "70%",
                  aspectRatio: "1 / 1.15",
                }}
              >
                {/* Glow detrás de la foto */}
                <div
                  className="absolute inset-0 rounded-full blur-2xl opacity-60"
                  style={{ background: tier.glow }}
                />
                <img
                  src={player.foto_url}
                  alt={player.nombre}
                  className="relative w-full h-full object-cover object-top"
                  style={{
                    borderRadius: "50% 50% 12% 12% / 60% 60% 8% 8%",
                    border: `3px solid ${tier.framePhoto}`,
                    boxShadow: "0 8px 30px rgba(0,0,0,0.6)",
                  }}
                />
              </div>
            ) : (
              <div
                className="rounded-full flex items-center justify-center"
                style={{
                  width: "55%",
                  aspectRatio: "1",
                  background: "rgba(0,0,0,0.3)",
                  border: `3px solid ${tier.framePhoto}`,
                }}
              >
                <span style={{ fontSize: 60 }}>⚽</span>
              </div>
            )}
          </div>

          {/* NOMBRE */}
          <div className="text-center mb-2">
            <div
              className="font-black uppercase tracking-wide leading-tight truncate"
              style={{
                fontSize: 22,
                color: tier.primaryText,
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                fontFamily: "system-ui, -apple-system, sans-serif",
              }}
            >
              {firstName}
            </div>
            {/* Línea decorativa horizontal */}
            <div
              className="mx-auto mt-1 h-px"
              style={{ width: "60%", background: tier.stripe }}
            />
          </div>

          {/* STATS: fila inferior estilo FIFA */}
          <div
            className={`grid ${isComplementaria ? "grid-cols-3" : "grid-cols-4"} gap-1 px-1 pb-1`}
          >
            <MainStat value={asistenciaPct} suffix="%" label="ASI" color={tier.statText} />
            <MainStat value={racha} label="RAC" color={tier.statText} />
            {!isComplementaria && (
              <MainStat value={goles} label="GOL" color={tier.statText} />
            )}
            <MainStat value={callupsCount} label="CON" color={tier.statText} />
          </div>

          {/* Footer: categoría + edad + club */}
          <div className="text-center mt-2 pt-2" style={{ borderTop: `1px solid ${tier.borderColor}40` }}>
            <div
              className="text-[9px] font-bold tracking-[0.2em] uppercase"
              style={{ color: tier.accentText }}
            >
              {player?.categoria_principal || player?.deporte || "Jugador"}
              {edad && ` · ${edad} AÑOS`}
            </div>
            <div
              className="text-[8px] font-bold tracking-[0.25em] uppercase mt-0.5 opacity-70"
              style={{ color: tier.accentText }}
            >
              CD BUSTARVIEJO
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}