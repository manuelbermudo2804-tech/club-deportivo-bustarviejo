import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";

export default function MatchResultForm({ result, callups, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    convocatoria_id: "",
    titulo_partido: "",
    categoria: "",
    fecha_partido: "",
    rival: "",
    local_visitante: "Local",
    goles_favor: 0,
    goles_contra: 0,
    resultado: "Victoria",
    observaciones: "",
    ...result
  });

  useEffect(() => {
    if (formData.goles_favor > formData.goles_contra) {
      setFormData(prev => ({ ...prev, resultado: "Victoria" }));
    } else if (formData.goles_favor === formData.goles_contra) {
      setFormData(prev => ({ ...prev, resultado: "Empate" }));
    } else {
      setFormData(prev => ({ ...prev, resultado: "Derrota" }));
    }
  }, [formData.goles_favor, formData.goles_contra]);

  const handleCallupChange = (callupId) => {
    const selectedCallup = callups.find(c => c.id === callupId);
    if (selectedCallup) {
      setFormData(prev => ({
        ...prev,
        convocatoria_id: callupId,
        titulo_partido: selectedCallup.titulo,
        categoria: selectedCallup.categoria,
        fecha_partido: selectedCallup.fecha_partido,
        rival: selectedCallup.rival || "",
        local_visitante: selectedCallup.local_visitante || "Local"
      }));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{result ? "Editar Resultado" : "Registrar Resultado"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {!result && (
              <div className="space-y-2">
                <Label>Seleccionar Convocatoria (opcional)</Label>
                <Select onValueChange={handleCallupChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona una convocatoria..." />
                  </SelectTrigger>
                  <SelectContent>
                    {callups.filter(c => c.publicada).map((callup) => (
                      <SelectItem key={callup.id} value={callup.id}>
                        {callup.titulo} - {new Date(callup.fecha_partido).toLocaleDateString('es-ES')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Título del Partido *</Label>
                <Input
                  required
                  value={formData.titulo_partido}
                  onChange={(e) => setFormData({...formData, titulo_partido: e.target.value})}
                  placeholder="Ej: Cuartos de Final"
                />
              </div>

              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => setFormData({...formData, categoria: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fútbol Pre-Benjamín (Mixto)">Pre-Benjamín</SelectItem>
                    <SelectItem value="Fútbol Benjamín (Mixto)">Benjamín</SelectItem>
                    <SelectItem value="Fútbol Alevín (Mixto)">Alevín</SelectItem>
                    <SelectItem value="Fútbol Infantil (Mixto)">Infantil</SelectItem>
                    <SelectItem value="Fútbol Cadete">Cadete</SelectItem>
                    <SelectItem value="Fútbol Juvenil">Juvenil</SelectItem>
                    <SelectItem value="Fútbol Aficionado">Aficionado</SelectItem>
                    <SelectItem value="Fútbol Femenino">Femenino</SelectItem>
                    <SelectItem value="Baloncesto (Mixto)">Baloncesto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  required
                  value={formData.fecha_partido}
                  onChange={(e) => setFormData({...formData, fecha_partido: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Rival *</Label>
                <Input
                  required
                  value={formData.rival}
                  onChange={(e) => setFormData({...formData, rival: e.target.value})}
                  placeholder="Nombre del equipo rival"
                />
              </div>

              <div className="space-y-2">
                <Label>Local/Visitante</Label>
                <Select
                  value={formData.local_visitante}
                  onValueChange={(value) => setFormData({...formData, local_visitante: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Local">Local</SelectItem>
                    <SelectItem value="Visitante">Visitante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Resultado (autocalculado)</Label>
                <Input value={formData.resultado} readOnly className="bg-slate-50" />
              </div>

              <div className="space-y-2">
                <Label>Goles a Favor *</Label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={formData.goles_favor}
                  onChange={(e) => setFormData({...formData, goles_favor: parseInt(e.target.value) || 0})}
                />
              </div>

              <div className="space-y-2">
                <Label>Goles en Contra *</Label>
                <Input
                  type="number"
                  min="0"
                  required
                  value={formData.goles_contra}
                  onChange={(e) => setFormData({...formData, goles_contra: parseInt(e.target.value) || 0})}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                value={formData.observaciones}
                onChange={(e) => setFormData({...formData, observaciones: e.target.value})}
                placeholder="Notas sobre el partido..."
                rows={3}
              />
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
                {isSubmitting ? "Guardando..." : result ? "Actualizar" : "Registrar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}