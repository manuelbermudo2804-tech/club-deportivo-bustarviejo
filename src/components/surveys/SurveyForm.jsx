import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, X, Loader2, Sparkles } from "lucide-react";
import { Switch } from "@/components/ui/switch";

const SURVEY_TEMPLATES = {
  "Satisfacción General": [
    { pregunta: "¿Cómo valorarías tu experiencia general en el club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué es lo que más te gusta del club?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué aspectos crees que podríamos mejorar?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Recomendarías el club a otras familias?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Cómo calificarías la relación calidad-precio?", tipo_respuesta: "rating", obligatoria: true }
  ],
  "Fin de Temporada": [
    { pregunta: "¿Cómo valorarías la temporada en general?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Tu hijo/a ha disfrutado de los entrenamientos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Ha mejorado técnica y tácticamente?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Cómo valorarías la comunicación del club con las familias?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los horarios de entrenamientos fueron adecuados?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué momentos destacarías de esta temporada?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "Sugerencias para la próxima temporada", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Entrenadores": [
    { pregunta: "¿Cómo valorarías la calidad de los entrenamientos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El entrenador se comunica bien con los jugadores?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El entrenador fomenta valores deportivos y respeto?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El entrenador motiva y anima a los jugadores?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Notas progreso en las habilidades de tu hijo/a?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El entrenador atiende las necesidades individuales?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué aspectos destacarías del entrenador?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "Sugerencias para mejorar los entrenamientos", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Instalaciones": [
    { pregunta: "¿Cómo valorarías el estado de las instalaciones?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las instalaciones son seguras y adecuadas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los vestuarios están limpios y en buen estado?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Hay suficiente espacio para entrenamientos y partidos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El acceso y aparcamiento es cómodo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué instalaciones o servicios te gustaría que mejoráramos?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Evento Específico": [
    { pregunta: "¿Cómo valorarías la organización del evento?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El evento cumplió tus expectativas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La comunicación previa al evento fue clara?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué es lo que más te gustó del evento?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué mejorarías para futuros eventos?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Aplicación/App": [
    { pregunta: "¿Cómo valorarías la facilidad de uso de la aplicación?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La información en la app es clara y útil?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las notificaciones y avisos son oportunos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué funcionalidades usas más de la app?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Qué funcionalidades te gustaría que tuviera la app?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "¿Has tenido problemas técnicos con la app?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Pagos y Gestión": [
    { pregunta: "¿Cómo valorarías el proceso de inscripción?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El sistema de pagos es claro y fácil de usar?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los plazos de pago son razonables?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿La información sobre cuotas y pagos es transparente?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Cómo valorarías la relación calidad-precio del club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "Sugerencias sobre pagos o gestión administrativa", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Comunicación": [
    { pregunta: "¿Cómo valorarías la comunicación general del club?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Recibes la información de forma oportuna?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Los canales de comunicación (app, email, chat) son efectivos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El club responde rápidamente a tus consultas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué canal de comunicación prefieres?", tipo_respuesta: "texto", obligatoria: false },
    { pregunta: "Sugerencias para mejorar la comunicación", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Equipación y Material": [
    { pregunta: "¿Cómo valorarías la calidad de la equipación?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El proceso de pedido de ropa fue sencillo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Las tallas y medidas son correctas?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El material deportivo es adecuado?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Qué equipación o material adicional te gustaría?", tipo_respuesta: "texto", obligatoria: false }
  ],
  "Valores y Convivencia": [
    { pregunta: "¿El club fomenta valores deportivos positivos?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Se promueve el respeto entre compañeros?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿El ambiente en el club es acogedor?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Se gestiona bien la competitividad?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "¿Tu hijo/a se siente integrado en el equipo?", tipo_respuesta: "rating", obligatoria: true },
    { pregunta: "Comentarios sobre el ambiente y los valores del club", tipo_respuesta: "texto", obligatoria: false }
  ]
};

export default function SurveyForm({ survey, onSubmit, onCancel, isSubmitting }) {
  const [currentSurvey, setCurrentSurvey] = useState(survey || {
    titulo: "",
    descripcion: "",
    tipo: "Satisfacción General",
    destinatarios: "Todos",
    preguntas: [],
    activa: true,
    fecha_inicio: new Date().toISOString().split('T')[0],
    fecha_fin: "",
    anonima: false,
    respuestas_count: 0,
    respuestas_nuevas: 0
  });

  const [newQuestion, setNewQuestion] = useState({
    pregunta: "",
    tipo_respuesta: "texto",
    opciones: [],
    obligatoria: false
  });

  const addQuestion = () => {
    if (!newQuestion.pregunta.trim()) return;
    
    setCurrentSurvey({
      ...currentSurvey,
      preguntas: [...currentSurvey.preguntas, { ...newQuestion }]
    });
    
    setNewQuestion({
      pregunta: "",
      tipo_respuesta: "texto",
      opciones: [],
      obligatoria: false
    });
  };

  const removeQuestion = (index) => {
    setCurrentSurvey({
      ...currentSurvey,
      preguntas: currentSurvey.preguntas.filter((_, i) => i !== index)
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(currentSurvey);
  };

  const applyTemplate = (tipo) => {
    const template = SURVEY_TEMPLATES[tipo];
    if (template) {
      setCurrentSurvey({
        ...currentSurvey,
        preguntas: [...template]
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl">
        <CardHeader className="border-b">
          <CardTitle>{survey ? "Editar Encuesta" : "Nueva Encuesta"}</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label>Título *</Label>
                <Input
                  value={currentSurvey.titulo}
                  onChange={(e) => setCurrentSurvey({...currentSurvey, titulo: e.target.value})}
                  required
                  placeholder="Ej: Encuesta de Satisfacción Temporada 2024/25"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label>Descripción</Label>
                <Textarea
                  value={currentSurvey.descripcion}
                  onChange={(e) => setCurrentSurvey({...currentSurvey, descripcion: e.target.value})}
                  placeholder="Explica el propósito de la encuesta..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={currentSurvey.tipo}
                  onValueChange={(value) => setCurrentSurvey({...currentSurvey, tipo: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Satisfacción General">Satisfacción General</SelectItem>
                    <SelectItem value="Fin de Temporada">Fin de Temporada</SelectItem>
                    <SelectItem value="Entrenadores">Entrenadores</SelectItem>
                    <SelectItem value="Instalaciones">Instalaciones</SelectItem>
                    <SelectItem value="Aplicación/App">Aplicación/App</SelectItem>
                    <SelectItem value="Pagos y Gestión">Pagos y Gestión</SelectItem>
                    <SelectItem value="Comunicación">Comunicación</SelectItem>
                    <SelectItem value="Equipación y Material">Equipación y Material</SelectItem>
                    <SelectItem value="Valores y Convivencia">Valores y Convivencia</SelectItem>
                    <SelectItem value="Evento Específico">Evento Específico</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Destinatarios *</Label>
                <Select
                  value={currentSurvey.destinatarios}
                  onValueChange={(value) => setCurrentSurvey({...currentSurvey, destinatarios: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">📢 Todas las Categorías</SelectItem>
                    <SelectItem value="Fútbol Pre-Benjamín (Mixto)">⚽ Pre-Benjamín</SelectItem>
                    <SelectItem value="Fútbol Benjamín (Mixto)">⚽ Benjamín</SelectItem>
                    <SelectItem value="Fútbol Alevín (Mixto)">⚽ Alevín</SelectItem>
                    <SelectItem value="Fútbol Infantil (Mixto)">⚽ Infantil</SelectItem>
                    <SelectItem value="Fútbol Cadete">⚽ Cadete</SelectItem>
                    <SelectItem value="Fútbol Juvenil">⚽ Juvenil</SelectItem>
                    <SelectItem value="Fútbol Aficionado">⚽ Aficionado</SelectItem>
                    <SelectItem value="Fútbol Femenino">⚽ Femenino</SelectItem>
                    <SelectItem value="Baloncesto (Mixto)">🏀 Baloncesto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={currentSurvey.fecha_inicio}
                  onChange={(e) => setCurrentSurvey({...currentSurvey, fecha_inicio: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin *</Label>
                <Input
                  type="date"
                  value={currentSurvey.fecha_fin}
                  onChange={(e) => setCurrentSurvey({...currentSurvey, fecha_fin: e.target.value})}
                  required
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={currentSurvey.anonima}
                  onCheckedChange={(checked) => setCurrentSurvey({...currentSurvey, anonima: checked})}
                />
                <Label>Respuestas Anónimas</Label>
              </div>
            </div>

            {/* Info sobre notificación automática */}
            <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-900 font-medium">
                🔔 La encuesta aparecerá automáticamente en el <strong>Centro de Alertas</strong> de todos los destinatarios
              </p>
              <p className="text-xs text-green-700 mt-1">
                Los padres la verán como tarea pendiente hasta que respondan
              </p>
            </div>

            {/* Preguntas */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg">Preguntas</h3>
                {SURVEY_TEMPLATES[currentSurvey.tipo] && currentSurvey.preguntas.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => applyTemplate(currentSurvey.tipo)}
                    className="text-orange-600 border-orange-300"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Usar Plantilla
                  </Button>
                )}
              </div>
              
              {currentSurvey.preguntas.map((q, index) => (
                <div key={index} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium">{index + 1}. {q.pregunta}</p>
                    <p className="text-sm text-slate-600">Tipo: {q.tipo_respuesta}</p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}

              <div className="space-y-3 p-4 border-2 border-dashed rounded-lg">
                <Input
                  value={newQuestion.pregunta}
                  onChange={(e) => setNewQuestion({...newQuestion, pregunta: e.target.value})}
                  placeholder="Escribe tu pregunta..."
                />
                <Select
                  value={newQuestion.tipo_respuesta}
                  onValueChange={(value) => setNewQuestion({...newQuestion, tipo_respuesta: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="texto">Texto libre</SelectItem>
                    <SelectItem value="rating">Valoración (1-5)</SelectItem>
                    <SelectItem value="multiple">Opción múltiple</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  onClick={addQuestion}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Pregunta
                </Button>
              </div>
            </div>

            {currentSurvey.preguntas.length === 0 && (
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">⚠️ Añade al menos una pregunta antes de crear la encuesta</p>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || currentSurvey.preguntas.length === 0 || !currentSurvey.titulo || !currentSurvey.fecha_fin}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creando...
                  </>
                ) : survey ? "Actualizar" : "Crear Encuesta"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}