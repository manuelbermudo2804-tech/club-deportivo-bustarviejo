import React, { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, AlertCircle, Trophy } from "lucide-react";

// Editor para elegir los 8 mejores terceros que pasan a 16avos
// El usuario ve los 12 equipos que él mismo predijo como 3º en cada grupo
// y marca los 8 que cree que pasarán
export default function EditorMejoresTerceros({ participante, equipos, isBlocked, onToggleTercero }) {
  const equiposPorCodigo = useMemo(() => {
    const m = {};
    equipos.forEach(e => { m[e.codigo] = e; });
    return m;
  }, [equipos]);

  // Los 12 candidatos = el 3º de cada grupo según la clasificación del usuario
  const candidatos = useMemo(() => {
    const clasif = participante.clasificacion_grupos || {};
    const grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    return grupos
      .map(g => {
        const ranking = clasif[g];
        if (!ranking || ranking.length < 3) return null;
        return { grupo: g, codigo: ranking[2] };
      })
      .filter(Boolean);
  }, [participante.clasificacion_grupos]);

  const seleccionados = participante.mejores_terceros || [];
  const numSeleccionados = seleccionados.length;
  const completo = numSeleccionados === 8;

  const toggle = (codigo) => {
    if (isBlocked) return;
    const yaEsta = seleccionados.includes(codigo);
    if (yaEsta) {
      onToggleTercero(seleccionados.filter(c => c !== codigo));
    } else {
      if (numSeleccionados >= 8) return; // máximo 8
      onToggleTercero([...seleccionados, codigo]);
    }
  };

  if (candidatos.length < 12) {
    return (
      <Card className="border-2 border-amber-300 bg-amber-50">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-amber-600 mb-2" />
          <p className="font-bold text-amber-900">Primero completa la fase de grupos</p>
          <p className="text-sm text-amber-800 mt-1">
            Necesitas ordenar la clasificación de los 12 grupos para que aparezcan aquí los 12 candidatos a mejor tercero.
          </p>
          <p className="text-xs text-amber-700 mt-2">
            Llevas {candidatos.length}/12 grupos clasificados.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <div className="bg-purple-50 border-2 border-purple-200 rounded-xl p-4 text-sm">
        <p className="font-bold text-purple-900 mb-1 flex items-center gap-2">
          <Trophy className="w-4 h-4" /> Los 8 mejores terceros
        </p>
        <p className="text-purple-800 text-xs leading-relaxed">
          En el Mundial 2026 además de los 24 primeros y segundos, pasan a 16avos <strong>los 8 mejores terceros</strong>.<br/>
          Aquí ves los <strong>12 equipos</strong> que tú mismo predijiste como 3º en cada grupo. <strong>Marca los 8</strong> que crees que pasarán a 16avos.<br/>
          🎯 Cada acierto vale <strong>8 puntos</strong> (máx 64 pts).
        </p>
      </div>

      <Card className={`border-2 ${completo ? 'border-green-400' : 'border-purple-300'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-bold text-slate-900">
              Selecciona {8 - numSeleccionados > 0 ? `${8 - numSeleccionados} más` : '✅ Completo'}
            </p>
            <span className={`text-sm font-bold ${completo ? 'text-green-600' : 'text-purple-600'}`}>
              {numSeleccionados}/8
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {candidatos.map(({ grupo, codigo }) => {
              const eq = equiposPorCodigo[codigo];
              const elegido = seleccionados.includes(codigo);
              const deshabilitado = !elegido && numSeleccionados >= 8;
              return (
                <button
                  key={codigo}
                  onClick={() => toggle(codigo)}
                  disabled={isBlocked || deshabilitado}
                  className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                    elegido
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-600 text-white shadow-lg scale-[1.02]'
                      : deshabilitado
                        ? 'bg-slate-50 border-slate-200 opacity-50 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-purple-400 hover:bg-purple-50'
                  }`}
                >
                  <span className="text-2xl">{eq?.bandera_emoji || '🏳️'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`font-bold text-sm truncate ${elegido ? 'text-white' : 'text-slate-900'}`}>
                      {eq?.nombre || codigo}
                    </p>
                    <p className={`text-[10px] ${elegido ? 'text-white/80' : 'text-slate-500'}`}>
                      3º del Grupo {grupo}
                    </p>
                  </div>
                  {elegido && <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {!completo && (
            <p className="text-xs text-amber-700 mt-3 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" /> Debes seleccionar exactamente 8 equipos.
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}