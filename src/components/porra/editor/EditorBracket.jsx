import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Crown } from "lucide-react";

const FASES = [
  { key: '16avos', titulo: '16avos de final', color: 'bg-blue-600', short: '16' },
  { key: '8vos', titulo: 'Octavos de final', color: 'bg-indigo-600', short: '8' },
  { key: '4tos', titulo: 'Cuartos de final', color: 'bg-purple-600', short: '4' },
  { key: 'semis', titulo: 'Semifinales', color: 'bg-pink-600', short: 'SF' },
  { key: 'tercer_puesto', titulo: '🥉 Tercer puesto', color: 'bg-amber-600', short: '3º' },
  { key: 'final', titulo: '🏆 GRAN FINAL', color: 'bg-gradient-to-r from-red-600 to-orange-600', short: 'F' },
];

// Editor del bracket: por cada eliminatoria el usuario elige ganador
// (Simplificado: como las eliminatorias dependen del orden real, mostramos los placeholders 
// y el usuario simplemente elige quién ganaría entre los dos placeholders/equipos)
export default function EditorBracket({ participante, partidos, equipos, isBlocked, onSetGanador, onSetTercerPuesto }) {
  const equiposPorCodigo = useMemo(() => {
    const m = {};
    equipos.forEach(e => { m[e.codigo] = e; });
    return m;
  }, [equipos]);

  // Solo equipos que el usuario haya clasificado en posiciones 1-3 de cada grupo
  const equiposClasificados = useMemo(() => {
    const set = new Set();
    Object.values(participante?.clasificacion_grupos || {}).forEach(arr => {
      if (Array.isArray(arr)) {
        // Top 3 (los que típicamente pasan a 16avos)
        arr.slice(0, 3).forEach(c => c && set.add(c));
      }
    });
    return Array.from(set).map(c => equiposPorCodigo[c]).filter(Boolean);
  }, [participante, equiposPorCodigo]);

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 text-sm">
        <p className="font-bold text-purple-900 mb-1">🏆 Cómo funciona el bracket</p>
        <p className="text-purple-800 text-xs">
          Para cada eliminatoria, elige <strong>qué equipo crees que ganará</strong> y avanzará a la siguiente ronda.
          Los puntos suben en cada fase: <strong>4</strong> en 16avos, <strong>6</strong> en 8vos, <strong>10</strong> en cuartos, <strong>14</strong> en semis, <strong>20</strong> en final y <strong>25</strong> por el campeón.
          <br/>💡 Aparecen primero los equipos que has clasificado en tus grupos. Si no ves al que buscas, vuelve atrás y ajusta tu clasificación.
        </p>
      </div>

      {FASES.map(fase => {
        const ps = partidos.filter(p => p.fase === fase.key)
          .sort((a, b) => a.numero_partido - b.numero_partido);
        if (ps.length === 0) return null;

        return (
          <Card key={fase.key} className="border-2 border-slate-200">
            <div className={`${fase.color} text-white px-4 py-3 rounded-t-lg`}>
              <h3 className="font-black text-base flex items-center gap-2">
                {fase.titulo}
                <span className="ml-auto text-xs bg-white/20 px-2 py-0.5 rounded">{ps.length} partido{ps.length > 1 ? 's' : ''}</span>
              </h3>
            </div>
            <CardContent className="p-3 space-y-2">
              {ps.map((p, idx) => {
                const ganadorActual = participante.predicciones_eliminatorias?.[p.id];
                const esFinal = fase.key === 'final';

                return (
                  <div key={p.id} className={`rounded-lg p-3 ${esFinal ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400' : 'bg-slate-50'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-500">
                        {esFinal ? <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-yellow-600" /> Elige al CAMPEÓN</span> : `Partido ${idx + 1}`}
                      </p>
                      {ganadorActual && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">
                          {esFinal ? '🏆 ' : '✓ '}{equiposPorCodigo[ganadorActual]?.nombre}
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {equiposClasificados.length === 0 ? (
                        <div className="col-span-2 text-center py-3 text-xs text-slate-500">
                          ⚠️ Primero ordena la clasificación de los grupos
                        </div>
                      ) : (
                        equiposClasificados.slice(0, 16).map(eq => {
                          const seleccionado = ganadorActual === eq.codigo;
                          return (
                            <button
                              key={eq.codigo}
                              disabled={isBlocked}
                              onClick={() => onSetGanador(p.id, eq.codigo)}
                              className={`p-2 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                                seleccionado
                                  ? esFinal 
                                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg scale-105'
                                    : 'bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg scale-105'
                                  : 'bg-white border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50'
                              }`}
                            >
                              <span className="text-base">{eq.bandera_emoji}</span>
                              <span className="truncate">{eq.codigo}</span>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      {/* Aviso final */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-sm">
        <p className="text-yellow-900 text-xs">
          💡 <strong>Tip pro:</strong> Tu predicción del campeón te da <strong>25 puntos extra</strong> si aciertas. ¡Piénsalo bien!
        </p>
      </div>
    </div>
  );
}