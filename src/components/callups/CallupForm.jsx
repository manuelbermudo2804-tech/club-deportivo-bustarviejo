import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, AlertCircle, Users, Send, Sparkles } from "lucide-react";

export default function CallupForm({ callup, players, coachName, coachEmail, category, onSubmit, onCancel, isSubmitting }) {
  const [currentCallup, setCurrentCallup] = useState(callup || {
    titulo: "",
    categoria: category,
    tipo: "Partido",
    rival: "",
    fecha_partido: "",
    hora_partido: "",
    hora_concentracion: "",
    ubicacion: "",
    local_visitante: "Local",
    descripcion: "",
    jugadores_convocados: [],
    entrenador_email: coachEmail,
    entrenador_nombre: coachName,
    publicada: false,
    notificaciones_enviadas: false,
    cerrada: false
  });

  const [selectedPlayers, setSelectedPlayers] = useState(
    callup?.jugadores_convocados?.map(j => j.jugador_id) || []
  );

  const handlePlayerToggle = (player) => {
    setSelectedPlayers(prev => {
      if (prev.includes(player.id)) {
        return prev.filter(id => id !== player.id);
      } else {
        return [...prev, player.id];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedPlayers.length === players.length) {
      setSelectedPlayers([]);
    } else {
      setSelectedPlayers(players.map(p => p.id));
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (selectedPlayers.length === 0) {
      alert("Debes seleccionar al menos un jugador");
      return;
    }
    
    const jugadoresConvocados = selectedPlayers.map(playerId => {
      const player = players.find(p => p.id === playerId);
      const existing = callup?.jugadores_convocados?.find(j => j.jugador_id === playerId);
      
      return {
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        email_padre: player.email_padre,
        email_jugador: player.email,
        confirmacion: existing?.confirmacion || "pendiente",
        fecha_confirmacion: existing?.fecha_confirmacion || null,
        comentario: existing?.comentario || ""
      };
    });
    
    onSubmit({
      ...currentCallup,
      jugadores_convocados: jugadoresConvocados
    });
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
            {callup ? "Editar Convocatoria" : "Nueva Convocatoria"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <Alert className="bg-blue-50 border-blue-300">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>Categoría:</strong> {category} • <strong>Jugadores disponibles:</strong> {players.length}
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="space-y-2 md:col-span-2">
                <Label>Título de la Convocatoria *</Label>
                <Input
                  placeholder="Ej: Partido vs Real Madrid"
                  value={currentCallup.titulo}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, titulo: e.target.value })}
                  required
                />
              </div>

              {/* Tipo */}
              <div className="space-y-2">
                <Label>Tipo *</Label>
                <Select
                  value={currentCallup.tipo}
                  onValueChange={(value) => setCurrentCallup({ ...currentCallup, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Partido">⚽ Partido</SelectItem>
                    <SelectItem value="Entrenamiento Especial">🏃 Entrenamiento Especial</SelectItem>
                    <SelectItem value="Torneo">🏆 Torneo</SelectItem>
                    <SelectItem value="Amistoso">🤝 Amistoso</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Rival */}
              <div className="space-y-2">
                <Label>Equipo Rival</Label>
                <Input
                  placeholder="Nombre del rival"
                  value={currentCallup.rival}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, rival: e.target.value })}
                />
              </div>

              {/* Fecha */}
              <div className="space-y-2">
                <Label>Fecha *</Label>
                <Input
                  type="date"
                  value={currentCallup.fecha_partido}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, fecha_partido: e.target.value })}
                  required
                />
              </div>

              {/* Hora Partido */}
              <div className="space-y-2">
                <Label>Hora del Partido *</Label>
                <Input
                  type="time"
                  value={currentCallup.hora_partido}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, hora_partido: e.target.value })}
                  required
                />
              </div>

              {/* Hora Concentración */}
              <div className="space-y-2">
                <Label>Hora de Concentración</Label>
                <Input
                  type="time"
                  value={currentCallup.hora_concentracion}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, hora_concentracion: e.target.value })}
                />
              </div>

              {/* Local/Visitante */}
              <div className="space-y-2">
                <Label>Local / Visitante</Label>
                <Select
                  value={currentCallup.local_visitante}
                  onValueChange={(value) => setCurrentCallup({ ...currentCallup, local_visitante: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Local">🏠 Local</SelectItem>
                    <SelectItem value="Visitante">✈️ Visitante</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Ubicación */}
              <div className="space-y-2 md:col-span-2">
                <Label>Ubicación *</Label>
                <Input
                  placeholder="Campo municipal, pabellón..."
                  value={currentCallup.ubicacion}
                  onChange={(e) => setCurrentCallup({ ...currentCallup, ubicacion: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label>Instrucciones Adicionales</Label>
              <Textarea
                placeholder="Equipación, material necesario, otras indicaciones..."
                value={currentCallup.descripcion}
                onChange={(e) => setCurrentCallup({ ...currentCallup, descripcion: e.target.value })}
                rows={3}
              />
            </div>

            {/* Jugadores Convocados */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Jugadores Convocados *</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                >
                  {selectedPlayers.length === players.length ? "Deseleccionar Todos" : "Seleccionar Todos"}
                </Button>
              </div>
              
              <div className="border-2 border-slate-200 rounded-lg p-4 max-h-96 overflow-y-auto bg-slate-50">
                {players.length === 0 ? (
                  <p className="text-slate-500 text-center py-4">No hay jugadores activos en esta categoría</p>
                ) : (
                  <div className="space-y-2">
                    {players.map((player) => (
                      <div
                        key={player.id}
                        className="flex items-center gap-3 p-3 bg-white rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        <Checkbox
                          checked={selectedPlayers.includes(player.id)}
                          onCheckedChange={() => handlePlayerToggle(player)}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-slate-900">{player.nombre}</p>
                          <p className="text-xs text-slate-500">{player.email_padre || player.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <p className="text-sm text-slate-600">
                <Users className="w-4 h-4 inline mr-1" />
                {selectedPlayers.length} de {players.length} jugadores seleccionados
              </p>
            </div>

            {/* Publicar */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border-2 border-green-200">
              <div className="flex items-center gap-3">
                <Sparkles className="w-5 h-5 text-green-700" />
                <div>
                  <Label className="text-base font-medium text-green-900">Publicar y Enviar Notificaciones</Label>
                  <p className="text-sm text-green-700">
                    {currentCallup.publicada 
                      ? "✅ Se enviarán emails y mensajes al chat" 
                      : "⏸️ Borrador (no se enviará nada)"}
                  </p>
                </div>
              </div>
              <Switch
                checked={currentCallup.publicada}
                onCheckedChange={(checked) => setCurrentCallup({ ...currentCallup, publicada: checked })}
                className="data-[state=checked]:bg-green-600"
              />
            </div>

            {currentCallup.publicada && (
              <Alert className="bg-blue-50 border-blue-200">
                <Send className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>📧 Se enviará:</strong> Email a cada jugador + mensaje al chat del grupo con la convocatoria completa
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
                disabled={isSubmitting || selectedPlayers.length === 0}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  callup ? "Actualizar Convocatoria" : "Crear Convocatoria"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}