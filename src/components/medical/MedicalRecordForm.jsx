import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { X } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MedicalRecordForm({ record, players, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState({
    jugador_id: "",
    jugador_nombre: "",
    categoria: "",
    tipo_registro: "Lesión",
    gravedad: "Leve",
    descripcion: "",
    fecha_ocurrencia: new Date().toISOString().split('T')[0],
    fecha_alta_estimada: "",
    estado: "Activo",
    puede_entrenar: false,
    puede_jugar: false,
    tratamiento: "",
    visible_para_padres: true,
    ...record
  });

  const handlePlayerChange = (playerId) => {
    const player = players.find(p => p.id === playerId);
    if (player) {
      setFormData(prev => ({
        ...prev,
        jugador_id: playerId,
        jugador_nombre: player.nombre,
        categoria: player.deporte
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const user = await base44.auth.me();
    onSubmit({
      ...formData,
      reportado_por: user.email
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>{record ? "Editar Registro" : "Nuevo Registro Médico"}</CardTitle>
          <Button variant="ghost" size="icon" onClick={onCancel}>
            <X className="w-5 h-5" />
          </Button>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Jugador *</Label>
              <Select
                value={formData.jugador_id}
                onValueChange={handlePlayerChange}
                required
                disabled={!!record}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un jugador" />
                </SelectTrigger>
                <SelectContent>
                  {players.map((player) => (
                    <SelectItem key={player.id} value={player.id}>
                      {player.nombre} - {player.deporte}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Registro *</Label>
                <Select
                  value={formData.tipo_registro}
                  onValueChange={(value) => setFormData({...formData, tipo_registro: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Lesión">Lesión</SelectItem>
                    <SelectItem value="Enfermedad">Enfermedad</SelectItem>
                    <SelectItem value="Consulta Médica">Consulta Médica</SelectItem>
                    <SelectItem value="Reconocimiento">Reconocimiento</SelectItem>
                    <SelectItem value="Seguimiento">Seguimiento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Gravedad *</Label>
                <Select
                  value={formData.gravedad}
                  onValueChange={(value) => setFormData({...formData, gravedad: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Leve">Leve</SelectItem>
                    <SelectItem value="Moderada">Moderada</SelectItem>
                    <SelectItem value="Grave">Grave</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Fecha de Ocurrencia *</Label>
                <Input
                  type="date"
                  required
                  value={formData.fecha_ocurrencia}
                  onChange={(e) => setFormData({...formData, fecha_ocurrencia: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Fecha Estimada de Alta</Label>
                <Input
                  type="date"
                  value={formData.fecha_alta_estimada}
                  onChange={(e) => setFormData({...formData, fecha_alta_estimada: e.target.value})}
                />
              </div>

              <div className="space-y-2">
                <Label>Estado *</Label>
                <Select
                  value={formData.estado}
                  onValueChange={(value) => setFormData({...formData, estado: value})}
                  required
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Activo">Activo</SelectItem>
                    <SelectItem value="En Seguimiento">En Seguimiento</SelectItem>
                    <SelectItem value="Recuperado">Recuperado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Descripción *</Label>
              <Textarea
                required
                value={formData.descripcion}
                onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                placeholder="Descripción detallada del caso..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Tratamiento</Label>
              <Textarea
                value={formData.tratamiento}
                onChange={(e) => setFormData({...formData, tratamiento: e.target.value})}
                placeholder="Tratamiento prescrito..."
                rows={2}
              />
            </div>

            <div className="space-y-3 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="puede_entrenar"
                  checked={formData.puede_entrenar}
                  onCheckedChange={(checked) => setFormData({...formData, puede_entrenar: checked})}
                />
                <label htmlFor="puede_entrenar" className="text-sm font-medium">
                  Puede entrenar
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="puede_jugar"
                  checked={formData.puede_jugar}
                  onCheckedChange={(checked) => setFormData({...formData, puede_jugar: checked})}
                />
                <label htmlFor="puede_jugar" className="text-sm font-medium">
                  Puede jugar partidos
                </label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="visible_para_padres"
                  checked={formData.visible_para_padres}
                  onCheckedChange={(checked) => setFormData({...formData, visible_para_padres: checked})}
                />
                <label htmlFor="visible_para_padres" className="text-sm font-medium">
                  Visible para padres
                </label>
              </div>
            </div>

            <div className="flex gap-3 justify-end pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-orange-600 hover:bg-orange-700">
                {isSubmitting ? "Guardando..." : record ? "Actualizar" : "Crear Registro"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}