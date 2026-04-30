import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  MessageCircle, 
  Bug, 
  Lightbulb, 
  MessageSquare,
  CheckCircle2,
  Clock,
  AlertCircle,
  Trash2,
  Edit2,
  Filter
} from "lucide-react";
import { toast } from "sonner";

export default function FeedbackManagement() {
  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [filtroTipo, setFiltroTipo] = useState("todos");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [selectedFeedback, setSelectedFeedback] = useState(null);
  const [notasAdmin, setNotasAdmin] = useState("");
  const [showAIAnalysis, setShowAIAnalysis] = useState(false);
  const [aiAnalysis, setAIAnalysis] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        setIsAdmin(currentUser.role === "admin");
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: feedbacks = [] } = useQuery({
    queryKey: ["allFeedbacks"],
    queryFn: async () => {
      try {
        return await base44.entities.Feedback.list("-created_date");
      } catch (error) {
        console.error("Error loading feedbacks:", error);
        return [];
      }
    },
    enabled: isAdmin,
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.Feedback.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allFeedbacks"] });
      setSelectedFeedback(null);
      toast.success("✅ Feedback actualizado");
    },
  });

  const deleteFeedbackMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.Feedback.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allFeedbacks"] });
      toast.success("✅ Feedback eliminado");
    },
  });

  const analyzeWithAI = async () => {
    setLoadingAI(true);
    try {
      const feedbackData = feedbacks.map(f => ({
        tipo: f.tipo,
        titulo: f.titulo,
        descripcion: f.descripcion,
        prioridad: f.prioridad,
        estado: f.estado,
        fecha: f.created_date
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Eres un consultor experto en análisis de feedback de aplicaciones. Analiza este feedback de usuarios de una app de gestión de club deportivo construida en Base44 y proporciona:

1. AGRUPACIÓN DE TEMAS: Agrupa los problemas y sugerencias por temas comunes
2. PRIORIDADES: Identifica qué cambios deberían hacerse primero
3. SUGERENCIAS DE MEJORA: Propuestas concretas de cambios que se pueden implementar

IMPORTANTE - CAPACIDADES DE BASE44 (solo sugiere cambios que puedan implementarse):
✅ PUEDE HACER:
- Entities (base de datos con subscripciones real-time)
- Backend Functions (Deno/TypeScript serverless)
- Integrations: SendEmail, InvokeLLM (IA), UploadFile, GenerateImage, ExtractDataFromUploadedFile
- App Connectors OAuth (Google Calendar, Drive, Sheets, Slack, Notion, etc.)
- React frontend con Tailwind CSS, shadcn/ui components
- Calendarios, eventos, convocatorias, pagos, chats, encuestas, galería de fotos
- Notificaciones por email
- Exports a PDF, Excel, imágenes
- Formularios dinámicos, drag & drop

❌ NO PUEDE HACER:
- Notificaciones push móviles nativas
- Apps móviles nativas (solo PWA web)
- Frameworks distintos de React (no Next.js, no Vue, no Angular)
- Backend en Python, PHP, etc (solo Deno/TypeScript)
- Base de datos SQL directa (usa entidades JSON schema)

Feedback recibido:
${JSON.stringify(feedbackData, null, 2)}

Proporciona un análisis estructurado, accionable y práctico. NO SUGIERAS nada que Base44 no pueda hacer.`,
        response_json_schema: {
          type: "object",
          properties: {
            resumen_ejecutivo: { type: "string" },
            temas_agrupados: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  tema: { type: "string" },
                  frecuencia: { type: "number" },
                  items_relacionados: { 
                    type: "array",
                    items: { type: "string" }
                  },
                  impacto: { type: "string" }
                }
              }
            },
            cambios_prioritarios: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cambio: { type: "string" },
                  justificacion: { type: "string" },
                  prioridad: { type: "string" },
                  esfuerzo_estimado: { type: "string" }
                }
              }
            },
            sugerencias_implementacion: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  accion: { type: "string" },
                  beneficio: { type: "string" },
                  dificultad: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAIAnalysis(result);
      setShowAIAnalysis(true);
    } catch (error) {
      toast.error("Error al analizar con IA: " + error.message);
    } finally {
      setLoadingAI(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-12 h-12 text-red-600 mx-auto mb-3" />
            <p className="text-red-800 font-semibold">Solo administradores pueden acceder aquí</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tipoIcons = {
    bug: <Bug className="w-4 h-4" />,
    sugerencia: <Lightbulb className="w-4 h-4" />,
    comentario: <MessageSquare className="w-4 h-4" />,
  };

  const tipoLabels = {
    bug: "🐛 Bug",
    sugerencia: "💡 Sugerencia",
    comentario: "💭 Comentario",
  };

  const estadoColors = {
    nuevo: "bg-blue-100 text-blue-800",
    revisado: "bg-yellow-100 text-yellow-800",
    en_progreso: "bg-purple-100 text-purple-800",
    resuelto: "bg-green-100 text-green-800",
  };

  const estadoLabels = {
    nuevo: "🆕 Nuevo",
    revisado: "👀 Revisado",
    en_progreso: "⚙️ En progreso",
    resuelto: "✅ Resuelto",
  };

  const filtered = feedbacks.filter((f) => {
    if (filtroTipo !== "todos" && f.tipo !== filtroTipo) return false;
    if (filtroEstado !== "todos" && f.estado !== filtroEstado) return false;
    return true;
  });

  const stats = {
    total: feedbacks.length,
    nuevo: feedbacks.filter((f) => f.estado === "nuevo").length,
    resuelto: feedbacks.filter((f) => f.estado === "resuelto").length,
    bugs: feedbacks.filter((f) => f.tipo === "bug").length,
    sugerencias: feedbacks.filter((f) => f.tipo === "sugerencia").length,
    tasa_resolucion: feedbacks.length > 0 ? Math.round((feedbacks.filter((f) => f.estado === "resuelto").length / feedbacks.length) * 100) : 0,
  };

  // Análisis por prioridad
  const analisisPrioridad = feedbacks.reduce((acc, f) => {
    acc[f.prioridad] = (acc[f.prioridad] || 0) + 1;
    return acc;
  }, {});

  // Top problemas
  const topProblemas = [...feedbacks]
    .filter((f) => f.tipo === "bug")
    .sort((a, b) => new Date(b.created_date).getTime() - new Date(a.created_date).getTime())
    .slice(0, 5);

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          💬 Gestión de Feedback
        </h1>
        <p className="text-slate-600">Revisa sugerencias, bugs y comentarios de usuarios</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-blue-700">{stats.total}</p>
            <p className="text-xs text-blue-600 mt-1">Total</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-yellow-700">{stats.nuevo}</p>
            <p className="text-xs text-yellow-600 mt-1">Nuevos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-green-700">{stats.resuelto}</p>
            <p className="text-xs text-green-600 mt-1">Resueltos</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-red-700">{stats.bugs}</p>
            <p className="text-xs text-red-600 mt-1">Bugs</p>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-4 text-center">
            <p className="text-3xl font-bold text-purple-700">{stats.tasa_resolucion}%</p>
            <p className="text-xs text-purple-600 mt-1">% Resolución</p>
          </CardContent>
        </Card>
      </div>

      {/* Análisis */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">📊 Breakdown por Tipo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">🐛 Bugs</span>
              <span className="font-bold text-red-600">{stats.bugs}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">💡 Sugerencias</span>
              <span className="font-bold text-purple-600">{stats.sugerencias}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">💭 Comentarios</span>
              <span className="font-bold text-slate-600">{feedbacks.filter((f) => f.tipo === "comentario").length}</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">⚡ Por Prioridad</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm">🔴 Alta</span>
              <span className="font-bold text-red-600">{analisisPrioridad.alta || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">🟡 Media</span>
              <span className="font-bold text-yellow-600">{analisisPrioridad.media || 0}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm">🟢 Baja</span>
              <span className="font-bold text-green-600">{analisisPrioridad.baja || 0}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Bugs */}
      {topProblemas.length > 0 && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">🔴 Top 5 Bugs Reportados</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {topProblemas.map((bug, idx) => (
              <div key={bug.id} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg">
                <span className="text-sm font-bold text-slate-600 flex-shrink-0">#{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">{bug.titulo}</p>
                  <p className="text-xs text-slate-600">Por: {bug.nombre || bug.email}</p>
                </div>
                <Badge className={estadoColors[bug.estado]}>{estadoLabels[bug.estado]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Botón de Análisis con IA */}
      <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-purple-900 text-lg mb-1">🤖 Análisis Inteligente con IA</h3>
              <p className="text-sm text-purple-700">
                La IA analizará todo el feedback, agrupará por temas comunes y sugerirá mejoras prioritarias
              </p>
            </div>
            <Button
              onClick={analyzeWithAI}
              disabled={loadingAI || feedbacks.length === 0}
              className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 ml-4"
            >
              {loadingAI ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Analizando...
                </>
              ) : (
                <>
                  ✨ Analizar con IA
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Tipo</label>
              <div className="flex flex-wrap gap-2">
                {["todos", "bug", "sugerencia", "comentario"].map((tipo) => (
                  <Button
                    key={tipo}
                    variant={filtroTipo === tipo ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroTipo(tipo)}
                    className={filtroTipo === tipo ? "bg-orange-600" : ""}
                  >
                    {tipo === "todos" ? "Todos" : tipoLabels[tipo]}
                  </Button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 block mb-2">Estado</label>
              <div className="flex flex-wrap gap-2">
                {["todos", "nuevo", "revisado", "en_progreso", "resuelto"].map((estado) => (
                  <Button
                    key={estado}
                    variant={filtroEstado === estado ? "default" : "outline"}
                    size="sm"
                    onClick={() => setFiltroEstado(estado)}
                    className={filtroEstado === estado ? "bg-green-600" : ""}
                  >
                    {estado === "todos" ? "Todos" : estado.replace("_", " ")}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Feedbacks */}
      <div className="space-y-3">
        {filtered.length === 0 ? (
          <Card className="border-slate-200">
            <CardContent className="pt-6 text-center">
              <MessageCircle className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">No hay feedback que coincida con los filtros</p>
            </CardContent>
          </Card>
        ) : (
          filtered.map((feedback) => (
            <Card key={feedback.id} className="hover:shadow-lg transition-shadow border-slate-200">
              <CardContent className="pt-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      {tipoIcons[feedback.tipo]}
                      <h3 className="font-bold text-slate-900">{feedback.titulo}</h3>
                    </div>
                    <p className="text-sm text-slate-700 mb-3">{feedback.descripcion}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className={estadoColors[feedback.estado]}>
                        {estadoLabels[feedback.estado]}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {feedback.nombre || feedback.email}
                      </Badge>
                      {feedback.pagina && (
                        <Badge variant="outline" className="text-xs">
                          📄 {feedback.pagina}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedFeedback(feedback);
                      setNotasAdmin(feedback.notas_admin || "");
                    }}
                    className="flex-shrink-0"
                  >
                    <Edit2 className="w-4 h-4 mr-1" />
                    Ver
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal de Análisis IA */}
      <Dialog open={showAIAnalysis} onOpenChange={setShowAIAnalysis}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>🤖 Análisis Inteligente de Feedback</DialogTitle>
          </DialogHeader>

          {aiAnalysis && (
            <div className="space-y-6">
              {/* Resumen Ejecutivo */}
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border-2 border-purple-200">
                <h3 className="font-bold text-purple-900 mb-2">📋 Resumen Ejecutivo</h3>
                <p className="text-sm text-slate-700 leading-relaxed">{aiAnalysis.resumen_ejecutivo}</p>
              </div>

              {/* Temas Agrupados */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-orange-600" />
                  Temas Comunes Identificados
                </h3>
                <div className="space-y-3">
                  {aiAnalysis.temas_agrupados?.map((tema, idx) => (
                    <Card key={idx} className="border-orange-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900">{tema.tema}</h4>
                          <Badge className="bg-orange-100 text-orange-800">
                            {tema.frecuencia} menciones
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600 mb-2"><strong>Impacto:</strong> {tema.impacto}</p>
                        <div className="bg-slate-50 rounded-lg p-3">
                          <p className="text-xs font-semibold text-slate-700 mb-1">Items relacionados:</p>
                          <ul className="text-xs text-slate-600 list-disc list-inside">
                            {tema.items_relacionados?.map((item, i) => (
                              <li key={i}>{item}</li>
                            ))}
                          </ul>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Cambios Prioritarios */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  Cambios Prioritarios Recomendados
                </h3>
                <div className="space-y-3">
                  {aiAnalysis.cambios_prioritarios?.map((cambio, idx) => (
                    <Card key={idx} className="border-green-200">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-slate-900 flex-1">{cambio.cambio}</h4>
                          <div className="flex gap-2">
                            <Badge className={
                              cambio.prioridad?.toLowerCase().includes('alta') ? "bg-red-100 text-red-800" :
                              cambio.prioridad?.toLowerCase().includes('media') ? "bg-yellow-100 text-yellow-800" :
                              "bg-blue-100 text-blue-800"
                            }>
                              {cambio.prioridad}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {cambio.esfuerzo_estimado}
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600">{cambio.justificacion}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              {/* Sugerencias de Implementación */}
              <div>
                <h3 className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                  <Lightbulb className="w-5 h-5 text-yellow-500" />
                  Sugerencias de Implementación
                </h3>
                <div className="space-y-2">
                  {aiAnalysis.sugerencias_implementacion?.map((sug, idx) => (
                    <div key={idx} className="bg-yellow-50 border-2 border-yellow-200 rounded-xl p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <p className="font-semibold text-yellow-900 mb-1">{sug.accion}</p>
                          <p className="text-sm text-slate-700 mb-2">{sug.beneficio}</p>
                        </div>
                        <Badge variant="outline" className="text-xs flex-shrink-0">
                          {sug.dificultad}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de edición */}
      <Dialog open={!!selectedFeedback} onOpenChange={() => setSelectedFeedback(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Gestionar Feedback</DialogTitle>
          </DialogHeader>

          {selectedFeedback && (
            <div className="space-y-4">
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Título</p>
                <p className="text-slate-900">{selectedFeedback.titulo}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Descripción</p>
                <p className="text-slate-700 text-sm">{selectedFeedback.descripcion}</p>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Estado</p>
                <div className="grid grid-cols-2 gap-2">
                  {["nuevo", "revisado", "en_progreso", "resuelto"].map((estado) => (
                    <Button
                      key={estado}
                      variant={selectedFeedback.estado === estado ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        updateFeedbackMutation.mutate({
                          id: selectedFeedback.id,
                          data: { estado },
                        });
                      }}
                    >
                      {estado.replace("_", " ")}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Notas Internas</p>
                <Textarea
                  value={notasAdmin}
                  onChange={(e) => setNotasAdmin(e.target.value)}
                  placeholder="Notas solo para admins..."
                  className="min-h-20"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    if (confirm("¿Eliminar este feedback?")) {
                      deleteFeedbackMutation.mutate(selectedFeedback.id);
                    }
                  }}
                  className="flex-1"
                >
                  <Trash2 className="w-4 h-4 mr-1" />
                  Eliminar
                </Button>
                <Button
                  onClick={() => {
                    updateFeedbackMutation.mutate({
                      id: selectedFeedback.id,
                      data: { notas_admin: notasAdmin },
                    });
                  }}
                  className="flex-1 bg-orange-600 hover:bg-orange-700"
                >
                  Guardar notas
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}