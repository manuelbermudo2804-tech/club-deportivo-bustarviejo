import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function EventForm({ event, onSubmit, onCancel, isSubmitting }) {
  const [currentEvent, setCurrentEvent] = useState(event || {
    titulo: "",
    descripcion: "",
    tipo: "Partido",
    deporte: "Todos",
    categoria: "Todas",
    fecha: "",
    fecha_fin: "",
    hora: "",
    ubicacion: "",
    rival: "",
    local_visitante: "Local",
    importante: false,
    color: "orange",
    publicado: true,
    es_automatico: false,
    notificado: false
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(currentEvent);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white/95 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl text-slate-900">
            {event ? "Editar Evento" : "Nuevo Evento"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {currentEvent.es_automatico && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>📅 Evento del Calendario Anual:</strong> Este evento fue creado automáticamente del calendario de gestión del club.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="space-y-2 md:col-span-2">
                <Label>Título del Evento *</Label>
                <Input
                  placeholder="Ej: Partido vs Real Madrid"
                  value={currentEvent.titulo}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, titulo: e.target.value })}
                  required
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo de Evento *</Label>
                <Select
                  value={currentEvent.tipo}
                  onValueChange={(value) => setCurrentEvent({ ...currentEvent, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Partido">Partido</SelectItem>
                    <SelectItem value="Entrenamiento">Entrenamiento</SelectItem>
                    <SelectItem value="Reunión">Reunión</SelectItem>
                    <SelectItem value="Torneo">Torneo</SelectItem>
                    <SelectItem value="Inicio Temporada">Inicio Temporada</SelectItem>
                    <SelectItem value="Gestión Club">Gestión Club</SelectItem>
                    <SelectItem value="Pago">Pago</SelectItem>
                    <SelectItem value="Inscripción">Inscripción</SelectItem>
                    <SelectItem value="Pedido Ropa">Pedido Ropa</SelectItem>
                    <SelectItem value="Fiesta Club">Fiesta Club</SelectItem>
                    <SelectItem value="Fin Temporada">Fin Temporada</SelectItem>
                    <SelectItem value="Otro">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Deporte */}
              <div className="space-y-2">
                <Label>Deporte</Label>
                <Select
                  value={currentEvent.deporte}
                  onValueChange={(value) => setCurrentEvent({ ...currentEvent, deporte: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Fútbol Masculino">⚽ Fútbol Masculino</SelectItem>
                    <SelectItem value="Fútbol Femenino">⚽ Fútbol Femenino</SelectItem>
                    <SelectItem value="Baloncesto">🏀 Baloncesto</SelectItem>
                    <SelectItem value="Paddle">🎾 Paddle</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <Label>Categoría</Label>
                <Select
                  value={currentEvent.categoria}
                  onValueChange={(value) => setCurrentEvent({ ...currentEvent, categoria: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todas">Todas</SelectItem>
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

              {/* Color */}
              <div className="space-y-2">
                <Label>Color del Evento</Label>
                <Select
                  value={currentEvent.color}
                  onValueChange={(value) => setCurrentEvent({ ...currentEvent, color: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
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

              {/* Fecha Inicio */}
              <div className="space-y-2">
                <Label>Fecha Inicio *</Label>
                <Input
                  type="date"
                  value={currentEvent.fecha}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, fecha: e.target.value })}
                  required
                />
              </div>

              {/* Fecha Fin (opcional) */}
              <div className="space-y-2">
                <Label>Fecha Fin (opcional)</Label>
                <Input
                  type="date"
                  value={currentEvent.fecha_fin}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, fecha_fin: e.target.value })}
                />
                <p className="text-xs text-slate-500">Para eventos de varios días (ej: "Primera semana de...")</p>
              </div>

              {/* Hora */}
              <div className="space-y-2">
                <Label>Hora</Label>
                <Input
                  type="time"
                  value={currentEvent.hora}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, hora: e.target.value })}
                />
              </div>

              {/* Ubicación */}
              <div className="space-y-2">
                <Label>Ubicación</Label>
                <Input
                  placeholder="Campo municipal, pabellón, etc."
                  value={currentEvent.ubicacion}
                  onChange={(e) => setCurrentEvent({ ...currentEvent, ubicacion: e.target.value })}
                />
              </div>

              {/* Campos específicos para partidos */}
              {currentEvent.tipo === "Partido" && (
                <>
                  <div className="space-y-2">
                    <Label>Equipo Rival</Label>
                    <Input
                      placeholder="Nombre del equipo rival"
                      value={currentEvent.rival}
                      onChange={(e) => setCurrentEvent({ ...currentEvent, rival: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Local / Visitante</Label>
                    <Select
                      value={currentEvent.local_visitante}
                      onValueChange={(value) => setCurrentEvent({ ...currentEvent, local_visitante: value })}
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
                </>
              )}
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label>Descripción</Label>
              <Textarea
                placeholder="Detalles adicionales del evento..."
                value={currentEvent.descripcion}
                onChange={(e) => setCurrentEvent({ ...currentEvent, descripcion: e.target.value })}
                rows={3}
              />
            </div>

            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                <div>
                  <Label className="text-base font-medium">Evento Importante</Label>
                  <p className="text-sm text-slate-500">Destacar este evento</p>
                </div>
                <Switch
                  checked={currentEvent.importante}
                  onCheckedChange={(checked) => setCurrentEvent({ ...currentEvent, importante: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border-2 border-green-200">
                <div>
                  <Label className="text-base font-medium">Publicado</Label>
                  <p className="text-sm text-green-700">
                    {currentEvent.publicado 
                      ? "✅ Visible para todos (se notificará a los usuarios)" 
                      : "⏸️ Borrador (solo visible para admins)"}
                  </p>
                </div>
                <Switch
                  checked={currentEvent.publicado}
                  onCheckedChange={(checked) => setCurrentEvent({ ...currentEvent, publicado: checked })}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>
            </div>

            {currentEvent.publicado && (
              <Alert className="bg-blue-50 border-blue-200">
                <Bell className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  <strong>🔔 Notificación:</strong> Al publicar este evento, aparecerá un badge en el icono de la app para avisar a los usuarios.
                </AlertDescription>
              </Alert>
            )}

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