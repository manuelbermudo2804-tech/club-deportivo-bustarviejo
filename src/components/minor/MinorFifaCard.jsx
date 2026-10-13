import React, { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Flame, Goal, Target, Trophy, Star } from "lucide-react";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

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

function posCorta(posicion) {
  if (!posicion || posicion === "Sin asignar") return "JUG";
  const map = { Portero: "POR", Defensa: "DEF", Medio: "MED", Delantero: "DEL" };
  return map[posicion] || posicion.substring(0, 3).toUpperCase();
}

function StatTile({ icon: Icon, label, value, accent = false }) {
  return (
    <div className="relative min-w-0 overflow-hidden rounded-xl border border-amber-900/20 bg-white/65 px-3 py-2.5 shadow-sm">
      {accent && <div className="absolute inset-y-0 left-0 w-1 bg-orange-500" />}
      <div className="flex items-center gap-1.5 text-stone-700">
        <Icon className="h-3.5 w-3.5 text-orange-700" strokeWidth={2.5} />
        <span className="truncate text-[9px] font-extrabold uppercase tracking-[0.12em]">{label}</span>
      </div>
      <div className="mt-1 text-2xl font-black leading-none tracking-tight text-stone-900">{value}</div>
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
  const dorsal = player?.numero_camiseta || "—";
  const posicion = posCorta(player?.posicion);
  const categoria = player?.categoria_principal || player?.deporte || "Jugador";

  const { asistenciaPct, racha } = useMemo(() => ({
    asistenciaPct: calcAsistenciaPct(attendances, player?.id),
    racha: calcRacha(attendances, player?.id),
  }), [attendances, player?.id]);

  const { nivel, xpPct } = useMemo(() => {
    const score = asistenciaPct * 0.4 + Math.min(racha * 6, 100) * 0.2
      + Math.min(callupsCount * 8, 100) * 0.2 + Math.min(goles * 5, 100) * 0.2;
    const nivelNum = Math.max(1, Math.floor(score / 7) + 1);
    const pct = Math.round(((score / 7) - Math.floor(score / 7)) * 100);
    return { nivel: nivelNum, xpPct: pct };
  }, [asistenciaPct, racha, callupsCount, goles]);

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
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", bounce: 0.2, duration: 0.65 }}
      className="relative mx-auto w-full"
      style={{ maxWidth: 440 }}
    >
      <div className="pointer-events-none absolute -inset-3 rounded-[2.5rem] bg-orange-500/10 blur-2xl" />

      <div
        className="relative overflow-hidden"
        style={{
          clipPath: "polygon(24% 0, 76% 0, 87% 4%, 96% 13%, 100% 25%, 100% 87%, 88% 100%, 12% 100%, 0 87%, 0 25%, 4% 13%, 13% 4%)",
          background: "linear-gradient(135deg, #fff0a8 0%, #b97819 12%, #fff4bd 25%, #d99527 52%, #fff0a8 78%, #9b5a12 100%)",
          padding: 2,
          filter: "drop-shadow(0 18px 25px rgba(0,0,0,.42))",
        }}
      >
        <div
          className="relative overflow-hidden"
          style={{
            clipPath: "polygon(24% 0, 76% 0, 87% 4%, 96% 13%, 100% 25%, 100% 87%, 88% 100%, 12% 100%, 0 87%, 0 25%, 4% 13%, 13% 4%)",
            background: "linear-gradient(145deg, #fff9df 0%, #f3d58a 36%, #fff1bd 68%, #d7a34c 100%)",
          }}
        >
          {/* Graphic texture and orange angular accents */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div className="absolute -right-16 top-20 h-56 w-56 rotate-45 border border-orange-500/20" />
            <div className="absolute -right-10 top-28 h-44 w-44 rotate-45 border border-orange-500/10" />
            <div className="absolute left-0 top-0 h-1 w-2/3 bg-gradient-to-r from-orange-400 via-orange-600 to-transparent" />
            <div className="absolute bottom-0 right-0 h-1 w-1/2 bg-gradient-to-l from-orange-500 to-transparent" />
          </div>

          <div className="relative px-7 pb-7 pt-6">
            {/* Identity row */}
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[9px] font-black uppercase tracking-[0.28em] text-amber-950">C.D. BUSTARVIEJO</div>
                <div className="mt-1 flex items-end gap-2">
                  <span className="text-5xl font-black leading-none tracking-tighter text-stone-900">{dorsal}</span>
                  <span className="mb-0.5 rounded-md border border-amber-800/40 bg-orange-700 px-2 py-1 text-[10px] font-black tracking-widest text-white">{posicion}</span>
                </div>
                <div className="mt-1 max-w-[180px] truncate text-[10px] font-bold uppercase tracking-wider text-stone-700">{categoria}{edad ? ` · ${edad} AÑOS` : ""}</div>
              </div>
              <div className="flex shrink-0 flex-col items-center">
                <div className="h-14 w-14 overflow-hidden rounded-full border-2 border-amber-700 bg-white shadow-md"><img src={CLUB_LOGO_URL} alt="Escudo C.D. Bustarviejo" className="h-full w-full object-contain" /></div>
                <span className="mt-1.5 text-[9px] font-extrabold uppercase tracking-widest text-amber-950">Nivel {nivel}</span>
              </div>
            </div>

            {/* Portrait as the visual centrepiece */}
            <div className="relative mt-4 overflow-hidden border-2 border-amber-700/70 bg-gradient-to-br from-amber-100 via-stone-200 to-orange-100 shadow-inner" style={{ height: 360, clipPath: "polygon(7% 0, 100% 0, 100% 91%, 92% 100%, 0 100%, 0 12%)" }}>
              {player?.foto_url ? (
                <img src={player.foto_url} alt={player.nombre || "Foto del jugador"} className="absolute inset-0 h-full w-full object-contain object-bottom" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-amber-100 via-orange-100 to-amber-300">
                  <div className="text-center">
                    <div className="text-6xl">⚽</div>
                    <div className="mt-2 text-[9px] font-bold uppercase tracking-[0.25em] text-amber-900/60">Jugador CDB</div>
                  </div>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-amber-950/95 via-amber-950/15 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 h-1.5 bg-gradient-to-r from-amber-300 via-orange-600 to-amber-300" />
              <div className="absolute bottom-3 left-3 right-3">
                <div className="text-[8px] font-black uppercase tracking-[0.3em] text-amber-200">Jugador · Temporada</div>
                <div className="break-words text-xl font-black uppercase leading-tight tracking-tight text-white drop-shadow-lg" style={{ fontSize: fullName.length > 19 ? 15 : fullName.length > 14 ? 18 : 22 }}>
                  {fullName}
                </div>
              </div>
              <div className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-amber-800/30 bg-amber-50/90 shadow">
                <Star className="h-4 w-4 fill-orange-600 text-orange-700" />
              </div>
            </div>

            {/* XP is a compact progression bar, not a competing headline */}
            <div className="mt-4 rounded-lg border border-amber-900/20 bg-white/50 px-3 py-2 shadow-sm">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <span className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-stone-700">Progreso al siguiente nivel</span>
                <span className="text-[10px] font-black text-orange-800">{xpPct}%</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-amber-900/20">
                <div className="h-full rounded-full bg-gradient-to-r from-orange-700 via-orange-500 to-amber-300 transition-all duration-500" style={{ width: `${xpPct}%` }} />
              </div>
            </div>

            {/* Stats are now a clean 2x2 grid, instead of identical colourful pills */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <StatTile icon={Zap} label="Asistencia" value={`${asistenciaPct}%`} accent />
              <StatTile icon={Flame} label="Racha" value={racha} />
              {!isComplementaria && <StatTile icon={Goal} label="Goles" value={goles} accent />}
              <StatTile icon={Target} label="Convocatorias" value={callupsCount} accent />
            </div>

            {/* Achievement footer */}
            <div className="mt-4 flex items-center justify-between gap-3 border-t border-amber-900/20 pt-3">
              <div>
                <div className="text-[9px] font-extrabold uppercase tracking-[0.2em] text-stone-700">Colección de logros</div>
                <div className="mt-1 text-sm font-black text-stone-900">{logrosCount}<span className="ml-1 text-[10px] font-bold text-stone-600">DESBLOQUEADOS</span></div>
              </div>
              <div className="flex items-center gap-1.5">
                {[Trophy, Goal, Flame, Target].map((Ic, i) => (
                  <div key={i} className={`flex h-7 w-7 items-center justify-center rounded-lg border ${i < logrosCount ? "border-amber-700/60 bg-orange-500/20" : "border-amber-900/15 bg-white/40"}`}>
                    <Ic className={`h-3.5 w-3.5 ${i < logrosCount ? "text-orange-800" : "text-stone-400"}`} strokeWidth={2.2} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
