import React from "react";
import { Trophy } from "lucide-react";

// Palmarés del torneo. Muestra 8 premios:
//   Automáticos (los da el sistema):
//     - Campeón Oro / Campeón Plata (ganador de cada final)
//     - Subcampeón Oro / Subcampeón Plata (perdedor de cada final)
//     - Pichichi Oro (máximo goleador en partidos de fase oro)
//     - Zamora Oro: equipo menos goleado de la fase oro (el nombre del portero es manual)
//   Manuales (los rellena el admin en categoria.premios_manuales):
//     - Nombre del portero Zamora Oro
//     - MVP Oro / MVP Plata

// Ganador y perdedor de la final de una fase.
function finalistas(partidos, equipos, fase) {
  const final = partidos.find(
    (p) => p.fase === fase && p.ronda === "Final" && p.finalizado && p.ganador_id
  );
  if (!final) return { campeon: null, subcampeon: null };
  const eqCamp = equipos.find((e) => e.id === final.ganador_id);
  const subId = final.equipo_local_id === final.ganador_id ? final.equipo_visitante_id : final.equipo_local_id;
  const eqSub = equipos.find((e) => e.id === subId);
  return {
    campeon: eqCamp ? { nombre: eqCamp.nombre, escudo: eqCamp.escudo_url } : null,
    subcampeon: eqSub ? { nombre: eqSub.nombre, escudo: eqSub.escudo_url } : null,
  };
}

// Máximo goleador del torneo, sumando los goles de la liguilla y los de la fase indicada.
function pichichiFase(goles, partidos, fase) {
  const idsValidos = new Set(
    partidos.filter((p) => p.fase === "liguilla" || p.fase === fase).map((p) => p.id)
  );
  const enFase = (goles || []).filter((g) => idsValidos.has(g.partido_id));
  if (enFase.length === 0) return null;
  const porJugador = {};
  enFase.forEach((g) => {
    const k = g.jugador_id;
    if (!porJugador[k]) porJugador[k] = { nombre: g.jugador_nombre, equipo: g.equipo_nombre, total: 0 };
    porJugador[k].total += g.goles || 1;
  });
  const orden = Object.values(porJugador).sort((a, b) => b.total - a.total);
  return orden[0]?.total > 0 ? orden[0] : null;
}

// Equipo menos goleado contando SOLO los partidos de la fase indicada (ej: oro).
// Al Zamora solo optan los equipos que llegaron a esa fase, y solo cuentan los goles
// que encajaron en ella (no los de la liguilla), porque no todos jugaron los mismos rivales.
function equipoMenosGoleado(partidos, equipos, fase) {
  const contra = {};
  const jugados = {};
  partidos
    .filter((p) => p.fase === fase && p.finalizado && p.marcador_local != null && p.marcador_visitante != null)
    .forEach((p) => {
      contra[p.equipo_local_id] = (contra[p.equipo_local_id] || 0) + p.marcador_visitante;
      contra[p.equipo_visitante_id] = (contra[p.equipo_visitante_id] || 0) + p.marcador_local;
      jugados[p.equipo_local_id] = (jugados[p.equipo_local_id] || 0) + 1;
      jugados[p.equipo_visitante_id] = (jugados[p.equipo_visitante_id] || 0) + 1;
    });
  const candidatos = Object.keys(jugados);
  if (candidatos.length === 0) return null;
  candidatos.sort((a, b) => contra[a] - contra[b]);
  const eq = equipos.find((e) => e.id === candidatos[0]);
  if (!eq) return null;
  return { nombre: eq.nombre, escudo: eq.escudo_url, encajados: contra[candidatos[0]] };
}

// Tarjeta genérica de un premio.
function PremioCard({ emoji, etiqueta, principal, escudo, secundario, valor, color }) {
  return (
    <div className="bg-white rounded-xl border p-4 flex items-center gap-3" style={{ borderLeft: `4px solid ${color}` }}>
      <span className="text-3xl">{emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-[11px] uppercase tracking-wide text-slate-400">{etiqueta}</p>
        <div className="flex items-center gap-2 mt-0.5">
          {escudo && <img src={escudo} alt="" className="w-6 h-6 rounded-full object-cover" />}
          <span className="font-bold text-slate-900 text-lg truncate">{principal}</span>
          {secundario && <span className="text-slate-400 text-sm truncate">· {secundario}</span>}
        </div>
      </div>
      {valor != null && <span className="font-black text-lg text-slate-700 flex-shrink-0">{valor}</span>}
    </div>
  );
}

export default function Palmares({ partidos, equipos, goles, categoria }) {
  const pm = categoria?.premios_manuales || {};
  const oro = finalistas(partidos, equipos, "oro");
  const plata = finalistas(partidos, equipos, "plata");
  const pichichi = pichichiFase(goles, partidos, "oro");
  const zamoraEquipo = equipoMenosGoleado(partidos, equipos, "oro");

  const premios = [];
  if (oro.campeon) premios.push({ key: "camp_oro", emoji: "🥇", etiqueta: "Campeón · Fase Oro", principal: oro.campeon.nombre, escudo: oro.campeon.escudo, color: "#fbbf24" });
  if (oro.subcampeon) premios.push({ key: "sub_oro", emoji: "🥈", etiqueta: "Subcampeón · Fase Oro", principal: oro.subcampeon.nombre, escudo: oro.subcampeon.escudo, color: "#fbbf24" });
  if (plata.campeon) premios.push({ key: "camp_plata", emoji: "🥇", etiqueta: "Campeón · Fase Plata", principal: plata.campeon.nombre, escudo: plata.campeon.escudo, color: "#cbd5e1" });
  if (plata.subcampeon) premios.push({ key: "sub_plata", emoji: "🥈", etiqueta: "Subcampeón · Fase Plata", principal: plata.subcampeon.nombre, escudo: plata.subcampeon.escudo, color: "#cbd5e1" });
  if (pichichi) premios.push({ key: "pichichi", emoji: "👟", etiqueta: "Pichichi · Fase Oro", principal: pichichi.nombre, secundario: pichichi.equipo, valor: pichichi.total, color: "#22c55e" });
  if (zamoraEquipo) premios.push({ key: "zamora", emoji: "🧤", etiqueta: "Zamora · Fase Oro (menos goleado)", principal: pm.zamora_oro_portero || zamoraEquipo.nombre, secundario: pm.zamora_oro_portero ? zamoraEquipo.nombre : null, escudo: zamoraEquipo.escudo, valor: zamoraEquipo.encajados, color: "#3b82f6" });
  if (pm.mvp_oro_nombre) premios.push({ key: "mvp_oro", emoji: "🌟", etiqueta: "MVP · Fase Oro", principal: pm.mvp_oro_nombre, secundario: pm.mvp_oro_equipo, color: "#a855f7" });
  if (pm.mvp_plata_nombre) premios.push({ key: "mvp_plata", emoji: "🌟", etiqueta: "MVP · Fase Plata", principal: pm.mvp_plata_nombre, secundario: pm.mvp_plata_equipo, color: "#a855f7" });

  if (premios.length === 0) {
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
        {premios.map((p) => <PremioCard key={p.key} {...p} />)}
      </div>
    </div>
  );
}