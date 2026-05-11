import React from "react";
import { Trophy, Medal, Award } from "lucide-react";
import { getMotivoDesempateTexto } from "./ReglasDesempate";

// Tabla de ranking con podio y filas
// Muestra el motivo de desempate cuando dos participantes tienen los mismos puntos totales
export default function RankingTable({ ranking, miAlias }) {
  if (!ranking || ranking.length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        <Trophy className="w-12 h-12 mx-auto opacity-30 mb-2" />
        <p className="font-bold">Aún no hay participantes en este ranking</p>
        <p className="text-xs mt-1">Cuando empiecen los partidos verás aquí las posiciones</p>
      </div>
    );
  }

  const podio = ranking.slice(0, 3);
  const resto = ranking.slice(3);

  return (
    <div className="space-y-4">
      {/* Podio top 3 */}
      {podio.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-2">
          {[1, 0, 2].map(idx => {
            const p = podio[idx];
            if (!p) return <div key={idx} />;
            const colores = ['from-yellow-400 to-orange-500', 'from-slate-300 to-slate-400', 'from-orange-400 to-amber-600'];
            const iconos = [<Trophy className="w-6 h-6" />, <Medal className="w-5 h-5" />, <Award className="w-5 h-5" />];
            const heights = ['pt-2', 'pt-6', 'pt-8'];
            const realPos = idx + 1;
            const esMio = miAlias && p.alias_equipo === miAlias;
            const motivoTxt = p.empate_con_anterior ? getMotivoDesempateTexto(p.motivo_desempate) : null;
            return (
              <div key={idx} className={heights[idx]}>
                <div className={`bg-gradient-to-br ${colores[idx]} text-white rounded-xl p-3 text-center shadow-lg ${esMio ? 'ring-4 ring-blue-400' : ''}`}>
                  <div className="flex justify-center mb-1">{iconos[idx]}</div>
                  <p className="text-xs font-bold opacity-90">{realPos}º</p>
                  <p className="font-black text-sm truncate mt-1">{p.alias_equipo}</p>
                  <p className="text-xs opacity-80 truncate">{p.nombre}</p>
                  <p className="text-lg font-black mt-1">{p.puntos_total} pts</p>
                  {motivoTxt && (
                    <p className="text-[9px] mt-1 bg-black/20 rounded px-1.5 py-0.5 font-bold leading-tight" title="Desempate frente al puesto anterior">
                      {motivoTxt}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resto de la tabla */}
      {resto.length > 0 && (
        <div className="bg-white rounded-xl border-2 border-slate-200 overflow-hidden">
          {resto.map(p => {
            const esMio = miAlias && p.alias_equipo === miAlias;
            const motivoTxt = p.empate_con_anterior ? getMotivoDesempateTexto(p.motivo_desempate) : null;
            return (
              <div
                key={p.posicion}
                className={`flex items-center gap-3 p-3 border-b last:border-b-0 ${esMio ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50'}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0 ${
                  esMio ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-700'
                }`}>
                  {p.posicion}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-slate-900 truncate">
                    {p.alias_equipo} {esMio && <span className="text-blue-600 text-xs">(tú)</span>}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{p.nombre}</p>
                  {motivoTxt && (
                    <p className="text-[10px] mt-0.5 inline-block bg-orange-100 text-orange-700 rounded px-1.5 py-0.5 font-bold" title="Desempate frente al puesto anterior">
                      {motivoTxt}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="font-black text-orange-600">{p.puntos_total}</p>
                  <p className="text-[10px] text-slate-400">pts</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}