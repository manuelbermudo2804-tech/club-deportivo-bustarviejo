import React, { useState, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, ChevronDown, ChevronUp, ArrowUpDown } from "lucide-react";

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Editor de fase de grupos: 1/X/2 para cada partido + ordenar clasificación 1º a 4º
export default function EditorGrupos({ participante, partidos, equipos, isBlocked, onSetResultado, onSetClasificacion }) {
  const [expandido, setExpandido] = useState(GRUPOS[0]);

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

  const moverEquipo = (grupo, codigo, direccion) => {
    if (isBlocked) return;
    const actual = (participante.clasificacion_grupos?.[grupo] && participante.clasificacion_grupos[grupo].length === 4)
      ? [...participante.clasificacion_grupos[grupo]]
      : equiposPorGrupo[grupo].map(e => e.codigo);
    const idx = actual.indexOf(codigo);
    if (idx === -1) return;
    const nuevoIdx = direccion === 'up' ? idx - 1 : idx + 1;
    if (nuevoIdx < 0 || nuevoIdx >= actual.length) return;
    [actual[idx], actual[nuevoIdx]] = [actual[nuevoIdx], actual[idx]];
    onSetClasificacion(grupo, actual);
  };

  return (
    <div className="space-y-3">
      <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-sm">
        <p className="font-bold text-blue-900 mb-1">📋 Cómo funciona la fase de grupos</p>
        <p className="text-blue-800 text-xs">
          1. Predice cada partido con <strong>1</strong> (gana local), <strong>X</strong> (empate) o <strong>2</strong> (gana visitante).<br/>
          2. Ordena la <strong>clasificación final</strong> del grupo de 1º a 4º (los dos primeros y a veces los terceros pasan a 16avos).<br/>
          3. Cada acierto de resultado son <strong>3 puntos</strong>.
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
                      return (
                        <div key={p.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-slate-50">
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
                      );
                    })}
                  </div>
                </div>

                {/* Clasificación final del grupo */}
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                    <ArrowUpDown className="w-3.5 h-3.5" /> Clasificación final (ordena de 1º a 4º)
                  </p>
                  <div className="space-y-1.5">
                    {clasif.map((codigo, idx) => {
                      const eq = equiposPorCodigo[codigo];
                      const posIcon = ['🥇', '🥈', '🥉', '4️⃣'][idx];
                      return (
                        <div key={codigo} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border">
                          <span className="text-lg w-7">{posIcon}</span>
                          <span className="text-xl">{eq?.bandera_emoji}</span>
                          <span className="flex-1 font-medium text-sm">{eq?.nombre}</span>
                          <div className="flex gap-1">
                            <button
                              disabled={isBlocked || idx === 0}
                              onClick={() => moverEquipo(g, codigo, 'up')}
                              className="w-8 h-8 rounded bg-white border hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ChevronUp className="w-4 h-4 mx-auto" />
                            </button>
                            <button
                              disabled={isBlocked || idx === 3}
                              onClick={() => moverEquipo(g, codigo, 'down')}
                              className="w-8 h-8 rounded bg-white border hover:bg-slate-100 disabled:opacity-30"
                            >
                              <ChevronDown className="w-4 h-4 mx-auto" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {!participante.clasificacion_grupos?.[g] && (
                    <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Ordena los equipos al menos una vez para confirmar tu clasificación
                    </p>
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