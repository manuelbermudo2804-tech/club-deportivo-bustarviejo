import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

export default function EventForm({ event, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState(event || {
    titulo: "",
    descripcion: "",
    tipo: "Otro",
    deporte: "Ambos",
    categoria: "Todas",
    fecha: "",
    hora: "",
    ubicacion: "",
    rival: "",
    local_visitante: "",
    importante: false,
    color: "orange",
    publicado: true
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const typeIcons = {
    "Partido": "⚽",
    "Entrenamiento": "🏃",
    "Reunión": "👥",
    "Torneo": "🏆",
    "Inicio Temporada": "🎯",
    "Otro": "📅"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl">
            {event ? "Editar Evento" : "Nuevo Evento"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="titulo">Título del Evento *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => handleChange("titulo", e.target.value)}
                  required
                  placeholder="Ej: Partido contra CD Villamanta"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="descripcion">Descripción</Label>
                <Textarea
                  id="descripcion"
                  value={formData.descripcion}
                  onChange={(e) => handleChange("descripcion", e.target.value)}
                  placeholder="Detalles adicionales del evento..."
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo de Evento *</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value) => handleChange("tipo", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(typeIcons).map(([tipo, icon]) => (
                      <SelectItem key={tipo} value={tipo}>
                        {icon} {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="deporte">Deporte</Label>
                <Select
                  value={formData.deporte}
                  onValueChange={(value) => handleChange("deporte", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Ambos">🏃 Ambos deportes</SelectItem>
                    <SelectItem value="Fútbol">⚽ Fútbol</SelectItem>
                    <SelectItem value="Baloncesto">🏀 Baloncesto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => handleChange("categoria", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas las categorías</SelectItem>
                    <SelectItem value="Prebenjamín">Prebenjamín</SelectItem>
                    <SelectItem value="Benjamín">Benjamín</SelectItem>
                    <SelectItem value="Alevín">Alevín</SelectItem>
                    <SelectItem value="Infantil">Infantil</SelectItem>
                    <SelectItem value="Cadete">Cadete</SelectItem>
                    <SelectItem value="Juvenil">Juvenil</SelectItem>
                    <SelectItem value="Senior">Senior</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha">Fecha *</Label>
                <Input
                  id="fecha"
                  type="date"
                  value={formData.fecha}
                  onChange={(e) => handleChange("fecha", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hora">Hora</Label>
                <Input
                  id="hora"
                  type="time"
                  value={formData.hora}
                  onChange={(e) => handleChange("hora", e.target.value)}
                  placeholder="10:00"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="ubicacion">Ubicación</Label>
                <Input
                  id="ubicacion"
                  value={formData.ubicacion}
                  onChange={(e) => handleChange("ubicacion", e.target.value)}
                  placeholder="Ej: Campo Municipal de Bustarviejo"
                />
              </div>

              {formData.tipo === "Partido" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="rival">Equipo Rival</Label>
                    <Input
                      id="rival"
                      value={formData.rival}
                      onChange={(e) => handleChange("rival", e.target.value)}
                      placeholder="Ej: CD Villamanta"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="local_visitante">Local/Visitante</Label>
                    <Select
                      value={formData.local_visitante}
                      onValueChange={(value) => handleChange("local_visitante", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecciona" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Local">🏠 Local</SelectItem>
                        <SelectItem value="Visitante">✈️ Visitante</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="color">Color en Calendario</Label>
                <Select
                  value={formData.color}
                  onValueChange={(value) => handleChange("color", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona color" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="orange">🟠 Naranja</SelectItem>
                    <SelectItem value="blue">🔵 Azul</SelectItem>
                    <SelectItem value="green">🟢 Verde</SelectItem>
                    <SelectItem value="red">🔴 Rojo</SelectItem>
                    <SelectItem value="purple">🟣 Morado</SelectItem>
                    <SelectItem value="yellow">🟡 Amarillo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="importante"
                  checked={formData.importante}
                  onCheckedChange={(checked) => handleChange("importante", checked)}
                />
                <Label htmlFor="importante">⭐ Evento Destacado</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="publicado"
                  checked={formData.publicado}
                  onCheckedChange={(checked) => handleChange("publicado", checked)}
                />
                <Label htmlFor="publicado">Publicado</Label>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
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
                disabled={isSubmitting}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  event ? "Actualizar Evento" : "Crear Evento"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}