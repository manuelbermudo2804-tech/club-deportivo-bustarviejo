import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Plus, X, Loader2 } from "lucide-react";
import { Switch } from "@/components/ui/switch";

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
    respuestas_count: 0
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
                    <SelectItem value="Evento Específico">Evento Específico</SelectItem>
                    <SelectItem value="Fin de Temporada">Fin de Temporada</SelectItem>
                    <SelectItem value="Instalaciones">Instalaciones</SelectItem>
                    <SelectItem value="Entrenadores">Entrenadores</SelectItem>
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
                    <SelectItem value="Todos">Todas las Categorías</SelectItem>
                    <SelectItem value="Fútbol Pre-Benjamín (Mixto)">Pre-Benjamín</SelectItem>
                    <SelectItem value="Fútbol Benjamín (Mixto)">Benjamín</SelectItem>
                    <SelectItem value="Fútbol Alevín (Mixto)">Alevín</SelectItem>
                    <SelectItem value="Fútbol Infantil (Mixto)">Infantil</SelectItem>
                    <SelectItem value="Fútbol Cadete">Cadete</SelectItem>
                    <SelectItem value="Fútbol Juvenil">Juvenil</SelectItem>
                    <SelectItem value="Baloncesto (Mixto)">Baloncesto</SelectItem>
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

            {/* Preguntas */}
            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Preguntas</h3>
              
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

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || currentSurvey.preguntas.length === 0}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : survey ? "Actualizar" : "Crear Encuesta"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}