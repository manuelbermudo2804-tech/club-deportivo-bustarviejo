import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Save, Trophy, AlertCircle } from "lucide-react";
import { toast } from "sonner";

// Panel admin para marcar los 8 mejores terceros REALES al acabar la fase de grupos
// Se muestran los 12 equipos que han quedado 3º en cada grupo (según resultados reales)
// y el admin marca los 8 que pasan a 16avos según la FIFA
export default function PorraAdminMejoresTercerosReales({ config, partidos, equipos, onUpdate }) {
  const [seleccionados, setSeleccionados] = useState(config?.mejores_terceros_reales || []);
  const [saving, setSaving] = useState(false);
  const [recalc, setRecalc] = useState(false);

  useEffect(() => {
    setSeleccionados(config?.mejores_terceros_reales || []);
  }, [config?.mejores_terceros_reales]);

  const equiposPorCodigo = useMemo(() => {
    const m = {};
    equipos.forEach(e => { m[e.codigo] = e; });
    return m;
  }, [equipos]);

  // Calcular el 3º real de cada grupo según partidos finalizados
  const tercerosReales = useMemo(() => {
    const grupos = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
    return grupos.map(g => {
      const partidosGrupo = partidos.filter(p => p.fase === 'grupos' && p.grupo === g);
      const finalizados = partidosGrupo.filter(p => p.finalizado);
      if (finalizados.length < 6) return { grupo: g, codigo: null, completo: false };

      // Calcular tabla del grupo
      const tabla = {};
      const equiposGrupo = equipos.filter(e => e.grupo === g);
      equiposGrupo.forEach(e => {
        tabla[e.codigo] = { codigo: e.codigo, pts: 0, gf: 0, gc: 0 };
      });

      finalizados.forEach(p => {
        const gl = p.goles_local ?? 0;
        const gv = p.goles_visitante ?? 0;
        const local = tabla[p.equipo_local_codigo];
        const visit = tabla[p.equipo_visitante_codigo];
        if (!local || !visit) return;
        local.gf += gl; local.gc += gv;
        visit.gf += gv; visit.gc += gl;
        if (p.resultado_real === '1') local.pts += 3;
        else if (p.resultado_real === '2') visit.pts += 3;
        else { local.pts += 1; visit.pts += 1; }
      });

      const yaSeleccionados = config?.mejores_terceros_reales || [];
      const ordenados = Object.values(tabla).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if ((b.gf - b.gc) !== (a.gf - a.gc)) return (b.gf - b.gc) - (a.gf - a.gc);
        if (b.gf !== a.gf) return b.gf - a.gf;
        // Empate total (frecuente cuando no hay goles metidos): priorizar como 3º
        // al equipo que el admin YA tiene marcado en su lista de mejores terceros,
        // para que aparezca en el cuadro y se pueda mantener/marcar.
        const aMarcado = yaSeleccionados.includes(a.codigo);
        const bMarcado = yaSeleccionados.includes(b.codigo);
        if (aMarcado && !bMarcado) return 1;  // 'a' marcado → empújalo hacia 3º
        if (bMarcado && !aMarcado) return -1;
        return 0;
      });

      return { grupo: g, codigo: ordenados[2]?.codigo, pts: ordenados[2]?.pts, dg: (ordenados[2]?.gf || 0) - (ordenados[2]?.gc || 0), gf: ordenados[2]?.gf || 0, completo: true };
    });
  }, [partidos, equipos]);

  const completos = tercerosReales.filter(t => t.completo).length;
  const numSeleccionados = seleccionados.length;

  const toggle = (codigo) => {
    if (seleccionados.includes(codigo)) {
      setSeleccionados(seleccionados.filter(c => c !== codigo));
    } else {
      if (numSeleccionados >= 8) {
        toast.error('Ya tienes 8 seleccionados. Desmarca uno antes.');
        return;
      }
      setSeleccionados([...seleccionados, codigo]);
    }
  };

  const guardar = async () => {
    if (numSeleccionados !== 8) {
      toast.error('Debes seleccionar exactamente 8 equipos');
      return;
    }
    setSaving(true);
    try {
      await base44.entities.PorraConfig.update(config.id, { mejores_terceros_reales: seleccionados });
      toast.success('✅ 8 mejores terceros guardados');
      onUpdate?.();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  const recalcularPuntos = async () => {
    setRecalc(true);
    try {
      const { data } = await base44.functions.invoke('porraCalcularPuntos', {});
      toast.success(`✅ Puntos recalculados: ${data.actualizados} participantes`);
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setRecalc(false);
    }
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-purple-600" />
          🥉 Los 8 mejores terceros (reales)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-purple-100 border border-purple-300 rounded-lg p-3 text-sm">
          <p className="font-bold text-purple-900">📌 Cuándo usar esto</p>
          <p className="text-purple-800 text-xs mt-1">
            Cuando acaben los <strong>72 partidos de la fase de grupos</strong>, marca aquí los 8 mejores terceros que la FIFA decida que pasan a 16avos.<br/>
            Después pulsa "Recalcular puntos" para que cada participante reciba los puntos por sus aciertos.
          </p>
        </div>

        {completos < 12 ? (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-sm flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-900">Fase de grupos incompleta</p>
              <p className="text-amber-800 text-xs">
                Solo {completos}/12 grupos tienen todos los partidos marcados como finalizados. Termina de marcar los partidos antes de seleccionar los mejores terceros.
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <p className="font-bold text-slate-900">Selecciona los 8 que pasan:</p>
              <div className="flex items-center gap-2">
                {numSeleccionados > 0 && (
                  <Button
                    onClick={() => setSeleccionados([])}
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Limpiar selección
                  </Button>
                )}
                <span className={`text-lg font-black ${numSeleccionados === 8 ? 'text-green-600' : 'text-purple-600'}`}>
                  {numSeleccionados}/8
                </span>
              </div>
            </div>

            {/* Aviso si hay selecciones "huérfanas" (códigos en seleccionados que ya no son 3º real) */}
            {(() => {
              const codigosTerceros = new Set(tercerosReales.filter(t => t.codigo).map(t => t.codigo));
              const huerfanos = seleccionados.filter(c => !codigosTerceros.has(c));
              if (huerfanos.length === 0) return null;
              return (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-3 text-sm">
                  <p className="font-bold text-red-900">⚠️ Hay {huerfanos.length} equipo(s) seleccionado(s) que ya no son 3º de grupo</p>
                  <p className="text-red-700 text-xs mt-1">
                    Probablemente cambiaste resultados de partidos. Pulsa "Limpiar selección" y vuelve a marcar los 8.
                  </p>
                </div>
              );
            })()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {tercerosReales.filter(t => t.codigo).map(({ grupo, codigo, pts, dg, gf }) => {
                const eq = equiposPorCodigo[codigo];
                const elegido = seleccionados.includes(codigo);
                return (
                  <button
                    key={codigo}
                    onClick={() => toggle(codigo)}
                    className={`flex items-center gap-3 p-3 rounded-lg border-2 transition-all text-left ${
                      elegido
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 border-purple-600 text-white shadow-lg'
                        : 'bg-white border-slate-200 hover:border-purple-400'
                    }`}
                  >
                    <span className="text-2xl">{eq?.bandera_emoji || '🏳️'}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm ${elegido ? 'text-white' : 'text-slate-900'}`}>
                        {eq?.nombre || codigo}
                      </p>
                      <p className={`text-[10px] ${elegido ? 'text-white/80' : 'text-slate-500'}`}>
                        3º Grupo {grupo} · {pts} pts · DG {dg >= 0 ? '+' : ''}{dg} · GF {gf}
                      </p>
                    </div>
                    {elegido && <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0" />}
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={guardar} disabled={saving || numSeleccionados !== 8} className="bg-purple-600 hover:bg-purple-700">
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Guardando...' : 'Guardar selección'}
              </Button>
              <Button onClick={recalcularPuntos} disabled={recalc || numSeleccionados !== 8} variant="outline" className="border-2 border-purple-500 text-purple-700">
                <Trophy className="w-4 h-4 mr-2" />
                {recalc ? 'Recalculando...' : 'Recalcular puntos'}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}