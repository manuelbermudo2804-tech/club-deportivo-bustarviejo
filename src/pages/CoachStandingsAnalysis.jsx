import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap } from "lucide-react";
import StandingsDisplay from "../components/standings/StandingsDisplay";
import QuickMatchObservationForm from "../components/coach/QuickMatchObservationForm";
import { toast } from "sonner";

const CATEGORIES = [
  { id: "prebenjamin", name: "Pre-Benjamín", fullName: "Fútbol Pre-Benjamín (Mixto)" },
  { id: "benjamin", name: "Benjamín", fullName: "Fútbol Benjamín (Mixto)" },
  { id: "alevin", name: "Alevín", fullName: "Fútbol Alevín (Mixto)" },
  { id: "infantil", name: "Infantil", fullName: "Fútbol Infantil (Mixto)" },
  { id: "cadete", name: "Cadete", fullName: "Fútbol Cadete" },
  { id: "juvenil", name: "Juvenil", fullName: "Fútbol Juvenil" },
  { id: "aficionado", name: "Aficionado", fullName: "Fútbol Aficionado" },
  { id: "femenino", name: "Femenino", fullName: "Fútbol Femenino" },
];

export default function CoachStandingsAnalysis() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("");
  const [aiAnalysis, setAiAnalysis] = useState({});
  const [isAnalyzing, setIsAnalyzing] = useState({});
  const [selectedView, setSelectedView] = useState(null);
  const [showObservationForm, setShowObservationForm] = useState(false);
  
  const queryClient = useQueryClient();

  React.useEffect(() => {
    const loadUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);

      // Establecer primera categoría activa
      if (currentUser.categorias_entrena?.length > 0) {
        const firstCat = CATEGORIES.find(c => 
          currentUser.categorias_entrena.includes(c.fullName)
        );
        if (firstCat) setActiveTab(firstCat.id);
      }
    };
    loadUser();
  }, []);

  const { data: standings = [] } = useQuery({
    queryKey: ['clasificaciones'],
    queryFn: () => base44.entities.Clasificacion.list('-jornada'),
    initialData: [],
  });

  const { data: attendances = [] } = useQuery({
    queryKey: ['attendances'],
    queryFn: () => base44.entities.Attendance.list(),
    enabled: !!user,
  });

  const { data: evaluations = [] } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list(),
    enabled: !!user,
  });

  const { data: matchObservations = [] } = useQuery({
    queryKey: ['matchObservations'],
    queryFn: () => base44.entities.MatchObservation.list('-fecha_partido'),
    enabled: !!user,
  });

  const saveObservationMutation = useMutation({
    mutationFn: (data) => base44.entities.MatchObservation.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['matchObservations'] });
      setShowObservationForm(false);
      toast.success("✅ Observación guardada");
    },
    onError: () => toast.error("Error al guardar"),
  });

  // Agrupar clasificaciones por categoría
  const standingsByCategory = CATEGORIES.reduce((acc, cat) => {
    const categoryStandings = standings.filter(s => s.categoria === cat.fullName);
    
    const grouped = categoryStandings.reduce((groupAcc, standing) => {
      const key = `${standing.temporada}|${standing.jornada}`;
      if (!groupAcc[key]) {
        groupAcc[key] = {
          temporada: standing.temporada,
          categoria: standing.categoria,
          jornada: standing.jornada,
          fecha_actualizacion: standing.fecha_actualizacion,
          data: []
        };
      }
      groupAcc[key].data.push(standing);
      return groupAcc;
    }, {});

    acc[cat.id] = Object.values(grouped).sort((a, b) => 
      new Date(b.fecha_actualizacion) - new Date(a.fecha_actualizacion)
    );
    
    return acc;
  }, {});

  const analyzeWithAI = async (categoria) => {
    setIsAnalyzing(prev => ({ ...prev, [categoria]: true }));

    const latestStanding = standingsByCategory[activeTab]?.[0];
    if (!latestStanding) {
      toast.error("No hay clasificaciones disponibles");
      setIsAnalyzing(prev => ({ ...prev, [categoria]: false }));
      return;
    }

    const bustarStats = latestStanding.data.find(s => 
      s.nombre_equipo.toLowerCase().includes('bustarviejo')
    );

    if (!bustarStats) {
      toast.error("No se encontraron datos de CD Bustarviejo");
      setIsAnalyzing(prev => ({ ...prev, [categoria]: false }));
      return;
    }

    // Preparar contexto para la IA
    const categoryAttendances = attendances.filter(a => a.categoria === latestStanding.categoria);
    const categoryEvaluations = evaluations.filter(e => e.categoria === latestStanding.categoria);
    const categoryObservations = matchObservations.filter(o => o.categoria === latestStanding.categoria);

    const avgAttendance = categoryAttendances.length > 0
      ? (categoryAttendances.reduce((sum, a) => 
          sum + (a.asistencias?.filter(x => x.estado === 'presente').length || 0), 0
        ) / categoryAttendances.length).toFixed(1)
      : 'N/A';

    const avgEvaluation = categoryEvaluations.length > 0
      ? (categoryEvaluations.reduce((sum, e) => 
          sum + ((e.tecnica + e.tactica + e.fisica + e.actitud + e.trabajo_equipo) / 5), 0
        ) / categoryEvaluations.length).toFixed(2)
      : 'N/A';

    // Estadísticas de observaciones post-partido
    const observationsContext = categoryObservations.length > 0
      ? `\n**Observaciones Post-Partido (últimos ${Math.min(5, categoryObservations.length)} partidos):**
${categoryObservations.slice(0, 5).map(obs => `
- ${obs.rival} (${obs.resultado}): Estado físico ${obs.estado_fisico}/5, Solidez defensiva ${obs.solidez_defensiva}/5, Control ${obs.control_partido}/5
  ${obs.goles_primera_parte !== null ? `Goles: 1ªP ${obs.goles_primera_parte}, 2ªP ${obs.goles_segunda_parte}` : ''}
  ${obs.ocasiones_claras ? `Ocasiones claras: ${obs.ocasiones_claras}` : ''}
  ${obs.observaciones ? `Notas: ${obs.observaciones}` : ''}`).join('\n')}`
      : '';

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un analista deportivo experto. Analiza los datos del equipo CD Bustarviejo y proporciona recomendaciones concretas.

**Datos de Clasificación:**
- Posición: ${bustarStats.posicion}º de ${latestStanding.data.length} equipos
- Puntos: ${bustarStats.puntos}
- Partidos: ${bustarStats.partidos_jugados || 'N/A'} (${bustarStats.ganados || 0}G-${bustarStats.empatados || 0}E-${bustarStats.perdidos || 0}P)
- Goles favor: ${bustarStats.goles_favor || 'N/A'}
- Goles contra: ${bustarStats.goles_contra || 'N/A'}
- Diferencia: ${(bustarStats.goles_favor || 0) - (bustarStats.goles_contra || 0)}

**Datos de Entrenamiento:**
- Asistencia promedio: ${avgAttendance} jugadores
- Evaluación promedio: ${avgEvaluation}/5.0
${observationsContext}

Proporciona un análisis con:
1. **Puntos Fuertes** (2-3 aspectos concretos)
2. **Áreas de Mejora** (2-3 aspectos prioritarios)
3. **Recomendaciones Tácticas** (3-4 acciones específicas)
4. **Objetivos Realistas** (para las próximas 3-5 jornadas)

Sé directo, práctico y enfocado en acciones concretas que el entrenador pueda implementar.`,
        response_json_schema: {
          type: "object",
          properties: {
            puntos_fuertes: {
              type: "array",
              items: { type: "string" }
            },
            areas_mejora: {
              type: "array",
              items: { type: "string" }
            },
            recomendaciones: {
              type: "array",
              items: { type: "string" }
            },
            objetivos: {
              type: "array",
              items: { type: "string" }
            },
            resumen: {
              type: "string"
            }
          }
        }
      });

      setAiAnalysis(prev => ({ ...prev, [categoria]: result }));
      toast.success("✨ Análisis completado");
    } catch (error) {
      console.error("Error analyzing:", error);
      toast.error("Error al generar análisis");
    } finally {
      setIsAnalyzing(prev => ({ ...prev, [categoria]: false }));
    }
  };

  const visibleCategories = user?.categorias_entrena?.length > 0
    ? CATEGORIES.filter(c => user.categorias_entrena.includes(c.fullName))
    : CATEGORIES;

  if (!user) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (selectedView) {
    return (
      <div className="p-6 space-y-6">
        <Button onClick={() => setSelectedView(null)} variant="outline">
          ← Volver al análisis
        </Button>
        <StandingsDisplay data={selectedView} onClose={() => setSelectedView(null)} fullPage={true} />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
          <BarChart3 className="w-8 h-8 text-orange-600" />
          Análisis de Clasificaciones
        </h1>
        <p className="text-slate-600 mt-1">Análisis táctico con IA para tus equipos</p>
      </div>

      {activeTab && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-3 md:grid-cols-5 gap-2 h-auto bg-white p-2 rounded-xl shadow-sm mb-6">
            {visibleCategories.map((cat) => (
              <TabsTrigger
                key={cat.id}
                value={cat.id}
                className="data-[state=active]:bg-orange-600 data-[state=active]:text-white rounded-lg py-3"
              >
                <span className="font-semibold text-sm">{cat.name}</span>
              </TabsTrigger>
            ))}
          </TabsList>

          {visibleCategories.map((cat) => {
            const latestStanding = standingsByCategory[cat.id]?.[0];
            const analysis = aiAnalysis[cat.id];
            const analyzing = isAnalyzing[cat.id];

            return (
              <TabsContent key={cat.id} value={cat.id} className="space-y-4">
                {latestStanding ? (
                  <>
                    <Card className="border-2 border-orange-500">
                     <CardHeader>
                       <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                         <span>{cat.name} - Jornada {latestStanding.jornada}</span>
                         <div className="flex gap-2 flex-wrap">
                           <Button
                             onClick={() => setShowObservationForm(true)}
                             variant="outline"
                             size="sm"
                             className="border-green-500 text-green-600 hover:bg-green-50"
                           >
                             <Zap className="w-4 h-4 mr-2" />
                             Registrar Partido
                           </Button>
                           <Button
                             onClick={() => setSelectedView(latestStanding)}
                             variant="outline"
                             size="sm"
                           >
                             Ver Tabla Completa
                           </Button>
                           <Button
                             onClick={() => analyzeWithAI(cat.id)}
                             disabled={analyzing}
                             className="bg-purple-600 hover:bg-purple-700"
                             size="sm"
                           >
                             {analyzing ? (
                               <>
                                 <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                                 Analizando...
                               </>
                             ) : (
                               <>
                                 <Sparkles className="w-4 h-4 mr-2" />
                                 Analizar con IA
                               </>
                             )}
                           </Button>
                         </div>
                       </CardTitle>
                     </CardHeader>
                    </Card>

                    {showObservationForm && (
                      <QuickMatchObservationForm
                        categoria={latestStanding.categoria}
                        jornada={latestStanding.jornada}
                        onSave={(data) => saveObservationMutation.mutate(data)}
                        onCancel={() => setShowObservationForm(false)}
                        entrenadorEmail={user.email}
                        entrenadorNombre={user.full_name}
                      />
                    )}

                    {matchObservations.filter(o => o.categoria === latestStanding.categoria).length > 0 && (
                     <Card className="bg-green-50 border-2 border-green-300">
                       <CardHeader>
                         <CardTitle className="text-sm text-green-700">
                           ✅ {matchObservations.filter(o => o.categoria === latestStanding.categoria).length} partidos registrados
                         </CardTitle>
                       </CardHeader>
                       <CardContent className="text-xs text-green-600">
                         Tus observaciones post-partido mejoran el análisis con IA
                       </CardContent>
                     </Card>
                    )}

                    {analysis && (
                      <div className="grid md:grid-cols-2 gap-4">
                        <Card className="border-2 border-green-300">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-green-700">
                              <CheckCircle2 className="w-5 h-5" />
                              Puntos Fuertes
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {analysis.puntos_fuertes?.map((punto, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <TrendingUp className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                                  <span className="text-sm">{punto}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-2 border-orange-300">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-orange-700">
                              <AlertTriangle className="w-5 h-5" />
                              Áreas de Mejora
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {analysis.areas_mejora?.map((area, idx) => (
                                <li key={idx} className="flex items-start gap-2">
                                  <TrendingDown className="w-4 h-4 text-orange-600 mt-1 flex-shrink-0" />
                                  <span className="text-sm">{area}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-2 border-blue-300 md:col-span-2">
                          <CardHeader>
                            <CardTitle className="text-blue-700">Recomendaciones Tácticas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="grid md:grid-cols-2 gap-3">
                              {analysis.recomendaciones?.map((rec, idx) => (
                                <li key={idx} className="flex items-start gap-2 bg-blue-50 p-3 rounded-lg">
                                  <Sparkles className="w-4 h-4 text-blue-600 mt-1 flex-shrink-0" />
                                  <span className="text-sm">{rec}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>

                        <Card className="border-2 border-purple-300 md:col-span-2">
                          <CardHeader>
                            <CardTitle className="text-purple-700">Objetivos Próximas Jornadas</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <ul className="space-y-2">
                              {analysis.objetivos?.map((obj, idx) => (
                                <li key={idx} className="flex items-center gap-2">
                                  <Badge className="bg-purple-600">{idx + 1}</Badge>
                                  <span className="text-sm">{obj}</span>
                                </li>
                              ))}
                            </ul>
                          </CardContent>
                        </Card>

                        {analysis.resumen && (
                          <Card className="bg-gradient-to-r from-slate-50 to-slate-100 md:col-span-2">
                            <CardContent className="p-4">
                              <p className="text-sm text-slate-700 italic">{analysis.resumen}</p>
                            </CardContent>
                          </Card>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <Card className="border-2 border-dashed border-slate-300">
                    <CardContent className="p-12 text-center">
                      <p className="text-slate-500">No hay clasificaciones disponibles para {cat.name}</p>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            );
          })}
        </Tabs>
      )}

      {/* Info sobre registro post-partido */}
      <Card className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 mt-6">
        <CardHeader>
          <CardTitle className="text-green-900 flex items-center gap-2">
            <Zap className="w-5 h-5" />
            🚀 Mejora tu Análisis con IA
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-green-800 mb-3">
            <strong>Registra 4 datos en 30 segundos</strong> después de cada partido y obtén análisis mucho más precisos:
          </p>
          <div className="grid md:grid-cols-2 gap-2 text-sm">
            <Badge className="bg-green-600 justify-start">⚽ Goles 1ª/2ª parte</Badge>
            <Badge className="bg-green-600 justify-start">💪 Estado físico equipo (1-5)</Badge>
            <Badge className="bg-green-600 justify-start">🛡️ Solidez defensiva (1-5)</Badge>
            <Badge className="bg-green-600 justify-start">🎯 Control del partido (1-5)</Badge>
            <Badge className="bg-green-600 justify-start">⚡ Ocasiones claras creadas</Badge>
            <Badge className="bg-green-600 justify-start">📝 Observaciones breves</Badge>
          </div>
          <p className="text-xs text-green-700 mt-3 italic">
            💡 La IA detectará patrones: ¿Bajamos en 2ª parte? ¿Problemas físicos? ¿Sólidos defensivamente?
          </p>
        </CardContent>
      </Card>
    </div>
  );
}