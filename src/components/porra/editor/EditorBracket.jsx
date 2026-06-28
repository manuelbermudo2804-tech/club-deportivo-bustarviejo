import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Lock, Sparkles } from "lucide-react";
import { resolverCruces16avos } from "@/lib/porraBracket";
import PorraCrucesFifaInfo from "@/components/porra/PorraCrucesFifaInfo";
import BracketRealVsPrediccion from "@/components/porra/editor/BracketRealVsPrediccion";

// Bracket auto-completable: el ganador de cada partido aparece como candidato en el siguiente
// El usuario NO arrastra equipos: solo elige ganador entre los DOS contendientes ya definidos
const FASES_ORDEN = ['16avos', '8vos', '4tos', 'semis', 'final'];

// ============================================================
// BRACKET OFICIAL FIFA 2026 — cruces de octavos en adelante
// Fuente: FIFA.com (fixture oficial M73-M104)
// El índice del partido es 0-based (idx 0 = primer partido de la fase)
// El valor es el par [idxAnterior_local, idxAnterior_visitante] de la fase previa
// ============================================================
const CRUCES_FIFA_OFICIAL = {
  // Octavos (M89-M96) — ganadores de 16avos (M73-M88 → idx 0-15)
  // Verificado contra fixture oficial FIFA 2026 (bracket facilitado por usuario)
  '8vos': [
    [0, 2],   // M89 = W73 vs W75
    [1, 4],   // M90 = W74 vs W77
    [3, 5],   // M91 = W76 vs W78
    [6, 7],   // M92 = W79 vs W80
    [10, 11], // M93 = W83 vs W84
    [8, 9],   // M94 = W81 vs W82
    [13, 15], // M95 = W86 vs W88
    [12, 14], // M96 = W85 vs W87
  ],
  // Cuartos (M97-M100) — ganadores de octavos (idx 0-7 en orden M89→M96)
  // El idx aquí es el idx visual en la UI (Partido 1, 2, 3, 4) que coincide
  // con numero_partido ascendente (M97, M98, M99, M100).
  '4tos': [
    [0, 1], // P1 = M97  = W89 vs W90
    [4, 5], // P2 = M98  = W93 vs W94
    [2, 3], // P3 = M99  = W91 vs W92
    [6, 7], // P4 = M100 = W95 vs W96
  ],
  // Semis — cruces simples por orden de cuartos
  // Semi 1 = Cuartos P1 vs Cuartos P2
  // Semi 2 = Cuartos P3 vs Cuartos P4
  'semis': [
    [0, 1], // Semi 1 = W Cuartos1 vs W Cuartos2
    [2, 3], // Semi 2 = W Cuartos3 vs W Cuartos4
  ],
  // Final (M104) — ganadores de semis
  'final': [
    [0, 1], // M104 = W101 vs W102
  ],
};

// Los puntos se sobreescriben dinámicamente desde la config
const FASES_META_BASE = {
  '16avos': { titulo: '16avos de final', color: 'from-blue-500 to-blue-600', ptsKey: 'puntos_16avos', defaultPts: 2 },
  '8vos': { titulo: 'Octavos de final', color: 'from-indigo-500 to-indigo-600', ptsKey: 'puntos_8vos', defaultPts: 3 },
  '4tos': { titulo: 'Cuartos de final', color: 'from-purple-500 to-purple-600', ptsKey: 'puntos_4tos', defaultPts: 5 },
  'semis': { titulo: 'Semifinales', color: 'from-pink-500 to-pink-600', ptsKey: 'puntos_semis', defaultPts: 7 },
  'tercer_puesto': { titulo: '🥉 Tercer puesto', color: 'from-amber-500 to-amber-600', ptsKey: 'puntos_tercer_puesto_equipo', defaultPts: 5 },
  'final': { titulo: '🏆 GRAN FINAL', color: 'from-red-600 to-orange-600', ptsKey: 'puntos_final', defaultPts: 10 },
};

export default function EditorBracket({ participante, partidos, equipos, isBlocked, onSetGanador, config }) {
  const equiposPorCodigo = useMemo(() => {
    const m = {};
    equipos.forEach(e => { m[e.codigo] = e; });
    return m;
  }, [equipos]);

  // Equipos clasificados a 16avos según el usuario (24 1º/2º + 8 terceros)
  // Usamos array ordenado en vez de Set para garantizar consistencia
  const equiposEn16avos = useMemo(() => {
    const codigos = [];
    const vistos = new Set();
    const grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    grupos.forEach(g => {
      const arr = participante?.clasificacion_grupos?.[g];
      if (Array.isArray(arr)) {
        [arr[0], arr[1]].forEach(c => {
          if (c && !vistos.has(c)) { vistos.add(c); codigos.push(c); }
        });
      }
    });
    (participante?.mejores_terceros || []).forEach(c => {
      if (c && !vistos.has(c)) { vistos.add(c); codigos.push(c); }
    });
    return codigos;
  }, [participante]);

  // Cruces de 16avos del cuadro del USUARIO según el BRACKET OFICIAL FIFA Mundial 2026 (Match 73-88).
  // ⚠️ SIEMPRE se resuelven a partir de las predicciones del propio usuario
  // (clasificación de grupos + 8 mejores terceros) aplicando el Anexo C.
  // NO se usan los equipos reales que el admin mete en BD: el bracket de cada
  // persona es SU predicción, no la realidad. (Si se usaran los códigos reales,
  // al meter los partidos de 16avos se "colarían" en el cuadro de toda la gente.)
  const cruces16avos = useMemo(() => {
    return resolverCruces16avos(participante);
  }, [participante]);

  // Devuelve los DOS contendientes de un partido eliminatoria:
  // - 16avos: 2 equipos según el bracket real o secuencial (ver arriba)
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
    // 8vos, 4tos, semis, final → cruces FIFA oficiales (M89=W73vsW74, M90=W77vsW78, ...)
    const idxAnterior = FASES_ORDEN.indexOf(faseActual);
    if (idxAnterior <= 0) return equiposEn16avos;
    const faseAnterior = FASES_ORDEN[idxAnterior - 1];
    const partidosAnt = partidos.filter(p => p.fase === faseAnterior).sort((a, b) => a.numero_partido - b.numero_partido);

    // Mapeo FIFA oficial. Si no hay mapeo definido para esa fase, fallback secuencial
    const mapeo = CRUCES_FIFA_OFICIAL[faseActual]?.[idxPartido];
    const [idxA, idxB] = mapeo || [idxPartido * 2, idxPartido * 2 + 1];

    const a = partidosAnt[idxA];
    const b = partidosAnt[idxB];
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

  // Si el admin no ha generado los partidos eliminatorios todavía, avisar al usuario
  const hayPartidosEliminatorias = FASES_RENDER.some(f => partidos.some(p => p.fase === f));
  if (!hayPartidosEliminatorias) {
    return (
      <Card className="border-2 border-amber-300 bg-amber-50">
        <CardContent className="p-6 text-center">
          <Lock className="w-12 h-12 mx-auto text-amber-600 mb-2" />
          <p className="font-bold text-amber-900">El bracket aún no está disponible</p>
          <p className="text-sm text-amber-800 mt-2 leading-relaxed">
            El cuadro de eliminatorias se publicará cuando la organización lo active.
            Mientras tanto, completa tus predicciones de <strong>Grupos</strong>, <strong>Terceros</strong> y <strong>Especiales</strong>.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Aviso simple y claro */}
      <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 text-sm">
        <p className="font-bold text-amber-900 mb-2">⚠️ Importante — Léeme</p>
        <p className="text-amber-900 text-xs leading-relaxed">
          Los puntos se ganan por <strong>cada equipo que aciertes que llega a cada fase</strong> (octavos, cuartos, semis, final, campeón). <strong>NO importa contra quién juegue en tu cuadro.</strong> Si predices que España llega a semis y llega → cobras los puntos, da igual el cruce.
        </p>
        <p className="text-amber-900 text-xs mt-2 leading-relaxed">
          🥉 <strong>También ganas puntos por acertar tus 8 mejores terceros</strong> que se clasifican a 16avos ({config?.puntos_mejor_tercero ?? 3} pts cada uno).
        </p>
        <p className="text-amber-800 text-xs mt-2">
          🏆 Acertar al campeón da <strong>+{config?.puntos_campeon ?? 15} pts extra</strong>.
        </p>
      </div>

      {FASES_RENDER.map(faseKey => {
        const metaBase = FASES_META_BASE[faseKey];
        const meta = { ...metaBase, pts: config?.[metaBase.ptsKey] ?? metaBase.defaultPts };
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

              <BracketRealVsPrediccion
                faseKey={faseKey}
                partidos={partidos}
                equipos={equipos}
                prediccionesUsuario={participante.predicciones_eliminatorias}
              />
            </CardContent>
          </Card>
        );
      })}

    </div>
  );
}