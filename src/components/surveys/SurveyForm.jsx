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
import { toast } from "sonner";
import { SURVEY_TEMPLATES, SURVEY_TEMPLATE_CATEGORIES } from "./surveyTemplateCatalog";

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
    if (!currentSurvey.fecha_inicio || !currentSurvey.fecha_fin || currentSurvey.fecha_fin < currentSurvey.fecha_inicio) {
      toast.error("La fecha de cierre debe ser igual o posterior a la fecha de inicio");
      return;
    }
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
      <Card className="overflow-hidden rounded-2xl border border-slate-200 shadow-lg">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-orange-950 px-5 py-5 text-white sm:px-6">
          <CardTitle className="text-lg font-bold tracking-tight text-white sm:text-xl">{survey ? "Editar encuesta" : "Nueva encuesta"}</CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-5 sm:px-6 sm:py-6">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-7">
            <div className="grid min-w-0 grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
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
                    {SURVEY_TEMPLATE_CATEGORIES.map((category) => (
                      <SelectItem key={category} value={category}>{category}</SelectItem>
                    ))}
                    <SelectItem value="Otro">Otro / personalizada</SelectItem>
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
                  max={currentSurvey.fecha_fin || undefined}
                  value={currentSurvey.fecha_inicio}
                  onChange={(e) => setCurrentSurvey({...currentSurvey, fecha_inicio: e.target.value})}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Fin *</Label>
                <Input
                  type="date"
                  min={currentSurvey.fecha_inicio || undefined}
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
            <div className="rounded-xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
              <p className="text-sm font-semibold text-orange-950">
                🔔 La encuesta aparecerá automáticamente en el <strong>Centro de Alertas</strong> de todos los destinatarios
              </p>
              <p className="mt-1 text-xs leading-relaxed text-orange-800">
                Los padres la verán como tarea pendiente hasta que respondan
              </p>
            </div>

            {/* Preguntas */}
            <div className="space-y-4 border-t border-slate-200 pt-5">
              <div className="flex items-center justify-between">
                <div><h3 className="font-semibold text-lg">Preguntas</h3><p className="text-sm text-slate-500">Elige una temática y carga su banco de preguntas; después puedes eliminar, añadir o adaptar las que necesites.</p></div>
                {SURVEY_TEMPLATES[currentSurvey.tipo] && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (currentSurvey.preguntas.length > 0 && !window.confirm("La plantilla sustituirá las preguntas actuales. ¿Quieres continuar?")) return;
                      applyTemplate(currentSurvey.tipo);
                    }}
                    className="text-orange-600 border-orange-300"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Cargar plantilla temática
                  </Button>
                )}
              </div>
              
              {currentSurvey.preguntas.map((q, index) => (
                <div key={index} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
                  <div className="flex-1">
                    <p className="break-words font-semibold text-slate-900">{index + 1}. {q.pregunta}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">Tipo de respuesta: {q.tipo_respuesta}{q.obligatoria ? " · Obligatoria" : ""}</p>
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

              <div className="space-y-3 rounded-xl border-2 border-dashed border-orange-200 bg-orange-50/40 p-3 sm:p-4">
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
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700 font-medium">⚠️ Añade al menos una pregunta antes de crear la encuesta</p>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:justify-end sm:gap-3">
              <Button type="button" variant="outline" onClick={onCancel} className="w-full rounded-xl sm:w-auto">
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || currentSurvey.preguntas.length === 0 || !currentSurvey.titulo || !currentSurvey.fecha_fin}
                className="w-full rounded-xl bg-orange-600 font-semibold shadow-sm hover:bg-orange-700 sm:w-auto"
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