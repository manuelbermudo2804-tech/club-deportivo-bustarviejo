import React from "react";

// Ranking de máximos goleadores (Bota de Oro) del torneo/categoría.
// Agrupa los goles por jugador y los ordena de mayor a menor.
export default function BotaDeOro({ goles, equipos }) {
  const ranking = {};
  (goles || []).forEach((g) => {
    if (!g.jugador_id) return;
    if (!ranking[g.jugador_id]) {
      ranking[g.jugador_id] = {
        jugador_id: g.jugador_id,
        nombre: g.jugador_nombre || "—",
        equipo_id: g.equipo_id,
        equipo_nombre: g.equipo_nombre || "",
        total: 0,
      };
    }
    ranking[g.jugador_id].total += g.goles || 1;
  });

  const lista = Object.values(ranking).sort((a, b) => b.total - a.total);

  if (lista.length === 0) {
    return (
      <div className="bg-white rounded-xl p-8 border text-center">
        <div className="text-5xl mb-3">👟</div>
        <p className="text-slate-400 text-sm">Aún no hay goles registrados.</p>
      </div>
    );
  }

  const escudoDe = (id) => equipos?.find((e) => e.id === id)?.escudo_url;
  const medalla = (i) => (i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}`);

  return (
    <div className="bg-white rounded-xl border overflow-hidden">
      <div className="bg-slate-800 px-4 py-2.5 flex items-center gap-2">
        <span className="text-lg">👟</span>
        <span className="font-bold text-sm">Bota de Oro · Máximos goleadores</span>
      </div>
      <div className="divide-y">
        {lista.map((r, i) => (
          <div key={r.jugador_id} className="flex items-center gap-3 px-4 py-2.5">
            <span className="w-7 text-center text-sm font-bold">{medalla(i)}</span>
            {escudoDe(r.equipo_id) && (
              <img src={escudoDe(r.equipo_id)} alt="" className="w-6 h-6 rounded-full object-cover flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{r.nombre}</p>
              {r.equipo_nombre && <p className="text-xs text-slate-500 truncate">{r.equipo_nombre}</p>}
            </div>
            <span className="text-lg font-black text-amber-500">{r.total}</span>
          </div>
        ))}
      </div>
    </div>
  );
}