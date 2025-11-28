import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const CATEGORIES = [
  "Resistencia - Capacidad",
  "Resistencia - Potencia",
  "Técnica Individual",
  "Táctica Colectiva",
  "Velocidad y Explosividad",
  "Fuerza",
  "Coordinación",
  "Calentamiento",
  "Recuperación",
  "Porteros",
  "Finalización"
];

const POSITIONS_FUTBOL = [
  "Todos", "Portero", "Defensa Central", "Lateral",
  "Centrocampista Defensivo", "Centrocampista", "Mediapunta",
  "Extremo", "Delantero"
];

const POSITIONS_BASKET = [
  "Todos", "Base", "Escolta", "Alero", "Ala-Pívot", "Pívot"
];

const AGES = [
  "Sub-10 a Sub-13",
  "Sub-13 a Sub-16", 
  "Sub-16 a Sub-19",
  "Adultos"
];

const PHYSICAL_OBJECTIVES = [
  "Capacidad Aeróbica", "Potencia Aeróbica", "Velocidad",
  "Agilidad", "Coordinación", "Fuerza Explosiva",
  "Resistencia Muscular", "Flexibilidad", "Equilibrio"
];

const TECHNICAL_OBJECTIVES = [
  "Control de Balón", "Conducción", "Pase Corto", "Pase Largo",
  "Regate", "Tiro", "Cabeceo", "Entrada", "Pressing", "Desmarque"
];

const MOMENTS = [
  "Calentamiento",
  "Parte Principal - Inicio",
  "Parte Principal - Medio",
  "Parte Principal - Final",
  "Vuelta a la Calma"
];

export default function ExerciseForm({ exercise, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    nombre: "",
    deporte: "Fútbol",
    categoria_ejercicio: "",
    posiciones_objetivo: [],
    nivel_edad: [],
    duracion_minutos: 15,
    intensidad: "Media",
    jugadores_min: 4,
    jugadores_max: 16,
    espacio_necesario: "",
    materiales: [],
    descripcion: "",
    instrucciones: "",
    variaciones: "",
    consejos: "",
    objetivo_fisico: [],
    objetivo_tecnico: [],
    momento_sesion: "",
    diagrama_url: "",
  });

  const [materialesInput, setMaterialesInput] = useState("");

  useEffect(() => {
    if (exercise) {
      setFormData({
        ...exercise,
        posiciones_objetivo: exercise.posiciones_objetivo || [],
        nivel_edad: exercise.nivel_edad || [],
        materiales: exercise.materiales || [],
        objetivo_fisico: exercise.objetivo_fisico || [],
        objetivo_tecnico: exercise.objetivo_tecnico || [],
      });
      setMaterialesInput(exercise.materiales?.join(", ") || "");
    }
  }, [exercise]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const data = {
      ...formData,
      materiales: materialesInput.split(",").map(m => m.trim()).filter(Boolean),
    };
    onSubmit(data);
  };

  const toggleArrayItem = (field, item) => {
    const current = formData[field] || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    setFormData({ ...formData, [field]: updated });
  };

  const positions = formData.deporte === "Baloncesto" ? POSITIONS_BASKET : POSITIONS_FUTBOL;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <Label>Nombre del Ejercicio *</Label>
          <Input
            value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
            placeholder="Ej: Circuito técnico con resistencia"
            required
          />
        </div>

        <div>
          <Label>Deporte *</Label>
          <Select
            value={formData.deporte}
            onValueChange={(v) => setFormData({ ...formData, deporte: v, posiciones_objetivo: [] })}
          >
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
          <Label>Categoría *</Label>
          <Select
            value={formData.categoria_ejercicio}
            onValueChange={(v) => setFormData({ ...formData, categoria_ejercicio: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(cat => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Duration & Players */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <Label>Duración (min) *</Label>
          <Input
            type="number"
            value={formData.duracion_minutos}
            onChange={(e) => setFormData({ ...formData, duracion_minutos: parseInt(e.target.value) || 0 })}
            min={1}
            required
          />
        </div>

        <div>
          <Label>Intensidad</Label>
          <Select
            value={formData.intensidad}
            onValueChange={(v) => setFormData({ ...formData, intensidad: v })}
          >
            <SelectTrigger>
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

        <div>
          <Label>Jug. Mínimo</Label>
          <Input
            type="number"
            value={formData.jugadores_min}
            onChange={(e) => setFormData({ ...formData, jugadores_min: parseInt(e.target.value) || 0 })}
            min={1}
          />
        </div>

        <div>
          <Label>Jug. Máximo</Label>
          <Input
            type="number"
            value={formData.jugadores_max}
            onChange={(e) => setFormData({ ...formData, jugadores_max: parseInt(e.target.value) || 0 })}
            min={1}
          />
        </div>
      </div>

      {/* Space & Moment */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <Label>Espacio Necesario</Label>
          <Input
            value={formData.espacio_necesario}
            onChange={(e) => setFormData({ ...formData, espacio_necesario: e.target.value })}
            placeholder="Ej: Media cancha, 30x20m"
          />
        </div>

        <div>
          <Label>Momento de la Sesión</Label>
          <Select
            value={formData.momento_sesion}
            onValueChange={(v) => setFormData({ ...formData, momento_sesion: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona..." />
            </SelectTrigger>
            <SelectContent>
              {MOMENTS.map(m => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Materials */}
      <div>
        <Label>Materiales (separados por coma)</Label>
        <Input
          value={materialesInput}
          onChange={(e) => setMaterialesInput(e.target.value)}
          placeholder="Ej: conos, balones, escaleras, aros"
        />
      </div>

      {/* Description */}
      <div>
        <Label>Descripción *</Label>
        <Textarea
          value={formData.descripcion}
          onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
          placeholder="Describe brevemente el ejercicio..."
          rows={3}
          required
        />
      </div>

      {/* Instructions */}
      <div>
        <Label>Instrucciones Detalladas</Label>
        <Textarea
          value={formData.instrucciones}
          onChange={(e) => setFormData({ ...formData, instrucciones: e.target.value })}
          placeholder="Paso a paso de cómo realizar el ejercicio..."
          rows={4}
        />
      </div>

      {/* Age Levels */}
      <div>
        <Label className="mb-2 block">Edades Recomendadas</Label>
        <div className="flex flex-wrap gap-3">
          {AGES.map(age => (
            <label key={age} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.nivel_edad?.includes(age)}
                onCheckedChange={() => toggleArrayItem("nivel_edad", age)}
              />
              <span className="text-sm">{age}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Positions */}
      <div>
        <Label className="mb-2 block">Posiciones Objetivo</Label>
        <div className="flex flex-wrap gap-3">
          {positions.map(pos => (
            <label key={pos} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.posiciones_objetivo?.includes(pos)}
                onCheckedChange={() => toggleArrayItem("posiciones_objetivo", pos)}
              />
              <span className="text-sm">{pos}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Physical Objectives */}
      <div>
        <Label className="mb-2 block">Objetivos Físicos</Label>
        <div className="flex flex-wrap gap-3">
          {PHYSICAL_OBJECTIVES.map(obj => (
            <label key={obj} className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={formData.objetivo_fisico?.includes(obj)}
                onCheckedChange={() => toggleArrayItem("objetivo_fisico", obj)}
              />
              <span className="text-sm">{obj}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Technical Objectives (Football only) */}
      {formData.deporte === "Fútbol" && (
        <div>
          <Label className="mb-2 block">Objetivos Técnicos</Label>
          <div className="flex flex-wrap gap-3">
            {TECHNICAL_OBJECTIVES.map(obj => (
              <label key={obj} className="flex items-center gap-2 cursor-pointer">
                <Checkbox
                  checked={formData.objetivo_tecnico?.includes(obj)}
                  onCheckedChange={() => toggleArrayItem("objetivo_tecnico", obj)}
                />
                <span className="text-sm">{obj}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Variations */}
      <div>
        <Label>Variaciones</Label>
        <Textarea
          value={formData.variaciones}
          onChange={(e) => setFormData({ ...formData, variaciones: e.target.value })}
          placeholder="Posibles variaciones del ejercicio..."
          rows={2}
        />
      </div>

      {/* Tips */}
      <div>
        <Label>Consejos para el Entrenador</Label>
        <Textarea
          value={formData.consejos}
          onChange={(e) => setFormData({ ...formData, consejos: e.target.value })}
          placeholder="Consejos y puntos clave a observar..."
          rows={2}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
          {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          {exercise ? "Guardar Cambios" : "Crear Ejercicio"}
        </Button>
      </div>
    </form>
  );
}