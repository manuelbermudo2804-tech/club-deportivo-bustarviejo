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

  return (
    <div className="flex items-center gap-2 py-1.5 px-2 hover:bg-slate-50 rounded">
      <div className="flex-1 flex items-center gap-2 text-sm min-w-0">
        <span className="text-lg">{local?.bandera_emoji || '🏳️'}</span>
        <span className="font-medium truncate">{local?.nombre || partido.equipo_local_placeholder}</span>
        <span className="text-slate-400">vs</span>
        <span className="text-lg">{visit?.bandera_emoji || '🏳️'}</span>
        <span className="font-medium truncate">{visit?.nombre || partido.equipo_visitante_placeholder}</span>
      </div>
      <div className="flex gap-1">
        {['1', 'X', '2'].map(r => (
          <button
            key={r}
            onClick={() => onChange(partido.id, r)}
            className={`w-8 h-8 rounded text-xs font-bold transition-all ${
              partido.resultado_real === r
                ? 'bg-green-600 text-white shadow scale-110'
                : 'bg-slate-200 hover:bg-slate-300 text-slate-700'
            }`}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function PorraAdminPartidos({ partidos = [], equipos = [], onUpdate }) {
  const [regenerando, setRegenerando] = useState(false);
  // Estado local de eliminatorias para no recargar todo el panel admin al editar
  const [elimiLocal, setElimiLocal] = useState([]);

  useEffect(() => {
    setElimiLocal(partidos.filter(p => p.fase !== 'grupos'));
  }, [partidos]);

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
                2️⃣ Tras cada partido eliminatorio, pulsa <strong>1</strong> (gana local), <strong>X</strong> (penaltis/empate) o <strong>2</strong> (gana visitante). El ganador se guarda automáticamente.<br/>
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
                      {ps.map(p => (
                        <EliminatoriaPartidoRow
                          key={p.id}
                          partido={p}
                          equipos={equipos}
                          equiposUsadosEnFase={equiposUsadosPorFase[fase] || new Set()}
                          onLocalChange={handleLocalChange}
                        />
                      ))}
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