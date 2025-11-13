import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { X, Loader2 } from "lucide-react";

const CATEGORIAS = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)"
];

const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"];

// Función para obtener la temporada actual
const getCurrentSeason = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  
  if (currentMonth <= 8) {
    return `${currentYear - 1}/${currentYear}`;
  }
  return `${currentYear}/${currentYear + 1}`;
};

export default function TrainingScheduleForm({ schedule, onSubmit, onCancel, isSubmitting }) {
  const [currentSchedule, setCurrentSchedule] = useState(schedule || {
    categoria: "",
    dia_semana: "",
    hora_inicio: "",
    hora_fin: "",
    ubicacion: "",
    notas: "",
    temporada: getCurrentSeason(),
    activo: true
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(currentSchedule);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {schedule ? "Editar Horario" : "Nuevo Horario de Entrenamiento"}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Categoría */}
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={currentSchedule.categoria}
                  onValueChange={(value) => setCurrentSchedule({...currentSchedule, categoria: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIAS.map(cat => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Día de la Semana */}
              <div className="space-y-2">
                <Label htmlFor="dia_semana">Día de la Semana *</Label>
                <Select
                  value={currentSchedule.dia_semana}
                  onValueChange={(value) => setCurrentSchedule({...currentSchedule, dia_semana: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un día" />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map(dia => (
                      <SelectItem key={dia} value={dia}>
                        {dia}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Hora de Inicio */}
              <div className="space-y-2">
                <Label htmlFor="hora_inicio">Hora de Inicio *</Label>
                <Input
                  type="time"
                  value={currentSchedule.hora_inicio}
                  onChange={(e) => setCurrentSchedule({...currentSchedule, hora_inicio: e.target.value})}
                  required
                />
              </div>

              {/* Hora de Fin */}
              <div className="space-y-2">
                <Label htmlFor="hora_fin">Hora de Fin *</Label>
                <Input
                  type="time"
                  value={currentSchedule.hora_fin}
                  onChange={(e) => setCurrentSchedule({...currentSchedule, hora_fin: e.target.value})}
                  required
                />
              </div>

              {/* Ubicación */}
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ubicacion">Ubicación</Label>
                <Input
                  value={currentSchedule.ubicacion}
                  onChange={(e) => setCurrentSchedule({...currentSchedule, ubicacion: e.target.value})}
                  placeholder="Ej: Campo Municipal, Polideportivo..."
                />
              </div>

              {/* Temporada */}
              <div className="space-y-2">
                <Label htmlFor="temporada">Temporada *</Label>
                <Input
                  value={currentSchedule.temporada}
                  onChange={(e) => setCurrentSchedule({...currentSchedule, temporada: e.target.value})}
                  required
                  placeholder="Ej: 2024-2025"
                />
              </div>

              {/* Estado Activo */}
              <div className="space-y-2 flex items-center justify-between bg-slate-50 rounded-lg p-4">
                <div>
                  <Label htmlFor="activo">Estado del Horario</Label>
                  <p className="text-xs text-slate-600 mt-1">
                    {currentSchedule.activo ? "Horario activo" : "Horario inactivo"}
                  </p>
                </div>
                <Switch
                  id="activo"
                  checked={currentSchedule.activo}
                  onCheckedChange={(checked) => setCurrentSchedule({...currentSchedule, activo: checked})}
                />
              </div>
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notas">Notas Adicionales</Label>
              <Textarea
                value={currentSchedule.notas}
                onChange={(e) => setCurrentSchedule({...currentSchedule, notas: e.target.value})}
                placeholder="Información adicional sobre el entrenamiento..."
                rows={3}
              />
            </div>

            {/* Botones */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  schedule ? "Actualizar Horario" : "Crear Horario"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}