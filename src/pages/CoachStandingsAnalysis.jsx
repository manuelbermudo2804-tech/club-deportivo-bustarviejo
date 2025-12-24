import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { BarChart3, Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Zap, Target, Shield, Swords } from "lucide-react";
import StandingsDisplay from "../components/standings/StandingsDisplay";
import QuickMatchObservationForm from "../components/coach/QuickMatchObservationForm";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

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
  const [rivalAnalysis, setRivalAnalysis] = useState(null);
  const [isAnalyzingRival, setIsAnalyzingRival] = useState(false);
  const [showRivalDialog, setShowRivalDialog] = useState(false);
  
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
    queryFn: () => base44.entities.Clasificacion.list('-jornada', 200),
    initialData: [],
    staleTime: 300000,
    gcTime: 600000,
    refetchOnWindowFocus: false,
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

  const { data: callups = [] } = useQuery({
    queryKey: ['convocatorias'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    enabled: !!user,
  });

  const { data: resultados = [] } = useQuery({
    queryKey: ['resultados'],
    queryFn: () => base44.entities.Resultado.list('-jornada', 500),
    enabled: !!user,
  });

  const { data: goleadores = [] } = useQuery({
    queryKey: ['goleadores'],
    queryFn: () => base44.entities.Goleador.list('-goles', 300),
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

  const analyzeRival = async (categoria) => {
    setIsAnalyzingRival(true);

    const cat = CATEGORIES.find(c => c.id === categoria);
    if (!cat) return;

    // Buscar próximo partido
    const today = new Date().toISOString().split('T')[0];
    const nextCallup = callups
      .filter(c => c.categoria === cat.fullName && c.publicada && c.fecha_partido >= today && !c.cerrada && c.rival)
      .sort((a, b) => a.fecha_partido.localeCompare(b.fecha_partido))[0];

    if (!nextCallup) {
      toast.error("No hay próximos partidos programados");
      setIsAnalyzingRival(false);
      return;
    }

    const rivalName = nextCallup.rival;
    
    // Recopilar datos del rival
    const latestStanding = standingsByCategory[categoria]?.[0];
    const rivalStanding = latestStanding?.data.find(s => 
      s.nombre_equipo.toLowerCase().includes(rivalName.toLowerCase())
    );

    const bustarStanding = latestStanding?.data.find(s => 
      s.nombre_equipo.toLowerCase().includes('bustarviejo')
    );

    // Últimos resultados del rival
    const rivalResults = resultados
      .filter(r => 
        r.categoria === cat.fullName && 
        (r.local.toLowerCase().includes(rivalName.toLowerCase()) || 
         r.visitante.toLowerCase().includes(rivalName.toLowerCase()))
      )
      .sort((a, b) => b.jornada - a.jornada)
      .slice(0, 5);

    // Goleadores del rival
    const rivalScorers = goleadores
      .filter(g => 
        g.categoria === cat.fullName && 
        g.equipo.toLowerCase().includes(rivalName.toLowerCase())
      )
      .sort((a, b) => b.goles - a.goles)
      .slice(0, 3);

    // Histórico de enfrentamientos
    const historicMatches = resultados
      .filter(r => 
        r.categoria === cat.fullName &&
        ((r.local.toLowerCase().includes('bustarviejo') && r.visitante.toLowerCase().includes(rivalName.toLowerCase())) ||
         (r.visitante.toLowerCase().includes('bustarviejo') && r.local.toLowerCase().includes(rivalName.toLowerCase())))
      )
      .sort((a, b) => b.jornada - a.jornada)
      .slice(0, 3);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un analista táctico de fútbol. Analiza al próximo rival y proporciona un informe PRE-PARTIDO con recomendaciones concretas.

**PRÓXIMO PARTIDO:**
- 🆚 Rival: ${rivalName}
- 📅 Fecha: ${nextCallup.fecha_partido}
- ⏰ Hora: ${nextCallup.hora_partido || 'Por confirmar'}
- 🏟️ Campo: ${nextCallup.local_visitante === 'Local' ? 'Casa (ventaja)' : 'Fuera'}
- 📍 ${nextCallup.ubicacion}

**CLASIFICACIÓN ACTUAL:**
${rivalStanding ? `
- Posición rival: ${rivalStanding.posicion}º de ${latestStanding.data.length}
- Puntos: ${rivalStanding.puntos} pts
- Partidos: ${rivalStanding.partidos_jugados || 'N/A'} (${rivalStanding.ganados || 0}G-${rivalStanding.empatados || 0}E-${rivalStanding.perdidos || 0}P)
- Goles a favor: ${rivalStanding.goles_favor || 0}
- Goles en contra: ${rivalStanding.goles_contra || 0}
- Diferencia: ${(rivalStanding.goles_favor || 0) - (rivalStanding.goles_contra || 0)}
` : '- Sin datos de clasificación'}

${bustarStanding ? `
**TU EQUIPO (CD Bustarviejo):**
- Posición: ${bustarStanding.posicion}º
- Puntos: ${bustarStanding.puntos} pts
- Partidos: ${bustarStanding.partidos_jugados || 'N/A'} (${bustarStanding.ganados || 0}G-${bustarStanding.empatados || 0}E-${bustarStanding.perdidos || 0}P)
- Diferencia goles: ${(bustarStanding.goles_favor || 0) - (bustarStanding.goles_contra || 0)}
` : ''}

**ÚLTIMOS 5 RESULTADOS DEL RIVAL:**
${rivalResults.length > 0 ? rivalResults.map(r => {
  const isLocal = r.local.toLowerCase().includes(rivalName.toLowerCase());
  const golesRival = isLocal ? r.goles_local : r.goles_visitante;
  const golesContra = isLocal ? r.goles_visitante : r.goles_local;
  const resultado = golesRival > golesContra ? 'Victoria' : golesRival < golesContra ? 'Derrota' : 'Empate';
  return `- J${r.jornada}: ${r.local} ${r.goles_local ?? '?'}-${r.goles_visitante ?? '?'} ${r.visitante} → ${resultado}`;
}).join('\n') : '- Sin resultados recientes disponibles'}

**GOLEADORES PELIGROSOS DEL RIVAL:**
${rivalScorers.length > 0 ? rivalScorers.map(g => 
  `- ${g.jugador_nombre}: ${g.goles} goles`
).join('\n') : '- Sin datos de goleadores'}

${historicMatches.length > 0 ? `
**HISTÓRICO DE ENFRENTAMIENTOS:**
${historicMatches.map(h => {
  const bustarLocal = h.local.toLowerCase().includes('bustarviejo');
  const resultado = bustarLocal 
    ? (h.goles_local > h.goles_visitante ? 'Victoria' : h.goles_local < h.goles_visitante ? 'Derrota' : 'Empate')
    : (h.goles_visitante > h.goles_local ? 'Victoria' : h.goles_visitante < h.goles_local ? 'Derrota' : 'Empate');
  return `- J${h.jornada}: ${h.local} ${h.goles_local ?? '?'}-${h.goles_visitante ?? '?'} ${h.visitante} → ${resultado}`;
}).join('\n')}` : ''}

Proporciona un **INFORME PRE-PARTIDO** con:
1. **Racha Reciente** del rival (si vienen ganando, perdiendo, irregulares)
2. **Puntos Fuertes** del rival (2-3 aspectos detectados)
3. **Debilidades Detectadas** (2-3 aspectos que podemos explotar)
4. **Jugadores Clave** a marcar/neutralizar
5. **Plan Táctico Recomendado** (3-4 acciones específicas)
6. **Pronóstico Realista** y nivel de dificultad del partido

Sé directo, práctico y enfocado en cómo GANAR este partido.`,
        response_json_schema: {
          type: "object",
          properties: {
            racha_rival: {
              type: "string",
              description: "Descripción de la racha reciente"
            },
            puntos_fuertes_rival: {
              type: "array",
              items: { type: "string" }
            },
            debilidades_rival: {
              type: "array",
              items: { type: "string" }
            },
            jugadores_clave: {
              type: "array",
              items: { type: "string" }
            },
            plan_tactico: {
              type: "array",
              items: { type: "string" }
            },
            pronostico: {
              type: "string"
            },
            nivel_dificultad: {
              type: "string",
              enum: ["Fácil", "Medio", "Difícil", "Muy Difícil"]
            }
          }
        }
      });

      setRivalAnalysis({
        ...result,
        rival: rivalName,
        fecha: nextCallup.fecha_partido,
        hora: nextCallup.hora_partido,
        ubicacion: nextCallup.ubicacion,
        local_visitante: nextCallup.local_visitante,
        categoria: cat.fullName
      });
      setShowRivalDialog(true);
      toast.success("✨ Análisis del rival completado");
    } catch (error) {
      console.error("Error analyzing rival:", error);
      toast.error("Error al generar análisis");
    } finally {
      setIsAnalyzingRival(false);
    }
  };

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

            // Partidos sin observación - solo si ya pasaron 2h 15min desde el inicio
            const now = new Date();
            const pendingCallups = callups.filter(c => {
              if (c.categoria !== cat.fullName || !c.publicada) return false;
              
              // Ya tiene observación registrada
              if (matchObservations.some(obs => 
                obs.rival === c.rival && 
                obs.fecha_partido === c.fecha_partido &&
                obs.categoria === c.categoria
              )) return false;
              
              // Calcular hora estimada de finalización del partido
              const matchDate = new Date(c.fecha_partido);
              if (matchDate > now) return false; // Partido no ha empezado aún
              
              // Si tiene hora_partido, calcular fin estimado (2h + 15min)
              if (c.hora_partido) {
                const [hours, minutes] = c.hora_partido.split(':').map(Number);
                const matchStart = new Date(matchDate);
                matchStart.setHours(hours, minutes, 0, 0);
                
                // Duración partido (2h) + margen (15min) = 135 minutos
                const matchEnd = new Date(matchStart.getTime() + 135 * 60000);
                
                return now >= matchEnd;
              }
              
              // Si no tiene hora, esperar al día siguiente
              const nextDay = new Date(matchDate);
              nextDay.setDate(nextDay.getDate() + 1);
              return now >= nextDay;
            }).slice(0, 1); // Solo el más reciente

            return (
              <TabsContent key={cat.id} value={cat.id} className="space-y-4">
                {latestStanding ? (
                  <>
                    {/* PARTIDO PENDIENTE DE REGISTRAR - FORZADO */}
                    {pendingCallups.length > 0 && (
                      <Card className="border-4 border-red-500 bg-gradient-to-r from-red-50 to-orange-50 animate-pulse">
                        <CardHeader>
                          <CardTitle className="text-red-700 flex items-center gap-2">
                            <AlertTriangle className="w-6 h-6 animate-bounce" />
                            ⚠️ PARTIDO PENDIENTE DE REGISTRAR
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="bg-white rounded-lg p-4 mb-4">
                            <p className="font-bold text-slate-900 mb-2">🆚 {pendingCallups[0].titulo}</p>
                            <div className="text-sm text-slate-600 space-y-1">
                              <p>📅 {format(new Date(pendingCallups[0].fecha_partido), "d 'de' MMMM", { locale: es })}</p>
                              <p>⏰ {pendingCallups[0].hora_partido}</p>
                              <p>📍 {pendingCallups[0].ubicacion}</p>
                            </div>
                          </div>

                          {!showObservationForm && (
                            <Button
                              onClick={() => setShowObservationForm(true)}
                              className="w-full bg-red-600 hover:bg-red-700 text-lg py-6"
                            >
                              <Zap className="w-5 h-5 mr-2" />
                              Registrar Ahora (30 seg)
                            </Button>
                          )}
                        </CardContent>
                      </Card>
                    )}

                    {showObservationForm && pendingCallups.length > 0 && (
                      <QuickMatchObservationForm
                        categoria={pendingCallups[0].categoria}
                        rival={pendingCallups[0].rival}
                        fechaPartido={pendingCallups[0].fecha_partido}
                        jornada={latestStanding.jornada}
                        onSave={(data) => saveObservationMutation.mutate(data)}
                        onCancel={() => setShowObservationForm(false)}
                        entrenadorEmail={user.email}
                        entrenadorNombre={user.full_name}
                      />
                    )}

                     <Card className="border-2 border-orange-500">
                      <CardHeader>
                        <CardTitle className="flex items-center justify-between flex-wrap gap-2">
                          <span>{cat.name} - Jornada {latestStanding.jornada}</span>
                          <div className="flex gap-2 flex-wrap">
                            <Button
                              onClick={() => setSelectedView(latestStanding)}
                              variant="outline"
                              size="sm"
                            >
                              Ver Tabla Completa
                            </Button>
                            <Button
                              onClick={() => analyzeRival(cat.id)}
                              disabled={isAnalyzingRival}
                              className="bg-red-600 hover:bg-red-700"
                              size="sm"
                            >
                              {isAnalyzingRival ? (
                                <>
                                  <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                                  Analizando...
                                </>
                              ) : (
                                <>
                                  <Target className="w-4 h-4 mr-2" />
                                  Analizar Próximo Rival
                                </>
                              )}
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
                                  Analizar Mi Equipo
                                </>
                              )}
                            </Button>
                          </div>
                        </CardTitle>
                      </CardHeader>
                    </Card>

                    {matchObservations.filter(o => o.categoria === cat.fullName).length > 0 && !showObservationForm && pendingCallups.length === 0 && (
                      <Card className="bg-green-50 border-2 border-green-300">
                        <CardContent className="p-3 text-center">
                          <p className="text-sm text-green-700">
                            ✅ <strong>{matchObservations.filter(o => o.categoria === cat.fullName).length} partidos registrados</strong> - Análisis con IA optimizado
                          </p>
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

      {/* Modal de Análisis de Rival */}
      <Dialog open={showRivalDialog} onOpenChange={setShowRivalDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-2xl">
              <Swords className="w-7 h-7 text-red-600" />
              🎯 Análisis Pre-Partido: {rivalAnalysis?.rival}
            </DialogTitle>
          </DialogHeader>

          {rivalAnalysis && (
            <div className="space-y-4">
              {/* Info del partido */}
              <div className="bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-300 rounded-xl p-4">
                <div className="grid md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-600">📅 <strong>Fecha:</strong> {format(new Date(rivalAnalysis.fecha), "EEEE d 'de' MMMM", { locale: es })}</p>
                    <p className="text-slate-600">⏰ <strong>Hora:</strong> {rivalAnalysis.hora}</p>
                  </div>
                  <div>
                    <p className="text-slate-600">🏟️ <strong>Campo:</strong> {rivalAnalysis.local_visitante}</p>
                    <p className="text-slate-600">📍 <strong>Ubicación:</strong> {rivalAnalysis.ubicacion}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-center gap-2">
                  <Badge className={
                    rivalAnalysis.nivel_dificultad === "Fácil" ? "bg-green-600" :
                    rivalAnalysis.nivel_dificultad === "Medio" ? "bg-yellow-600" :
                    rivalAnalysis.nivel_dificultad === "Difícil" ? "bg-orange-600" :
                    "bg-red-600"
                  }>
                    {rivalAnalysis.nivel_dificultad}
                  </Badge>
                </div>
              </div>

              {/* Racha reciente */}
              <Card className="border-2 border-blue-300">
                <CardHeader>
                  <CardTitle className="text-blue-700 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Racha Reciente del Rival
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{rivalAnalysis.racha_rival}</p>
                </CardContent>
              </Card>

              {/* Grid de análisis */}
              <div className="grid md:grid-cols-2 gap-4">
                <Card className="border-2 border-red-300">
                  <CardHeader>
                    <CardTitle className="text-red-700 flex items-center gap-2">
                      <Shield className="w-5 h-5" />
                      Puntos Fuertes del Rival
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {rivalAnalysis.puntos_fuertes_rival?.map((punto, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-red-600 mt-1 flex-shrink-0" />
                          <span className="text-sm">{punto}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                <Card className="border-2 border-green-300">
                  <CardHeader>
                    <CardTitle className="text-green-700 flex items-center gap-2">
                      <Target className="w-5 h-5" />
                      Debilidades a Explotar
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {rivalAnalysis.debilidades_rival?.map((debilidad, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-4 h-4 text-green-600 mt-1 flex-shrink-0" />
                          <span className="text-sm">{debilidad}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Jugadores clave */}
              {rivalAnalysis.jugadores_clave?.length > 0 && (
                <Card className="border-2 border-orange-300">
                  <CardHeader>
                    <CardTitle className="text-orange-700">⚠️ Jugadores Clave a Marcar</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-2 gap-2">
                      {rivalAnalysis.jugadores_clave.map((jugador, idx) => (
                        <div key={idx} className="bg-orange-50 p-3 rounded-lg text-sm">
                          <Badge className="bg-orange-600 mb-1">{idx + 1}</Badge> {jugador}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Plan táctico */}
              <Card className="border-2 border-purple-300">
                <CardHeader>
                  <CardTitle className="text-purple-700 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    🎯 Plan Táctico Recomendado
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3">
                    {rivalAnalysis.plan_tactico?.map((accion, idx) => (
                      <li key={idx} className="flex items-start gap-3 bg-purple-50 p-3 rounded-lg">
                        <Badge className="bg-purple-600">{idx + 1}</Badge>
                        <span className="text-sm flex-1">{accion}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Pronóstico */}
              <Card className="bg-gradient-to-r from-slate-50 to-slate-100 border-2 border-slate-300">
                <CardContent className="p-4">
                  <p className="text-sm font-medium text-slate-700 mb-1">💭 Pronóstico del Analista:</p>
                  <p className="text-sm text-slate-900 italic">{rivalAnalysis.pronostico}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

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