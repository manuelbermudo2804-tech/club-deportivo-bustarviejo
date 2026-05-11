import React from "react";

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Vista previa de los 12 grupos del Mundial 2026
export default function PorraGruposPreview({ equipos = [] }) {
  const equiposPorGrupo = GRUPOS.reduce((acc, g) => {
    acc[g] = equipos
      .filter(e => e.grupo === g)
      .sort((a, b) => (a.orden_grupo || 0) - (b.orden_grupo || 0));
    return acc;
  }, {});

  return (
    <div className="bg-gradient-to-b from-slate-50 to-white py-12 md:py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <span className="text-sm font-bold text-orange-600 uppercase tracking-widest">Los grupos</span>
          <h2 className="text-3xl md:text-5xl font-black text-slate-900 mt-2">
            48 selecciones, <span className="text-orange-600">12 grupos</span>
          </h2>
          <p className="text-slate-600 mt-2">El sorteo oficial del Mundial 2026 ya está hecho. ¡A predecir!</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {GRUPOS.map(g => (
            <div key={g} className="bg-white rounded-2xl shadow-lg border-2 border-slate-100 overflow-hidden hover:border-orange-400 hover:shadow-xl transition-all">
              <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-3 py-2 font-black flex items-center justify-between">
                <span>GRUPO {g}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">6 partidos</span>
              </div>
              <div className="p-2 space-y-1">
                {(equiposPorGrupo[g] || []).map(eq => (
                  <div key={eq.codigo} className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-orange-50 transition-colors">
                    <span className="text-xl">{eq.bandera_emoji}</span>
                    <span className="text-sm font-semibold text-slate-700">{eq.nombre}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}