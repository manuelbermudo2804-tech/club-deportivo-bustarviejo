import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mail, Pin, Clock, AlertCircle, Sparkles } from "lucide-react";

export default function AnnouncementForm({ announcement, onSubmit, onCancel, isSubmitting }) {
  const [currentAnnouncement, setCurrentAnnouncement] = useState(announcement || {
    titulo: "",
    contenido: "",
    prioridad: "Normal",
    destinatarios_tipo: "Todos",
    categoria_destino: "",
    publicado: true,
    destacado: false,
    fecha_expiracion: "",
    enviar_email: false,
    email_enviado: false,
    fecha_publicacion: new Date().toISOString()
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(currentAnnouncement);
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
            {announcement ? "Editar Anuncio" : "Nuevo Anuncio"}
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Los anuncios son comunicados oficiales que permanecen visibles
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Info sobre cuándo usar anuncios */}
            <Alert className="bg-blue-50 border-blue-300">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>¿Cuándo usar Anuncios?</strong>
                <ul className="mt-2 space-y-1 text-xs">
                  <li>• Información crítica que debe permanecer visible</li>
                  <li>• Entrenamientos cancelados, cambios de horario</li>
                  <li>• Convocatorias para torneos o eventos</li>
                  <li>• Comunicados oficiales del club</li>
                </ul>
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Título */}
              <div className="space-y-2 md:col-span-2">
                <Label>Título del Anuncio *</Label>
                <Input
                  placeholder="Ej: Entrenamiento cancelado por lluvia"
                  value={currentAnnouncement.titulo}
                  onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, titulo: e.target.value })}
                  required
                />
              </div>

              {/* Prioridad */}
              <div className="space-y-2">
                <Label>Nivel de Prioridad *</Label>
                <Select
                  value={currentAnnouncement.prioridad}
                  onValueChange={(value) => setCurrentAnnouncement({ ...currentAnnouncement, prioridad: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">ℹ️ Normal</SelectItem>
                    <SelectItem value="Importante">⚠️ Importante</SelectItem>
                    <SelectItem value="Urgente">🚨 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Destinatarios */}
              <div className="space-y-2">
                <Label>Destinatarios *</Label>
                <Select
                  value={currentAnnouncement.destinatarios_tipo}
                  onValueChange={(value) => setCurrentAnnouncement({ ...currentAnnouncement, destinatarios_tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Fútbol Masculino">⚽ Fútbol Masculino</SelectItem>
                    <SelectItem value="Fútbol Femenino">⚽ Fútbol Femenino</SelectItem>
                    <SelectItem value="Baloncesto">🏀 Baloncesto</SelectItem>
                    <SelectItem value="Categoría Específica">Categoría Específica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Categoría específica */}
              {currentAnnouncement.destinatarios_tipo === "Categoría Específica" && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Categoría *</Label>
                  <Select
                    value={currentAnnouncement.categoria_destino}
                    onValueChange={(value) => setCurrentAnnouncement({ ...currentAnnouncement, categoria_destino: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona categoría" />
                    </SelectTrigger>
                    <SelectContent>
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
              )}

              {/* Fecha de expiración */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  Fecha de Expiración (opcional)
                </Label>
                <Input
                  type="date"
                  value={currentAnnouncement.fecha_expiracion || ""}
                  onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, fecha_expiracion: e.target.value })}
                />
                <p className="text-xs text-slate-500">
                  El anuncio se ocultará automáticamente después de esta fecha
                </p>
              </div>
            </div>

            {/* Contenido */}
            <div className="space-y-2">
              <Label>Contenido del Anuncio *</Label>
              <Textarea
                placeholder="Escribe el contenido del anuncio..."
                value={currentAnnouncement.contenido}
                onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, contenido: e.target.value })}
                rows={6}
                required
              />
            </div>

            {/* Opciones */}
            <div className="space-y-4">
              {/* Anclado/Destacado */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-yellow-50 border-2 border-yellow-200">
                <div className="flex items-center gap-3">
                  <Pin className="w-5 h-5 text-yellow-700" />
                  <div>
                    <Label className="text-base font-medium text-yellow-900">Anclar anuncio</Label>
                    <p className="text-sm text-yellow-700">
                      Aparecerá siempre al inicio, por encima del resto
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentAnnouncement.destacado}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, destacado: checked })}
                  className="data-[state=checked]:bg-yellow-600"
                />
              </div>

              {/* Publicar */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-green-50 border-2 border-green-200">
                <div className="flex items-center gap-3">
                  <Sparkles className="w-5 h-5 text-green-700" />
                  <div>
                    <Label className="text-base font-medium text-green-900">Publicar anuncio</Label>
                    <p className="text-sm text-green-700">
                      {currentAnnouncement.publicado 
                        ? "Visible para todos los usuarios" 
                        : "Borrador (solo visible para admins)"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentAnnouncement.publicado}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, publicado: checked })}
                  className="data-[state=checked]:bg-green-600"
                />
              </div>

              {/* Enviar Email */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border-2 border-blue-200">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-blue-700" />
                  <div>
                    <Label className="text-base font-medium text-blue-900">Enviar por email</Label>
                    <p className="text-sm text-blue-700">
                      Enviar copia del anuncio a los destinatarios
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentAnnouncement.enviar_email}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, enviar_email: checked })}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            </div>

            {currentAnnouncement.enviar_email && (
              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Envío de email:</strong> Se enviará un email a todos los destinatarios seleccionados con el contenido del anuncio.
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
                  announcement ? "Actualizar Anuncio" : "Publicar Anuncio"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}