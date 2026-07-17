import React from "react";
import { Trophy, Goal } from "lucide-react";

// Tarjeta de cierre del torneo: campeón de cada cuadro (Oro/Plata/Bronce)
// y máximo goleador. Solo muestra las secciones que ya tienen ganador.
// Sport-agnóstico: usa el ganador de la final de cada fase.

const CUADROS = [
  { fase: "oro", emoji: "🥇", nombre: "Copa Oro", color: "#fbbf24" },
  { fase: "plata", emoji: "🥈", nombre: "Copa Plata", color: "#cbd5e1" },
  { fase: "bronce", emoji: "🥉", nombre: "Copa Bronce", color: "#d97706" },
];

function campeonDeFase(partidos, equipos, fase) {
  // La final es el partido de esa fase cuya ronda es "Final" y está finalizado
  const final = partidos.find(
    (p) => p.fase === fase && p.ronda === "Final" && p.finalizado && p.ganador_id
  );
  if (!final) return null;
  const eq = equipos.find((e) => e.id === final.ganador_id);
  return eq ? { nombre: eq.nombre, escudo: eq.escudo_url } : null;
}

function maximoGoleador(goles) {
  if (!goles || goles.length === 0) return null;
  const porJugador = {};
  goles.forEach((g) => {
    const k = g.jugador_id;
    if (!porJugador[k]) porJugador[k] = { nombre: g.jugador_nombre, equipo: g.equipo_nombre, total: 0 };
    porJugador[k].total += g.goles || 1;
  });
  const orden = Object.values(porJugador).sort((a, b) => b.total - a.total);
  return orden[0]?.total > 0 ? orden[0] : null;
}

export default function Palmares({ partidos, equipos, goles }) {
  const campeones = CUADROS
    .map((c) => ({ ...c, campeon: campeonDeFase(partidos, equipos, c.fase) }))
    .filter((c) => c.campeon);
  const pichichi = maximoGoleador(goles);

  if (campeones.length === 0 && !pichichi) {
    return (
      <p className="text-center text-slate-400 py-8 text-sm">
        El palmarés aparecerá cuando se disputen las finales.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-center">
        <Trophy className="w-10 h-10 text-amber-400 mx-auto mb-1" />
        <h3 className="text-xl font-black text-white">Palmarés del torneo</h3>
      </div>

      <div className="grid gap-3">
        {campeones.map((c) => (
          <div
            key={c.fase}
            className="bg-white rounded-xl border p-4 flex items-center gap-3"
            style={{ borderLeft: `4px solid ${c.color}` }}
          >
            <span className="text-3xl">{c.emoji}</span>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Campeón · {c.nombre}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {c.campeon.escudo && (
                  <img src={c.campeon.escudo} alt="" className="w-6 h-6 rounded-full object-cover" />
                )}
                <span className="font-bold text-slate-900 text-lg">{c.campeon.nombre}</span>
              </div>
            </div>
          </div>
        ))}

        {pichichi && (
          <div className="bg-white rounded-xl border p-4 flex items-center gap-3" style={{ borderLeft: "4px solid #22c55e" }}>
            <span className="text-3xl">👟</span>
            <div className="flex-1">
              <p className="text-[11px] uppercase tracking-wide text-slate-400">Máximo goleador</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="font-bold text-slate-900 text-lg">{pichichi.nombre}</span>
                {pichichi.equipo && <span className="text-slate-400 text-sm">· {pichichi.equipo}</span>}
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-green-600 font-black text-lg">
              <Goal className="w-5 h-5" /> {pichichi.total}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}