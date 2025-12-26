import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { X, Zap, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const RATING_LABELS = {
  1: "Muy bajo",
  2: "Bajo",
  3: "Normal",
  4: "Bien",
  5: "Excelente"
};

export default function QuickMatchObservationForm({ 
  categoria, 
  rival = "",
  fechaPartido = "",
  jornada = "",
  onSave, 
  onCancel,
  entrenadorEmail,
  entrenadorNombre 
}) {
  const [formData, setFormData] = useState({
    categoria: categoria || "",
    rival: rival || "",
    fecha_partido: fechaPartido || new Date().toISOString().split('T')[0],
    resultado: "",
    goles_primera_parte: "",
    goles_segunda_parte: "",
    estado_fisico: 3,
    ocasiones_claras: "",
    solidez_defensiva: 3,
    control_partido: 3,
    observaciones: "",
    temporada: "2025/2026",
    jornada: jornada || ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.rival || !formData.resultado) {
      toast.error("Rellena al menos rival y resultado");
      return;
    }

    onSave({
      ...formData,
      entrenador_email: entrenadorEmail,
      entrenador_nombre: entrenadorNombre,
      goles_primera_parte: formData.goles_primera_parte ? parseInt(formData.goles_primera_parte) : null,
      goles_segunda_parte: formData.goles_segunda_parte ? parseInt(formData.goles_segunda_parte) : null,
      ocasiones_claras: formData.ocasiones_claras ? parseInt(formData.ocasiones_claras) : null,
      jornada: formData.jornada ? parseInt(formData.jornada) : null
    });
  };

  const RatingSelector = ({ label, value, onChange }) => (
    <div>
      <Label className="text-xs text-slate-600 mb-1 block">{label}</Label>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map(rating => (
          <button
            key={rating}
            type="button"
            onClick={() => onChange(rating)}
            className={`flex-1 py-2 px-1 text-xs font-semibold rounded transition-colors ${
              value === rating
                ? 'bg-orange-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {rating}
          </button>
        ))}
      </div>
      <p className="text-[10px] text-slate-500 mt-1 text-center">
        {RATING_LABELS[value]}
      </p>
    </div>
  );

  return (
    <Card className="border-2 border-orange-500">
      <CardHeader className="pb-3 bg-gradient-to-r from-orange-50 to-orange-100">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Zap className="w-5 h-5 text-orange-600" />
            Registro Rápido Post-Partido
          </CardTitle>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
        <p className="text-xs text-slate-600 mt-1">
          ⏱️ Completa en 30 segundos - Mejora el análisis con IA
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Datos básicos */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Rival *</Label>
              <Input
                value={formData.rival}
                onChange={(e) => setFormData({ ...formData, rival: e.target.value })}
                placeholder="CD Rival"
                className="h-9 bg-slate-100"
                disabled={rival}
                required
              />
            </div>
            <div>
              <Label className="text-xs">Resultado *</Label>
              <Input
                value={formData.resultado}
                onChange={(e) => setFormData({ ...formData, resultado: e.target.value })}
                placeholder="2-1 (V)"
                className="h-9"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Fecha</Label>
              <Input
                type="date"
                value={formData.fecha_partido}
                onChange={(e) => setFormData({ ...formData, fecha_partido: e.target.value })}
                className="h-9 bg-slate-100"
                disabled={fechaPartido}
              />
            </div>
            <div>
              <Label className="text-xs">Jornada</Label>
              <Input
                type="number"
                value={formData.jornada}
                onChange={(e) => setFormData({ ...formData, jornada: e.target.value })}
                placeholder="5"
                className="h-9 bg-slate-100"
                disabled={jornada}
              />
            </div>
            <div>
              <Label className="text-xs">Temporada</Label>
              <Input
                value={formData.temporada}
                onChange={(e) => setFormData({ ...formData, temporada: e.target.value })}
                className="h-9 bg-slate-100"
                disabled
              />
            </div>
          </div>

          {/* Goles por tiempo */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Goles 1ª Parte</Label>
              <Input
                type="number"
                min="0"
                value={formData.goles_primera_parte}
                onChange={(e) => setFormData({ ...formData, goles_primera_parte: e.target.value })}
                placeholder="0"
                className="h-9"
              />
            </div>
            <div>
              <Label className="text-xs">Goles 2ª Parte</Label>
              <Input
                type="number"
                min="0"
                value={formData.goles_segunda_parte}
                onChange={(e) => setFormData({ ...formData, goles_segunda_parte: e.target.value })}
                placeholder="0"
                className="h-9"
              />
            </div>
          </div>

          {/* Ocasiones claras */}
          <div>
            <Label className="text-xs">Ocasiones Claras de Gol</Label>
            <Input
              type="number"
              min="0"
              value={formData.ocasiones_claras}
              onChange={(e) => setFormData({ ...formData, ocasiones_claras: e.target.value })}
              placeholder="3-4"
              className="h-9"
            />
          </div>

          {/* Ratings rápidos */}
          <div className="space-y-2">
            <RatingSelector
              label="💪 Estado Físico del Equipo"
              value={formData.estado_fisico}
              onChange={(val) => setFormData({ ...formData, estado_fisico: val })}
            />
            <RatingSelector
              label="🛡️ Solidez Defensiva"
              value={formData.solidez_defensiva}
              onChange={(val) => setFormData({ ...formData, solidez_defensiva: val })}
            />
            <RatingSelector
              label="⚽ Control del Partido"
              value={formData.control_partido}
              onChange={(val) => setFormData({ ...formData, control_partido: val })}
            />
          </div>

          {/* Observaciones */}
          <div>
            <Label className="text-xs">Observaciones (opcional)</Label>
            <Textarea
              value={formData.observaciones}
              onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
              placeholder="Qué funcionó bien / Qué mejorar..."
              className="h-16 text-sm"
            />
          </div>

          {/* Acciones */}
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              <Zap className="w-4 h-4 mr-2" />
              Guardar Rápido
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}