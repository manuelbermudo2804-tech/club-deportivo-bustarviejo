import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp, Sparkles, Zap, Users } from "lucide-react";
import { calcularClasificacionGrupo, grupoTotalmentePredicho } from "./calcularClasificacion";

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Editor de fase de grupos: SOLO 1/X/2. La clasificación 1º-4º se calcula AUTOMÁTICAMENTE
export default function EditorGrupos({ participante, partidos, equipos, isBlocked, onSetResultado, onSetClasificacion }) {
  const [expandido, setExpandido] = useState(GRUPOS[0]);
  const [stats, setStats] = useState(null);

  // Cargar stats globales una vez al abrir el editor (cacheado 5 min)
  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        const { data } = await base44.functions.invoke('porraStatsPublicas', {});
        if (!cancel) setStats(data);
      } catch {}
    })();
    return () => { cancel = true; };
  }, []);

  const equiposPorCodigo = useMemo(() => {
    const m = {};
    equipos.forEach(e => { m[e.codigo] = e; });
    return m;
  }, [equipos]);

  const partidosPorGrupo = useMemo(() => {
    const m = {};
    GRUPOS.forEach(g => {
      m[g] = partidos.filter(p => p.fase === 'grupos' && p.grupo === g)
        .sort((a, b) => a.numero_partido - b.numero_partido);
    });
    return m;
  }, [partidos]);

  const equiposPorGrupo = useMemo(() => {
    const m = {};
    GRUPOS.forEach(g => {
      m[g] = equipos.filter(e => e.grupo === g)
        .sort((a, b) => (a.orden_grupo || 0) - (b.orden_grupo || 0));
    });
    return m;
  }, [equipos]);

  // 🔥 AUTO-CLASIFICACIÓN: cada vez que cambia un 1/X/2, recalculamos la clasificación del grupo
  useEffect(() => {
    if (isBlocked) return;
    GRUPOS.forEach(g => {
      if (grupoTotalmentePredicho(g, partidos, participante.predicciones_grupos)) {
        const nueva = calcularClasificacionGrupo(g, partidos, equipos, participante.predicciones_grupos);
        const actual = participante.clasificacion_grupos?.[g] || [];
        // Solo actualizar si cambió (evitar bucle infinito)
        if (nueva.length === 4 && JSON.stringify(nueva) !== JSON.stringify(actual)) {
          onSetClasificacion(g, nueva);
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participante.predicciones_grupos]);

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm">
        <p className="font-bold text-blue-900 mb-1 flex items-center gap-1">
          <Sparkles className="w-4 h-4" /> Súper fácil: solo elige 1 / X / 2
        </p>
        <p className="text-blue-800 text-xs leading-relaxed">
          Predice cada partido con <strong>1</strong> (gana local), <strong>X</strong> (empate) o <strong>2</strong> (gana visitante).<br/>
          🤖 La <strong>clasificación final</strong> se calcula <strong>automáticamente</strong> según tus predicciones. ¡No tienes que ordenar nada!<br/>
          Cada acierto de 1X2 son <strong>1 punto</strong>.
        </p>
      </div>

      {GRUPOS.map(g => {
        const ps = partidosPorGrupo[g] || [];
        const totalPred = ps.filter(p => participante.predicciones_grupos?.[p.id]).length;
        const clasif = (participante.clasificacion_grupos?.[g] && participante.clasificacion_grupos[g].length === 4)
          ? participante.clasificacion_grupos[g]
          : equiposPorGrupo[g].map(e => e.codigo);
        const grupoCompleto = totalPred === 6 && participante.clasificacion_grupos?.[g]?.length === 4;
        const isOpen = expandido === g;

        return (
          <Card key={g} className={`border-2 transition-all ${grupoCompleto ? 'border-green-400' : 'border-slate-200'}`}>
            <button
              onClick={() => setExpandido(isOpen ? null : g)}
              className="w-full p-4 flex items-center justify-between hover:bg-slate-50 rounded-t-lg"
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-black text-white ${grupoCompleto ? 'bg-green-600' : 'bg-gradient-to-br from-red-600 to-orange-600'}`}>
                  {g}
                </div>
                <div className="text-left">
                  <p className="font-black text-slate-900">Grupo {g}</p>
                  <p className="text-xs text-slate-500">{totalPred}/6 partidos · {participante.clasificacion_grupos?.[g]?.length === 4 ? '✅ Clasificación' : '⏳ Falta clasificación'}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {grupoCompleto && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                {isOpen ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
              </div>
            </button>

            {isOpen && (
              <CardContent className="border-t pt-4 space-y-5">
                {/* Partidos */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Partidos · 1 (local) / X (empate) / 2 (visitante)</p>
                  <div className="space-y-1.5">
                    {ps.map(p => {
                      const local = equiposPorCodigo[p.equipo_local_codigo];
                      const visit = equiposPorCodigo[p.equipo_visitante_codigo];
                      const pred = participante.predicciones_grupos?.[p.id];
                      const partidoStats = stats?.grupos?.[p.id];
                      const showStats = !!partidoStats && partidoStats.total >= 5;
                      return (
                        <div key={p.id} className="p-2 rounded-lg hover:bg-slate-50">
                          <div className="flex items-center gap-2">
                            <div className="flex-1 min-w-0 flex items-center gap-2 text-sm">
                              <span className="text-xl">{local?.bandera_emoji || '🏳️'}</span>
                              <span className="font-medium truncate hidden sm:inline">{local?.nombre}</span>
                              <span className="font-mono text-xs text-slate-500 sm:hidden">{local?.codigo}</span>
                              <span className="text-slate-300 mx-1">vs</span>
                              <span className="text-xl">{visit?.bandera_emoji || '🏳️'}</span>
                              <span className="font-medium truncate hidden sm:inline">{visit?.nombre}</span>
                              <span className="font-mono text-xs text-slate-500 sm:hidden">{visit?.codigo}</span>
                            </div>
                            <div className="flex gap-1">
                              {['1', 'X', '2'].map(r => (
                                <button
                                  key={r}
                                  disabled={isBlocked}
                                  onClick={() => onSetResultado(p.id, r)}
                                  className={`w-9 h-9 rounded-lg font-black text-sm transition-all disabled:opacity-50 ${
                                    pred === r
                                      ? 'bg-gradient-to-br from-red-600 to-orange-600 text-white shadow-lg scale-105'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                                  }`}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                          {showStats && (
                            <div className="mt-1.5 ml-1 flex items-center gap-2 text-[10px] text-slate-500">
                              <Users className="w-3 h-3" />
                              <span><strong className="text-slate-700">{partidoStats['1_pct']}%</strong> 1</span>
                              <span>·</span>
                              <span><strong className="text-slate-700">{partidoStats['X_pct']}%</strong> X</span>
                              <span>·</span>
                              <span><strong className="text-slate-700">{partidoStats['2_pct']}%</strong> 2</span>
                              <span className="text-slate-400">({partidoStats.total} porras)</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Clasificación final del grupo - AUTO-CALCULADA */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <Zap className="w-3.5 h-3.5 text-purple-600" /> Clasificación automática
                  </p>
                  {totalPred < 6 ? (
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      Predice los <strong>6 partidos</strong> y verás la clasificación final calculada al instante.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {clasif.map((codigo, idx) => {
                        const eq = equiposPorCodigo[codigo];
                        const posIcon = ['🥇', '🥈', '🥉', '4️⃣'][idx];
                        const pasa = idx < 2;
                        const candidatoTercero = idx === 2;
                        return (
                          <div key={codigo} className={`flex items-center gap-2 p-2 rounded-lg border ${
                            pasa ? 'bg-green-50 border-green-300' : candidatoTercero ? 'bg-purple-50 border-purple-300' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <span className="text-lg w-7">{posIcon}</span>
                            <span className="text-xl">{eq?.bandera_emoji}</span>
                            <span className="flex-1 font-medium text-sm">{eq?.nombre}</span>
                            {pasa && <span className="text-[10px] font-bold text-green-700 bg-green-100 px-1.5 py-0.5 rounded">PASA</span>}
                            {candidatoTercero && <span className="text-[10px] font-bold text-purple-700 bg-purple-100 px-1.5 py-0.5 rounded">3º</span>}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        );
      })}
    </div>
  );
}