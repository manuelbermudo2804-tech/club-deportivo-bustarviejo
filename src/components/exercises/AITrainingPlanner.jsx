import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Clock, Users, Zap, CheckCircle2, Copy, Printer } from "lucide-react";
import { toast } from "sonner";

export default function AITrainingPlanner({ exercises, onClose }) {
  const [sport, setSport] = useState("Fútbol");
  const [duration, setDuration] = useState("90");
  const [focus, setFocus] = useState("");
  const [ageGroup, setAgeGroup] = useState("");
  const [numPlayers, setNumPlayers] = useState("16");
  const [additionalNotes, setAdditionalNotes] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState(null);

  const handleGenerate = async () => {
    if (!focus) {
      toast.error("Selecciona un enfoque principal");
      return;
    }

    setIsGenerating(true);

    try {
      // Filter exercises by sport
      const sportExercises = exercises.filter(ex => ex.deporte === sport);
      
      // Build exercise catalog for the AI
      const exerciseCatalog = sportExercises.map(ex => ({
        nombre: ex.nombre,
        categoria: ex.categoria_ejercicio,
        subcategoria: ex.subcategoria,
        duracion: ex.duracion_minutos,
        intensidad: ex.intensidad,
        nivel_dificultad: ex.nivel_dificultad,
        descripcion: ex.descripcion?.substring(0, 200),
        objetivo_fisico: ex.objetivo_fisico,
        objetivo_tecnico: ex.objetivo_tecnico,
        objetivo_tactico: ex.objetivo_tactico,
        momento_sesion: ex.momento_sesion,
        tags_ia: ex.tags_ia,
      }));

      const prompt = `Eres un entrenador deportivo experto en ${sport}. 
      
Diseña una sesión de entrenamiento completa de ${duration} minutos para un equipo de ${numPlayers} jugadores.

ENFOQUE PRINCIPAL: ${focus}
GRUPO DE EDAD: ${ageGroup || "Mixto"}
${additionalNotes ? `NOTAS ADICIONALES: ${additionalNotes}` : ""}

CATÁLOGO DE EJERCICIOS DISPONIBLES:
${JSON.stringify(exerciseCatalog, null, 2)}

IMPORTANTE: Debes usar EXCLUSIVAMENTE ejercicios del catálogo proporcionado. Si no hay suficientes ejercicios en el catálogo, indica qué ejercicios adicionales serían recomendables crear.

Genera un plan estructurado con:
1. CALENTAMIENTO (10-15 min): Ejercicios de activación
2. PARTE PRINCIPAL (${parseInt(duration) - 25} min): Dividida en bloques con ejercicios del catálogo
3. VUELTA A LA CALMA (5-10 min): Estiramientos y recuperación

Para cada ejercicio incluye:
- Nombre exacto del catálogo
- Duración específica
- Variaciones si aplica
- Transiciones entre ejercicios

También incluye:
- Materiales totales necesarios
- Consejos generales para la sesión
- Objetivos de la sesión`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            titulo_sesion: { type: "string" },
            duracion_total: { type: "number" },
            objetivos: { type: "array", items: { type: "string" } },
            materiales_necesarios: { type: "array", items: { type: "string" } },
            calentamiento: {
              type: "object",
              properties: {
                duracion: { type: "number" },
                ejercicios: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nombre: { type: "string" },
                      duracion: { type: "number" },
                      descripcion: { type: "string" }
                    }
                  }
                }
              }
            },
            parte_principal: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  bloque: { type: "string" },
                  duracion: { type: "number" },
                  ejercicios: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        nombre: { type: "string" },
                        duracion: { type: "number" },
                        descripcion: { type: "string" },
                        variaciones: { type: "string" }
                      }
                    }
                  }
                }
              }
            },
            vuelta_calma: {
              type: "object",
              properties: {
                duracion: { type: "number" },
                ejercicios: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      nombre: { type: "string" },
                      duracion: { type: "number" },
                      descripcion: { type: "string" }
                    }
                  }
                }
              }
            },
            consejos: { type: "array", items: { type: "string" } },
            ejercicios_sugeridos_crear: { type: "array", items: { type: "string" } }
          }
        }
      });

      setGeneratedPlan(response);
      toast.success("¡Plan de entrenamiento generado!");
    } catch (error) {
      console.error("Error generating plan:", error);
      toast.error("Error al generar el plan");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const text = JSON.stringify(generatedPlan, null, 2);
    navigator.clipboard.writeText(text);
    toast.success("Plan copiado al portapapeles");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {!generatedPlan ? (
        <>
          {/* Configuration Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Deporte</Label>
              <Select value={sport} onValueChange={setSport}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Fútbol">⚽ Fútbol</SelectItem>
                  <SelectItem value="Baloncesto">🏀 Baloncesto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Duración Total (minutos)</Label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="60">60 minutos</SelectItem>
                  <SelectItem value="75">75 minutos</SelectItem>
                  <SelectItem value="90">90 minutos (1.5h)</SelectItem>
                  <SelectItem value="120">120 minutos (2h)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Enfoque Principal *</Label>
              <Select value={focus} onValueChange={setFocus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Resistencia - Capacidad Aeróbica">💨 Resistencia - Capacidad</SelectItem>
                  <SelectItem value="Resistencia - Potencia Aeróbica">⚡ Resistencia - Potencia</SelectItem>
                  <SelectItem value="Técnica Individual">🎯 Técnica Individual</SelectItem>
                  <SelectItem value="Táctica Colectiva">🧠 Táctica Colectiva</SelectItem>
                  <SelectItem value="Velocidad y Explosividad">🚀 Velocidad y Explosividad</SelectItem>
                  <SelectItem value="Fuerza">💪 Fuerza</SelectItem>
                  <SelectItem value="Coordinación">🤸 Coordinación</SelectItem>
                  <SelectItem value="Partido Reducido">⚽ Juegos Reducidos</SelectItem>
                  <SelectItem value="Recuperación Activa">🧘 Recuperación Activa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Grupo de Edad</Label>
              <Select value={ageGroup} onValueChange={setAgeGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Sub-10 a Sub-13">Sub-10 a Sub-13</SelectItem>
                  <SelectItem value="Sub-13 a Sub-16">Sub-13 a Sub-16</SelectItem>
                  <SelectItem value="Sub-16 a Sub-19">Sub-16 a Sub-19</SelectItem>
                  <SelectItem value="Adultos">Adultos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Número de Jugadores</Label>
              <Select value={numPlayers} onValueChange={setNumPlayers}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="8">8 jugadores</SelectItem>
                  <SelectItem value="12">12 jugadores</SelectItem>
                  <SelectItem value="16">16 jugadores</SelectItem>
                  <SelectItem value="20">20 jugadores</SelectItem>
                  <SelectItem value="24">24 jugadores</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Notas Adicionales (opcional)</Label>
            <Textarea
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="Ej: Enfocarse en la salida de balón, incluir trabajo de pressing, preparar para partido del fin de semana..."
              rows={3}
            />
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <p className="text-sm text-purple-800">
              <Sparkles className="w-4 h-4 inline mr-1" />
              La IA usará los <strong>{exercises.filter(ex => ex.deporte === sport).length} ejercicios de {sport}</strong> disponibles en tu biblioteca para crear un plan personalizado.
            </p>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={isGenerating || !focus}
              className="bg-gradient-to-r from-purple-600 to-indigo-600"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generando Plan...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generar Plan de Entrenamiento
                </>
              )}
            </Button>
          </div>
        </>
      ) : (
        /* Generated Plan Display */
        <div className="space-y-6 print:space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between print:hidden">
            <h2 className="text-xl font-bold text-slate-900">{generatedPlan.titulo_sesion}</h2>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="w-4 h-4 mr-1" /> Copiar
              </Button>
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-1" /> Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={() => setGeneratedPlan(null)}>
                Nueva Planificación
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-blue-100 text-blue-800">
              <Clock className="w-3 h-3 mr-1" />
              {generatedPlan.duracion_total} minutos
            </Badge>
            <Badge className="bg-green-100 text-green-800">
              <Users className="w-3 h-3 mr-1" />
              {numPlayers} jugadores
            </Badge>
            <Badge className="bg-purple-100 text-purple-800">
              <Zap className="w-3 h-3 mr-1" />
              {focus}
            </Badge>
          </div>

          {/* Objectives */}
          {generatedPlan.objetivos?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">🎯 Objetivos de la Sesión</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-slate-700">
                  {generatedPlan.objetivos.map((obj, i) => (
                    <li key={i}>{obj}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Materials */}
          {generatedPlan.materiales_necesarios?.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">🎒 Materiales Necesarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {generatedPlan.materiales_necesarios.map((mat, i) => (
                    <Badge key={i} variant="outline">{mat}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Warmup */}
          {generatedPlan.calentamiento && (
            <Card className="border-l-4 border-l-yellow-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  🔥 Calentamiento
                  <Badge variant="secondary">{generatedPlan.calentamiento.duracion} min</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {generatedPlan.calentamiento.ejercicios?.map((ej, i) => (
                    <div key={i} className="bg-yellow-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{ej.nombre}</span>
                        <Badge variant="outline">{ej.duracion} min</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{ej.descripcion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Main Part */}
          {generatedPlan.parte_principal?.map((bloque, bi) => (
            <Card key={bi} className="border-l-4 border-l-orange-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  ⚡ {bloque.bloque}
                  <Badge variant="secondary">{bloque.duracion} min</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {bloque.ejercicios?.map((ej, i) => (
                    <div key={i} className="bg-orange-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{ej.nombre}</span>
                        <Badge variant="outline">{ej.duracion} min</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{ej.descripcion}</p>
                      {ej.variaciones && (
                        <p className="text-xs text-orange-700 mt-1">
                          💡 Variación: {ej.variaciones}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Cool Down */}
          {generatedPlan.vuelta_calma && (
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  🧘 Vuelta a la Calma
                  <Badge variant="secondary">{generatedPlan.vuelta_calma.duracion} min</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {generatedPlan.vuelta_calma.ejercicios?.map((ej, i) => (
                    <div key={i} className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{ej.nombre}</span>
                        <Badge variant="outline">{ej.duracion} min</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{ej.descripcion}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          {generatedPlan.consejos?.length > 0 && (
            <Card className="bg-green-50 border-green-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-green-800">💡 Consejos para la Sesión</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-green-700">
                  {generatedPlan.consejos.map((tip, i) => (
                    <li key={i}>{tip}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Suggested Exercises to Create */}
          {generatedPlan.ejercicios_sugeridos_crear?.length > 0 && (
            <Card className="bg-purple-50 border-purple-200">
              <CardHeader className="pb-2">
                <CardTitle className="text-base text-purple-800">📝 Ejercicios Sugeridos para Añadir</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-1 text-sm text-purple-700">
                  {generatedPlan.ejercicios_sugeridos_crear.map((ej, i) => (
                    <li key={i}>{ej}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}