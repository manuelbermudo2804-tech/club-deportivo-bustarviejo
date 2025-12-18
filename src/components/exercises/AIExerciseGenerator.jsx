import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AIExerciseGenerator({ onExerciseGenerated, onCancel }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [formData, setFormData] = useState({
    deporte: "Fútbol",
    objetivo: "",
    edades: "",
    duracion: "",
    jugadores: "",
    materiales: "",
    intensidad: "Media",
    descripcionExtra: ""
  });

  const handleGenerate = async () => {
    if (!formData.objetivo) {
      toast.error("Por favor especifica el objetivo del ejercicio");
      return;
    }

    setIsGenerating(true);

    try {
      const prompt = `Crea un ejercicio de entrenamiento físico para ${formData.deporte} con las siguientes características:

OBJETIVO PRINCIPAL: ${formData.objetivo}
${formData.edades ? `EDADES: ${formData.edades}` : ""}
${formData.duracion ? `DURACIÓN: ${formData.duracion} minutos` : ""}
${formData.jugadores ? `NÚMERO DE JUGADORES: ${formData.jugadores}` : ""}
${formData.materiales ? `MATERIALES DISPONIBLES: ${formData.materiales}` : ""}
INTENSIDAD DESEADA: ${formData.intensidad}
${formData.descripcionExtra ? `NOTAS ADICIONALES: ${formData.descripcionExtra}` : ""}

Genera un ejercicio completo y detallado con el siguiente formato JSON:
{
  "nombre": "Nombre corto y atractivo del ejercicio",
  "descripcion": "Descripción general del ejercicio (2-3 líneas)",
  "instrucciones": "Instrucciones paso a paso muy detalladas y claras",
  "duracion_minutos": número,
  "jugadores_min": número,
  "jugadores_max": número,
  "intensidad": "Baja|Media|Alta|Muy Alta",
  "categoria_ejercicio": "Categoría que mejor describe el ejercicio",
  "materiales": ["material1", "material2"],
  "variaciones": "3-4 variaciones para aumentar o reducir dificultad",
  "consejos": "Consejos importantes para el entrenador",
  "diagrama_ascii": "Representación visual simple del ejercicio usando caracteres ASCII (max 10 líneas)"
}

IMPORTANTE:
- Sé específico y práctico
- Las instrucciones deben ser fáciles de seguir
- El diagrama ASCII debe ser claro y simple
- Incluye variaciones útiles
- Los consejos deben ser valiosos`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            nombre: { type: "string" },
            descripcion: { type: "string" },
            instrucciones: { type: "string" },
            duracion_minutos: { type: "number" },
            jugadores_min: { type: "number" },
            jugadores_max: { type: "number" },
            intensidad: { type: "string" },
            categoria_ejercicio: { type: "string" },
            materiales: { type: "array", items: { type: "string" } },
            variaciones: { type: "string" },
            consejos: { type: "string" },
            diagrama_ascii: { type: "string" }
          }
        }
      });

      const exerciseData = {
        ...response,
        deporte: formData.deporte,
        material_necesario: response.materiales?.join(", ") || "",
        jugadores_necesarios: `${response.jugadores_min}-${response.jugadores_max} jugadores`
      };

      onExerciseGenerated(exerciseData);
      toast.success("🤖 Ejercicio generado con IA");
    } catch (error) {
      console.error("Error generando ejercicio:", error);
      toast.error("Error al generar el ejercicio");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          <h3 className="font-bold text-purple-900">Generador de Ejercicios con IA</h3>
        </div>
        <p className="text-sm text-purple-700">
          Describe qué tipo de ejercicio necesitas y la IA creará uno personalizado para ti
        </p>
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="deporte">Deporte</Label>
          <Select value={formData.deporte} onValueChange={(v) => setFormData({...formData, deporte: v})}>
            <SelectTrigger id="deporte">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Fútbol">⚽ Fútbol</SelectItem>
              <SelectItem value="Baloncesto">🏀 Baloncesto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="objetivo">Objetivo del ejercicio *</Label>
          <Input
            id="objetivo"
            placeholder="Ej: Mejorar resistencia aeróbica, trabajar velocidad de reacción..."
            value={formData.objetivo}
            onChange={(e) => setFormData({...formData, objetivo: e.target.value})}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="edades">Edades</Label>
            <Input
              id="edades"
              placeholder="Ej: 10-12 años"
              value={formData.edades}
              onChange={(e) => setFormData({...formData, edades: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="duracion">Duración (min)</Label>
            <Input
              id="duracion"
              type="number"
              placeholder="Ej: 15"
              value={formData.duracion}
              onChange={(e) => setFormData({...formData, duracion: e.target.value})}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor="jugadores">Nº Jugadores</Label>
            <Input
              id="jugadores"
              placeholder="Ej: 8-12"
              value={formData.jugadores}
              onChange={(e) => setFormData({...formData, jugadores: e.target.value})}
            />
          </div>
          <div>
            <Label htmlFor="intensidad">Intensidad</Label>
            <Select value={formData.intensidad} onValueChange={(v) => setFormData({...formData, intensidad: v})}>
              <SelectTrigger id="intensidad">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Baja">🟢 Baja</SelectItem>
                <SelectItem value="Media">🟡 Media</SelectItem>
                <SelectItem value="Alta">🟠 Alta</SelectItem>
                <SelectItem value="Muy Alta">🔴 Muy Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label htmlFor="materiales">Materiales disponibles</Label>
          <Input
            id="materiales"
            placeholder="Ej: Conos, vallas, balones, aros..."
            value={formData.materiales}
            onChange={(e) => setFormData({...formData, materiales: e.target.value})}
          />
        </div>

        <div>
          <Label htmlFor="descripcionExtra">Notas adicionales (opcional)</Label>
          <Textarea
            id="descripcionExtra"
            placeholder="Cualquier detalle extra que quieras incluir..."
            rows={3}
            value={formData.descripcionExtra}
            onChange={(e) => setFormData({...formData, descripcionExtra: e.target.value})}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onCancel}
          className="flex-1"
          disabled={isGenerating}
        >
          Cancelar
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !formData.objetivo}
          className="flex-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
        >
          {isGenerating ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Generando...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Generar con IA
            </>
          )}
        </Button>
      </div>
    </div>
  );
}