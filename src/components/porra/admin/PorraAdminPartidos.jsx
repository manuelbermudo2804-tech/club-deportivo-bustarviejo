import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, Save } from "lucide-react";
import { toast } from "sonner";
import EliminatoriaPartidoRow from "@/components/porra/admin/EliminatoriaPartidoRow";

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Botones 1/X/2 inline para meter resultado real
function ResultadoBotones({ partido, equipos, onChange }) {
  const local = equipos.find(e => e.codigo === partido.equipo_local_codigo);
  const visit = equipos.find(e => e.codigo === partido.equipo_visitante_codigo);

  const nombreLocal = local?.nombre || partido.equipo_local_placeholder;
  const nombreVisit = visit?.nombre || partido.equipo_visitante_placeholder;

  return (
    <div className="py-2 px-2 hover:bg-slate-50 rounded">
      {/* Equipos en líneas completas (sin cortar) + botones 1/X/2 debajo */}
      <div className="space-y-1 mb-2 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-lg flex-shrink-0">{local?.bandera_emoji || '🏳️'}</span>
          <span className="font-semibold text-slate-800 leading-tight">{nombreLocal}</span>
          <span className="ml-auto text-[10px] font-bold text-slate-400 flex-shrink-0">1</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-lg flex-shrink-0">{visit?.bandera_emoji || '🏳️'}</span>
          <span className="font-semibold text-slate-800 leading-tight">{nombreVisit}</span>
          <span className="ml-auto text-[10px] font-bold text-slate-400 flex-shrink-0">2</span>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {['1', 'X', '2'].map(r => {
          const etiqueta = r === '1' ? `Gana ${nombreLocal}` : r === '2' ? `Gana ${nombreVisit}` : 'Empate';
          return (
            <button
              key={r}
              onClick={() => onChange(partido.id, r)}
              className={`h-11 rounded-lg text-sm font-black transition-all flex flex-col items-center justify-center leading-none ${
                partido.resultado_real === r
                  ? 'bg-green-600 text-white shadow'
                  : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
              }`}
            >
              <span>{r}</span>
              <span className={`text-[9px] font-medium mt-0.5 truncate max-w-full px-1 ${partido.resultado_real === r ? 'text-green-100' : 'text-slate-500'}`}>{etiqueta}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function PorraAdminPartidos({ partidos = [], equipos = [], onUpdate }) {
  const [regenerando, setRegenerando] = useState(false);
  // Estado local de eliminatorias para no recargar todo el panel admin al editar.
  // Sincronizamos con la prop cada vez que cambia "de verdad" el contenido:
  // - número de partidos
  // - IDs (para evitar quedarnos con datos antiguos tras regenerar)
  // - equipos/resultados asignados (firma de contenido)
  // De este modo, si el padre recarga al cambiar de sección, los datos frescos
  // de la BD se reflejan aquí en vez de quedarse con el estado local vacío inicial.
  const [elimiLocal, setElimiLocal] = useState([]);
  const elimiFromProps = useMemo(() => partidos.filter(p => p.fase !== 'grupos'), [partidos]);
  const elimiSignature = useMemo(() => {
    return elimiFromProps
      .map(p => `${p.id}:${p.equipo_local_codigo || ''}|${p.equipo_visitante_codigo || ''}|${p.resultado_real || ''}|${p.ganador_codigo || ''}`)
      .join(';');
  }, [elimiFromProps]);

  useEffect(() => {
    setElimiLocal(elimiFromProps);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elimiSignature]);

  const grupos = partidos.filter(p => p.fase === 'grupos');
  const elimi = elimiLocal;

  // Para cada fase, set de equipos ya usados en partidos de esa fase
  const equiposUsadosPorFase = useMemo(() => {
    const map = {};
    elimi.forEach(p => {
      if (!map[p.fase]) map[p.fase] = new Set();
      if (p.equipo_local_codigo) map[p.fase].add(p.equipo_local_codigo);
      if (p.equipo_visitante_codigo) map[p.fase].add(p.equipo_visitante_codigo);
    });
    return map;
  }, [elimi]);

  // Calcular los 32 clasificados a 16avos según resultados reales de grupos:
  // - 12 primeros + 12 segundos de cada grupo
  // - 8 mejores terceros (ordenados por puntos > victorias)
  const clasificadosA16avos = useMemo(() => {
    const tablas = {}; // { grupo: [{codigo, pts, victorias}] }
    GRUPOS.forEach(g => {
      const equiposGrupo = equipos.filter(e => e.grupo === g);
      const tabla = {};
      equiposGrupo.forEach(e => {
        tabla[e.codigo] = { codigo: e.codigo, pts: 0, victorias: 0 };
      });
      const partidosGrupo = grupos.filter(p => p.grupo === g && p.resultado_real);
      partidosGrupo.forEach(p => {
        const local = tabla[p.equipo_local_codigo];
        const visit = tabla[p.equipo_visitante_codigo];
        if (!local || !visit) return;
        if (p.resultado_real === '1') { local.pts += 3; local.victorias += 1; }
        else if (p.resultado_real === '2') { visit.pts += 3; visit.victorias += 1; }
        else if (p.resultado_real === 'X') { local.pts += 1; visit.pts += 1; }
      });
      tablas[g] = Object.values(tabla).sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.victorias !== a.victorias) return b.victorias - a.victorias;
        return a.codigo.localeCompare(b.codigo);
      });
    });
    const primeros = GRUPOS.map(g => tablas[g][0]?.codigo).filter(Boolean);
    const segundos = GRUPOS.map(g => tablas[g][1]?.codigo).filter(Boolean);
    const tercerosOrdenados = GRUPOS.map(g => tablas[g][2]).filter(Boolean)
      .sort((a, b) => {
        if (b.pts !== a.pts) return b.pts - a.pts;
        if (b.victorias !== a.victorias) return b.victorias - a.victorias;
        return a.codigo.localeCompare(b.codigo);
      });
    const mejoresTerceros = tercerosOrdenados.slice(0, 8).map(t => t.codigo);
    return new Set([...primeros, ...segundos, ...mejoresTerceros]);
  }, [grupos, equipos]);

  // Equipos disponibles para elegir en cada fase eliminatoria
  // - 16avos: los 32 clasificados según resultados reales de grupos (si hay resultados); si no, todos
  // - 8vos en adelante: solo los GANADORES de la fase anterior
  const ORDEN_FASES = ['16avos', '8vos', '4tos', 'semis', 'tercer_puesto', 'final'];
  const equiposDisponiblesPorFase = useMemo(() => {
    const map = {};
    // 16avos: si hay al menos 32 equipos clasificados calculados, filtrar; si no, dejar todos (null)
    map['16avos'] = clasificadosA16avos.size >= 32 ? clasificadosA16avos : null;
    // 8vos = ganadores de 16avos
    const ganadores16 = elimi.filter(p => p.fase === '16avos' && p.ganador_codigo).map(p => p.ganador_codigo);
    map['8vos'] = new Set(ganadores16);
    // 4tos = ganadores de 8vos
    const ganadores8 = elimi.filter(p => p.fase === '8vos' && p.ganador_codigo).map(p => p.ganador_codigo);
    map['4tos'] = new Set(ganadores8);
    // semis = ganadores de 4tos
    const ganadores4 = elimi.filter(p => p.fase === '4tos' && p.ganador_codigo).map(p => p.ganador_codigo);
    map['semis'] = new Set(ganadores4);
    // tercer_puesto = perdedores de semis (los que no ganaron)
    const semisPartidos = elimi.filter(p => p.fase === 'semis' && p.ganador_codigo);
    const perdedoresSemis = semisPartidos.map(p => {
      if (p.ganador_codigo === p.equipo_local_codigo) return p.equipo_visitante_codigo;
      if (p.ganador_codigo === p.equipo_visitante_codigo) return p.equipo_local_codigo;
      return null;
    }).filter(Boolean);
    map['tercer_puesto'] = new Set(perdedoresSemis);
    // final = ganadores de semis
    const ganadoresSemis = semisPartidos.map(p => p.ganador_codigo);
    map['final'] = new Set(ganadoresSemis);
    return map;
  }, [elimi]);

  const handleLocalChange = (nuevoPartido) => {
    setElimiLocal(prev => prev.map(p => p.id === nuevoPartido.id ? nuevoPartido : p));
  };

  const handleResultado = async (partidoId, resultado) => {
    try {
      await base44.entities.PorraPartido.update(partidoId, { 
        resultado_real: resultado,
        finalizado: true,
      });
      toast.success(`Resultado guardado: ${resultado}`);
      onUpdate?.();
    } catch (e) {
      toast.error('Error: ' + e.message);
    }
  };

  const regenerarPartidos = async () => {
    // ⚠️ Aviso reforzado: si hay predicciones, se quedan huérfanas al regenerar (cambian los IDs)
    try {
      const conPredicciones = await base44.entities.PorraParticipante.filter({});
      const conPreds = conPredicciones.filter(p => p.predicciones_grupos && Object.keys(p.predicciones_grupos).length > 0);
      if (conPreds.length > 0) {
        const ok = confirm(
          `⚠️ ATENCIÓN: Hay ${conPreds.length} participantes con predicciones guardadas.\n\n` +
          `Si regeneras los partidos, los IDs cambiarán y TODAS las predicciones quedarán huérfanas (apuntando a partidos que ya no existen). Sus puntos serán 0.\n\n` +
          `Solo debes regenerar si vas a borrar también todos los participantes.\n\n` +
          `¿Continuar de todas formas?`
        );
        if (!ok) return;
      } else if (!confirm('¿Regenerar TODOS los partidos? Se perderán los resultados ya introducidos.')) {
        return;
      }
    } catch {
      if (!confirm('¿Regenerar TODOS los partidos? Se perderán los resultados ya introducidos.')) return;
    }
    setRegenerando(true);
    try {
      await base44.functions.invoke('porraGenerarPartidos', {});
      await base44.functions.invoke('porraGenerarEliminatorias', {});
      toast.success('Partidos regenerados');
      onUpdate?.();
    } catch (e) {
      toast.error('Error: ' + e.message);
    } finally {
      setRegenerando(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <CardTitle>⚽ Partidos del Mundial</CardTitle>
            <p className="text-sm text-slate-500">{partidos.length} partidos · Marca el resultado real (1/X/2)</p>
          </div>
          <Button onClick={regenerarPartidos} variant="outline" disabled={regenerando}>
            <RefreshCw className={`w-4 h-4 mr-2 ${regenerando ? 'animate-spin' : ''}`} />
            Regenerar todos
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="grupos">
          <TabsList>
            <TabsTrigger value="grupos">Fase de grupos ({grupos.length})</TabsTrigger>
            <TabsTrigger value="elimi">Eliminatorias ({elimi.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="grupos" className="mt-4">
            <div className="grid md:grid-cols-2 gap-4">
              {GRUPOS.map(g => {
                const ps = grupos.filter(p => p.grupo === g).sort((a, b) => a.numero_partido - b.numero_partido);
                return (
                  <div key={g} className="border rounded-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white px-3 py-2 font-bold">
                      Grupo {g}
                    </div>
                    <div className="divide-y">
                      {ps.map(p => (
                        <ResultadoBotones key={p.id} partido={p} equipos={equipos} onChange={handleResultado} />
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="elimi" className="mt-4">
            <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 mb-4 text-sm">
              <p className="font-bold text-blue-900 mb-1">📋 Cómo rellenar las eliminatorias</p>
              <p className="text-blue-800 text-xs leading-relaxed">
                1️⃣ Al acabar la fase de grupos, asigna en cada partido de <strong>16avos</strong> los dos equipos clasificados (usa los desplegables).<br/>
                2️⃣ Tras cada partido eliminatorio, pulsa <strong>1</strong> (gana local) o <strong>2</strong> (gana visitante). En eliminatorias no hay empate (si hay penaltis, marca quién ganó). El ganador se guarda automáticamente.<br/>
                3️⃣ Repite el paso 1 con los ganadores en <strong>8vos</strong>, <strong>cuartos</strong>, <strong>semis</strong>, <strong>tercer puesto</strong> y <strong>final</strong>.
              </p>
            </div>
            <div className="space-y-4">
              {['16avos', '8vos', '4tos', 'semis', 'tercer_puesto', 'final'].map(fase => {
                const ps = elimi.filter(p => p.fase === fase).sort((a, b) => a.numero_partido - b.numero_partido);
                if (ps.length === 0) return null;
                const titulos = {
                  '16avos': '16avos de final',
                  '8vos': 'Octavos de final',
                  '4tos': 'Cuartos de final',
                  'semis': 'Semifinales',
                  'tercer_puesto': '🥉 Tercer puesto',
                  'final': '🏆 Final',
                };
                return (
                  <div key={fase} className="border-2 rounded-xl overflow-hidden">
                    <div className="bg-slate-800 text-white px-3 py-2 font-bold">
                      {titulos[fase]} ({ps.length})
                    </div>
                    <div>
                      {ps.map(p => {
                        const disponibles = equiposDisponiblesPorFase[fase];
                        // Si disponibles es null (16avos) → todos los equipos; si no → filtrar
                        const equiposFase = disponibles === null
                          ? equipos
                          : equipos.filter(eq => disponibles.has(eq.codigo) || eq.codigo === p.equipo_local_codigo || eq.codigo === p.equipo_visitante_codigo);
                        return (
                          <EliminatoriaPartidoRow
                            key={p.id}
                            partido={p}
                            equipos={equiposFase}
                            equiposUsadosEnFase={equiposUsadosPorFase[fase] || new Set()}
                            onLocalChange={handleLocalChange}
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}