import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star } from "lucide-react";

export default function EvaluationForm({ players, coachName, coachEmail, category, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    jugador_id: "",
    fecha_evaluacion: new Date().toISOString().split('T')[0],
    tecnica: 3,
    tactica: 3,
    fisica: 3,
    actitud: 3,
    trabajo_equipo: 3,
    observaciones: "",
    aspectos_mejorar: "",
    fortalezas: "",
    visible_para_padres: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const player = players.find(p => p.id === formData.jugador_id);
    if (!player) return;

    const data = {
      ...formData,
      jugador_nombre: player.nombre,
      categoria: category,
      entrenador_email: coachEmail,
      entrenador_nombre: coachName
    };

    onSubmit(data);
  };

  const RatingStars = ({ value, onChange, label }) => (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            className="transition-transform hover:scale-110"
          >
            <Star
              className={`w-8 h-8 ${
                star <= value
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-slate-300"
              }`}
            />
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-2 border-orange-200 shadow-xl">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
          <CardTitle className="text-xl">Nueva Evaluación</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Jugador *</Label>
                <Select
                  value={formData.jugador_id}
                  onValueChange={(value) => setFormData({ ...formData, jugador_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un jugador" />
                  </SelectTrigger>
                  <SelectContent>
                    {players.map(player => (
                      <SelectItem key={player.id} value={player.id}>
                        {player.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha de Evaluación *</Label>
                <input
                  type="date"
                  value={formData.fecha_evaluacion}
                  onChange={(e) => setFormData({ ...formData, fecha_evaluacion: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  required
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <h3 className="font-semibold text-lg">Evaluación (1-5 estrellas)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <RatingStars
                  label="Técnica ⚽"
                  value={formData.tecnica}
                  onChange={(v) => setFormData({ ...formData, tecnica: v })}
                />
                <RatingStars
                  label="Táctica 🧠"
                  value={formData.tactica}
                  onChange={(v) => setFormData({ ...formData, tactica: v })}
                />
                <RatingStars
                  label="Física 💪"
                  value={formData.fisica}
                  onChange={(v) => setFormData({ ...formData, fisica: v })}
                />
                <RatingStars
                  label="Actitud 😊"
                  value={formData.actitud}
                  onChange={(v) => setFormData({ ...formData, actitud: v })}
                />
                <RatingStars
                  label="Trabajo en Equipo 🤝"
                  value={formData.trabajo_equipo}
                  onChange={(v) => setFormData({ ...formData, trabajo_equipo: v })}
                />
              </div>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div className="space-y-2">
                <Label>Fortalezas</Label>
                <Textarea
                  value={formData.fortalezas}
                  onChange={(e) => setFormData({ ...formData, fortalezas: e.target.value })}
                  placeholder="¿Cuáles son sus puntos fuertes?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Aspectos a Mejorar</Label>
                <Textarea
                  value={formData.aspectos_mejorar}
                  onChange={(e) => setFormData({ ...formData, aspectos_mejorar: e.target.value })}
                  placeholder="¿Qué debería mejorar?"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Observaciones Generales</Label>
                <Textarea
                  value={formData.observaciones}
                  onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                  placeholder="Comentarios adicionales..."
                  rows={3}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="visible"
                checked={formData.visible_para_padres}
                onChange={(e) => setFormData({ ...formData, visible_para_padres: e.target.checked })}
                className="w-4 h-4"
              />
              <Label htmlFor="visible" className="cursor-pointer">
                Visible para los padres
              </Label>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-orange-600 hover:bg-orange-700"
                disabled={isSubmitting || !formData.jugador_id}
              >
                {isSubmitting ? "Guardando..." : "Guardar Evaluación"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}