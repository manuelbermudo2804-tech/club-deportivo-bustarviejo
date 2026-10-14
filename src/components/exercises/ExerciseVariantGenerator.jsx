import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw, Save, Shuffle, Sparkles } from "lucide-react";
import { toast } from "sonner";

const VARIANT_STYLES = [
  { value: "competitivo", label: "Más competitivo", help: "Puntuación, retos y pequeños duelos." },
  { value: "cooperativo", label: "Más cooperativo", help: "Objetivos comunes y trabajo en equipo." },
  { value: "dinamico", label: "Más dinámico y divertido", help: "Más participación, ritmo y decisiones." },
  { value: "facil", label: "Más sencillo", help: "Reducir dificultad sin perder el objetivo." },
  { value: "avanzado", label: "Más exigente", help: "Añadir decisiones y dificultad de forma progresiva." },
  { value: "poco_material", label: "Con menos material", help: "Adaptar la actividad al material disponible." },
  { value: "sorpresa", label: "Sorpréndeme", help: "Una idea diferente manteniendo el objetivo." },
];

export default function ExerciseVariantGenerator({ exercise, existingExercises = [], onSave, onCancel, isSaving = false }) {
  const [style, setStyle] = useState("sorpresa");
  const [notes, setNotes] = useState("");
  const [variant, setVariant] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const generateVariant = async () => {
    setIsGenerating(true);
    setVariant(null);

    try {
      const prompt = `Eres un entrenador formador especializado en ${exercise.deporte || "deporte"} de base. Diseña UNA VARIANTE realmente útil y distinta del ejercicio original, no un ejercicio genérico.

EJERCICIO ORIGINAL:
Nombre: ${exercise.nombre || "Sin nombre"}
Deporte: ${exercise.deporte || "No especificado"}
Categoría: ${exercise.categoria_ejercicio || "No especificada"}
Descripción: ${exercise.descripcion || "No disponible"}
Instrucciones actuales: ${exercise.instrucciones || "No disponibles"}
Variaciones existentes: ${exercise.variaciones || "No disponibles"}
Duración orientativa: ${exercise.duracion_minutos || 10} minutos
Jugadores: ${exercise.jugadores_min || "No indicado"}-${exercise.jugadores_max || "No indicado"}
Intensidad: ${exercise.intensidad || "Media"}
Espacio: ${exercise.espacio_necesario || "Espacio habitual de entrenamiento"}
Material disponible en el ejercicio: ${Array.isArray(exercise.materiales) ? exercise.materiales.join(", ") : "No especificado"}
Objetivos técnicos: ${Array.isArray(exercise.objetivo_tecnico) ? exercise.objetivo_tecnico.join(", ") : "No especificados"}
Objetivos tácticos: ${Array.isArray(exercise.objetivo_tactico) ? exercise.objetivo_tactico.join(", ") : "No especificados"}
Objetivos físicos: ${Array.isArray(exercise.objetivo_fisico) ? exercise.objetivo_fisico.join(", ") : "No especificados"}

VARIANTE SOLICITADA: ${VARIANT_STYLES.find((item) => item.value === style)?.label || style}
Orientación: ${VARIANT_STYLES.find((item) => item.value === style)?.help || ""}
Notas del entrenador: ${notes.trim() || "Ninguna"}

REQUISITOS:
- Conserva el objetivo principal del ejercicio original, pero cambia reglas, organización, toma de decisiones o dinámica de forma tangible.
- Debe poder explicarse rápidamente y aplicarse en un entrenamiento normal.
- Prioriza participación, diversión y muchas repeticiones útiles; evita colas largas y jugadores parados.
- Respeta deporte, edad implícita, número de jugadores, espacio y material razonables.
- No inventes tecnología ni material especial.
- No propongas castigos físicos, eliminación prolongada de jugadores ni cargas desproporcionadas.
- Las instrucciones deben ser claras, paso a paso y accionables.
- Incluye al menos una regla de puntuación o reto si encaja con la variante.
- No repitas literalmente las variaciones que ya aparecen en el ejercicio original.
- Devuelve únicamente los campos solicitados en el esquema JSON.`;

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
            intensidad: { type: "string", enum: ["Baja", "Media", "Alta", "Muy Alta"] },
            materiales: { type: "array", items: { type: "string" } },
            variaciones: { type: "string" },
            consejos: { type: "string" },
            diagrama_ascii: { type: "string" },
            espacio_necesario: { type: "string" }
          },
          required: ["nombre", "descripcion", "instrucciones", "duracion_minutos", "materiales", "variaciones", "consejos"]
        }
      });

      if (!response?.nombre || !response?.descripcion || !response?.instrucciones) {
        throw new Error("La IA no ha devuelto una variante completa.");
      }

      const duplicate = existingExercises.some((item) =>
        item.id !== exercise.id &&
        item.nombre?.trim().toLocaleLowerCase("es") === response.nombre.trim().toLocaleLowerCase("es")
      );
      if (duplicate) {
        response.nombre = `${response.nombre.trim()} — variante`;
      }

      setVariant({
        ...response,
        deporte: exercise.deporte,
        categoria_ejercicio: exercise.categoria_ejercicio || "Técnica Individual",
        subcategoria: exercise.subcategoria,
        posiciones_objetivo: exercise.posiciones_objetivo || [],
        nivel_edad: exercise.nivel_edad || [],
        nivel_dificultad: exercise.nivel_dificultad,
        duracion_minutos: Number(response.duracion_minutos) || Number(exercise.duracion_minutos) || 10,
        jugadores_min: Number(response.jugadores_min) || Number(exercise.jugadores_min) || 1,
        jugadores_max: Number(response.jugadores_max) || Number(exercise.jugadores_max) || Number(exercise.jugadores_min) || 1,
        intensidad: response.intensidad || exercise.intensidad || "Media",
        espacio_necesario: response.espacio_necesario || exercise.espacio_necesario || "",
        materiales: Array.isArray(response.materiales) ? response.materiales : (exercise.materiales || []),
        material_necesario: Array.isArray(response.materiales) ? response.materiales.join(", ") : "",
        jugadores_necesarios: `${Number(response.jugadores_min) || Number(exercise.jugadores_min) || 1}-${Number(response.jugadores_max) || Number(exercise.jugadores_max) || 1} jugadores`,
        objetivo_fisico: exercise.objetivo_fisico || [],
        objetivo_tecnico: exercise.objetivo_tecnico || [],
        objetivo_tactico: exercise.objetivo_tactico || [],
        momento_sesion: exercise.momento_sesion,
        tags_ia: [...new Set([...(exercise.tags_ia || []), "variante IA", style])],
        favorito: false,
        fuente: `Variante IA de: ${exercise.nombre}`
      });
    } catch (error) {
      console.error("Error generando variante del ejercicio:", error);
      toast.error("No se ha podido generar la variante. Inténtalo de nuevo.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    if (!variant) return;
    const duplicate = existingExercises.some((item) =>
      item.nombre?.trim().toLocaleLowerCase("es") === variant.nombre.trim().toLocaleLowerCase("es")
    );
    if (duplicate) {
      toast.error("Ya existe un ejercicio con ese nombre. Genera otra variante para evitar duplicados.");
      return;
    }
    onSave(variant);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-orange-200 bg-gradient-to-br from-orange-50 via-white to-amber-50 p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700">
            <Shuffle className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900">Crear una variante</h3>
            <p className="mt-1 text-sm text-slate-600">Partimos de «{exercise.nombre}». La variante se revisa antes de guardarse y nunca modifica el ejercicio original.</p>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>¿Qué tipo de cambio buscas?</Label>
        <Select value={style} onValueChange={(value) => { setStyle(value); setVariant(null); }}>
          <SelectTrigger><SelectValue placeholder="Elige el enfoque" /></SelectTrigger>
          <SelectContent>
            {VARIANT_STYLES.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">{VARIANT_STYLES.find((item) => item.value === style)?.help}</p>
      </div>

      <div className="space-y-2">
        <Label>Indicaciones extra (opcional)</Label>
        <Textarea
          value={notes}
          onChange={(event) => { setNotes(event.target.value); setVariant(null); }}
          rows={2}
          placeholder="Ej.: para 12 jugadores, con conos y dos porterías pequeñas…"
        />
      </div>

      {!variant && (
        <Button onClick={generateVariant} disabled={isGenerating || isSaving} className="h-11 w-full rounded-xl bg-orange-600 font-semibold text-white hover:bg-orange-700">
          {isGenerating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Preparando una idea diferente…</> : <><Sparkles className="mr-2 h-4 w-4" /> Generar variante con IA</>}
        </Button>
      )}

      {variant && (
        <Card className="overflow-hidden border-orange-200 shadow-sm">
          <div className="h-1.5 bg-gradient-to-r from-orange-500 via-amber-400 to-orange-200" />
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-100">Propuesta IA · Revisar</Badge>
              <Badge variant="outline">{variant.duracion_minutos} min</Badge>
              <Badge variant="outline">{variant.intensidad}</Badge>
            </div>
            <CardTitle className="text-lg">{variant.nombre}</CardTitle>
            <p className="text-sm text-slate-600">{variant.descripcion}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="mb-1 text-sm font-semibold text-slate-900">Cómo organizarlo</h4>
              <p className="whitespace-pre-line text-sm leading-relaxed text-slate-700">{variant.instrucciones}</p>
            </div>
            {variant.materiales?.length > 0 && (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-slate-900">Material</h4>
                <div className="flex flex-wrap gap-1.5">{variant.materiales.map((item, index) => <Badge key={index} variant="secondary">{item}</Badge>)}</div>
              </div>
            )}
            {variant.diagrama_ascii && (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-slate-900">Esquema</h4>
                <pre className="overflow-x-auto rounded-lg border border-green-200 bg-green-50 p-3 text-xs leading-relaxed text-green-900">{variant.diagrama_ascii}</pre>
              </div>
            )}
            {variant.variaciones && (
              <div>
                <h4 className="mb-1 text-sm font-semibold text-slate-900">Otras formas de adaptarlo</h4>
                <p className="whitespace-pre-line text-sm text-slate-700">{variant.variaciones}</p>
              </div>
            )}
            {variant.consejos && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <h4 className="mb-1 text-sm font-semibold text-amber-900">Consejo para el entrenador</h4>
                <p className="whitespace-pre-line text-sm text-amber-800">{variant.consejos}</p>
              </div>
            )}
            <div className="flex flex-col gap-2 border-t pt-3 sm:flex-row">
              <Button variant="outline" onClick={() => setVariant(null)} disabled={isSaving || isGenerating} className="sm:flex-1">
                <RefreshCw className="mr-2 h-4 w-4" /> Probar otra
              </Button>
              <Button onClick={handleSave} disabled={isSaving || isGenerating} className="bg-orange-600 text-white hover:bg-orange-700 sm:flex-1">
                {isSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Guardando…</> : <><Save className="mr-2 h-4 w-4" /> Guardar en biblioteca</>}
              </Button>
            </div>
            <p className="flex items-start gap-2 text-xs text-slate-500"><AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Revisa la propuesta antes de usarla con el equipo. Se guardará como un ejercicio independiente.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end border-t pt-3">
        <Button variant="ghost" onClick={onCancel} disabled={isGenerating || isSaving}>Cerrar</Button>
      </div>
    </div>
  );
}
