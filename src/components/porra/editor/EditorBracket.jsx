import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Lock, Sparkles } from "lucide-react";

// Bracket auto-completable: el ganador de cada partido aparece como candidato en el siguiente
// El usuario NO arrastra equipos: solo elige ganador entre los DOS contendientes ya definidos
//
// Estructura simplificada: en cada fase los partidos están ordenados (numero_partido)
// y el ganador del partido N de la fase X "alimenta" al partido floor(N/2) de la fase X+1
const FASES_ORDEN = ['16avos', '8vos', '4tos', 'semis', 'final'];

const FASES_META = {
  '16avos': { titulo: '16avos de final', color: 'from-blue-500 to-blue-600', pts: 2 },
  '8vos': { titulo: 'Octavos de final', color: 'from-indigo-500 to-indigo-600', pts: 3 },
  '4tos': { titulo: 'Cuartos de final', color: 'from-purple-500 to-purple-600', pts: 5 },
  'semis': { titulo: 'Semifinales', color: 'from-pink-500 to-pink-600', pts: 7 },
  'tercer_puesto': { titulo: '🥉 Tercer puesto', color: 'from-amber-500 to-amber-600', pts: 5 },
  'final': { titulo: '🏆 GRAN FINAL', color: 'from-red-600 to-orange-600', pts: 10 },
};

export default function EditorBracket({ participante, partidos, equipos, isBlocked, onSetGanador }) {
  const equiposPorCodigo = useMemo(() => {
    const m = {};
    equipos.forEach(e => { m[e.codigo] = e; });
    return m;
  }, [equipos]);

  // Equipos clasificados a 16avos:
  // - 24 primeros y segundos de la clasificación del usuario (12 grupos × 2)
  // - 8 mejores terceros que eligió el usuario
  const equiposEn16avos = useMemo(() => {
    const codigos = new Set();
    Object.values(participante?.clasificacion_grupos || {}).forEach(arr => {
      if (Array.isArray(arr) && arr.length >= 2) {
        if (arr[0]) codigos.add(arr[0]);
        if (arr[1]) codigos.add(arr[1]);
      }
    });
    (participante?.mejores_terceros || []).forEach(c => codigos.add(c));
    return Array.from(codigos);
  }, [participante]);

  // Emparejamientos fijos de 16avos: 16 duelos de 2 equipos cada uno
  // (cruzamos pares consecutivos del array de 32 clasificados)
  const cruces16avos = useMemo(() => {
    const lista = [...equiposEn16avos].slice(0, 32);
    const pares = [];
    for (let i = 0; i < lista.length; i += 2) {
      if (lista[i + 1]) pares.push([lista[i], lista[i + 1]]);
    }
    return pares;
  }, [equiposEn16avos]);

  // Devuelve los DOS contendientes de un partido eliminatoria:
  // - 16avos: 2 equipos según el cruce fijo determinista
  // - 8vos+: ganadores de los partidos anteriores que predijo el usuario
  const getContendientes = (partido, idxPartido, partidosFase, faseActual) => {
    if (faseActual === '16avos') {
      return cruces16avos[idxPartido] || [];
    }
    if (faseActual === 'tercer_puesto') {
      // Tercer puesto = perdedores de semifinales → mostramos pool de semifinalistas - finalistas
      const semis = partidos.filter(p => p.fase === 'semis').sort((a, b) => a.numero_partido - b.numero_partido);
      const ganadoresSemis = semis.map(s => participante.predicciones_eliminatorias?.[s.id]).filter(Boolean);
      // candidatos = clasificados a semis (los que el usuario eligió en cuartos) MENOS los que pasaron a final
      const cuartos = partidos.filter(p => p.fase === '4tos').sort((a, b) => a.numero_partido - b.numero_partido);
      const ganadoresCuartos = cuartos.map(c => participante.predicciones_eliminatorias?.[c.id]).filter(Boolean);
      return ganadoresCuartos.filter(c => !ganadoresSemis.includes(c));
    }
    // 8vos, 4tos, semis, final → ganadores del par de partidos anteriores
    const idxAnterior = FASES_ORDEN.indexOf(faseActual);
    if (idxAnterior <= 0) return equiposEn16avos;
    const faseAnterior = FASES_ORDEN[idxAnterior - 1];
    const partidosAnt = partidos.filter(p => p.fase === faseAnterior).sort((a, b) => a.numero_partido - b.numero_partido);
    // Cada partido de la fase actual recibe los ganadores de 2 partidos anteriores
    const a = partidosAnt[idxPartido * 2];
    const b = partidosAnt[idxPartido * 2 + 1];
    const cands = [];
    if (a && participante.predicciones_eliminatorias?.[a.id]) cands.push(participante.predicciones_eliminatorias[a.id]);
    if (b && participante.predicciones_eliminatorias?.[b.id]) cands.push(participante.predicciones_eliminatorias[b.id]);
    return cands;
  };

  const totalEq16 = equiposEn16avos.length;
  const completoTop = totalEq16 >= 24;

  if (!completoTop) {
    return (
      <Card className="border-2 border-amber-300 bg-amber-50">
        <CardContent className="p-6 text-center">
          <Lock className="w-12 h-12 mx-auto text-amber-600 mb-2" />
          <p className="font-bold text-amber-900">Completa primero los grupos y los mejores terceros</p>
          <p className="text-sm text-amber-800 mt-1">
            Llevas {totalEq16}/32 equipos clasificados a 16avos. Necesitas terminar la fase de grupos y elegir tus 8 mejores terceros.
          </p>
        </CardContent>
      </Card>
    );
  }

  const FASES_RENDER = ['16avos', '8vos', '4tos', 'semis', 'tercer_puesto', 'final'];

  return (
    <div className="space-y-4">
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 text-sm">
        <p className="font-bold text-purple-900 mb-1 flex items-center gap-1">
          <Sparkles className="w-4 h-4" /> Bracket inteligente
        </p>
        <p className="text-purple-800 text-xs leading-relaxed">
          Elige al ganador de cada eliminatoria. <strong>El ganador avanza automáticamente</strong> al siguiente partido. 🤖<br/>
          Puntos: <strong>2</strong> 16avos · <strong>3</strong> 8vos · <strong>5</strong> 4tos · <strong>7</strong> semis · <strong>10</strong> final · <strong>+15</strong> si aciertas el campeón.
        </p>
      </div>

      {FASES_RENDER.map(faseKey => {
        const meta = FASES_META[faseKey];
        const ps = partidos.filter(p => p.fase === faseKey).sort((a, b) => a.numero_partido - b.numero_partido);
        if (ps.length === 0) return null;

        return (
          <Card key={faseKey} className="border-2 border-slate-200 overflow-hidden">
            <div className={`bg-gradient-to-r ${meta.color} text-white px-4 py-3`}>
              <h3 className="font-black text-base flex items-center justify-between">
                <span>{meta.titulo}</span>
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded">{meta.pts} pts c/u</span>
              </h3>
            </div>
            <CardContent className="p-3 space-y-2">
              {ps.map((p, idx) => {
                const ganadorActual = participante.predicciones_eliminatorias?.[p.id];
                const esFinal = faseKey === 'final';
                const candidatos = getContendientes(p, idx, ps, faseKey);

                return (
                  <div key={p.id} className={`rounded-lg p-3 ${esFinal ? 'bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-400' : 'bg-slate-50 border border-slate-200'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs font-bold text-slate-500">
                        {esFinal ? (
                          <span className="flex items-center gap-1"><Crown className="w-3 h-3 text-yellow-600" /> Elige al CAMPEÓN</span>
                        ) : `Partido ${idx + 1}`}
                      </p>
                      {ganadorActual && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 max-w-[60%] truncate">
                          {esFinal ? '🏆' : '✓'} {equiposPorCodigo[ganadorActual]?.bandera_emoji} <span className="truncate">{equiposPorCodigo[ganadorActual]?.nombre}</span>
                        </span>
                      )}
                    </div>

                    {candidatos.length === 0 ? (
                      <p className="text-xs text-amber-700 text-center py-2">
                        ⏳ Decide los partidos anteriores para ver los candidatos
                      </p>
                    ) : candidatos.length === 2 ? (
                      // 8vos+: 2 contendientes claros → versus directo
                      <div className="grid grid-cols-2 gap-2">
                        {candidatos.map(codigo => {
                          const eq = equiposPorCodigo[codigo];
                          if (!eq) return null;
                          const sel = ganadorActual === codigo;
                          return (
                            <button
                              key={codigo}
                              disabled={isBlocked}
                              onClick={() => onSetGanador(p.id, codigo)}
                              className={`p-3 rounded-lg font-bold text-sm flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 min-h-[80px] ${
                                sel
                                  ? esFinal
                                    ? 'bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-lg scale-105'
                                    : 'bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg scale-105'
                                  : 'bg-white border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50'
                              }`}
                            >
                              <span className="text-3xl">{eq.bandera_emoji}</span>
                              <span className="text-center leading-tight">{eq.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                    ) : (
                      // Fallback (pool de equipos)
                      <div className="grid grid-cols-2 gap-2">
                        {candidatos.map(codigo => {
                          const eq = equiposPorCodigo[codigo];
                          if (!eq) return null;
                          const sel = ganadorActual === codigo;
                          return (
                            <button
                              key={codigo}
                              disabled={isBlocked}
                              onClick={() => onSetGanador(p.id, codigo)}
                              className={`p-3 rounded-lg text-sm font-bold flex flex-col items-center justify-center gap-1 transition-all disabled:opacity-50 min-h-[70px] ${
                                sel
                                  ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg scale-105'
                                  : 'bg-white border-2 border-slate-200 hover:border-orange-400 hover:bg-orange-50'
                              }`}
                            >
                              <span className="text-2xl">{eq.bandera_emoji}</span>
                              <span className="text-center leading-tight">{eq.nombre}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        );
      })}

      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-sm">
        <p className="text-yellow-900 text-xs">
          💡 <strong>Tip pro:</strong> acertar al campeón te da <strong>15 puntos extra</strong>. ¡Piénsalo bien!
        </p>
      </div>
    </div>
  );
}