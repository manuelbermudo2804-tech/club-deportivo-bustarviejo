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
import { Loader2, Mail, Pin, Clock, AlertCircle, Sparkles, Bell } from "lucide-react";

export default function AnnouncementForm({ announcement, onSubmit, onCancel, isSubmitting }) {
  const [currentAnnouncement, setCurrentAnnouncement] = useState(announcement || {
    titulo: "",
    contenido: "",
    prioridad: "Normal",
    destinatarios_tipo: "Todos",
    publicado: true,
    destacado: false,
    tipo_caducidad: "horas",
    duracion_horas: 72,
    fecha_expiracion: "",
    enviar_email: false,
    enviar_chat: false,
    email_enviado: false,
    fecha_publicacion: new Date().toISOString(),
    leido_por: [],
    // Nuevos campos de segmentación y banner
    destinatarios_emails: "",
    mostrar_como_banner: false,
    banner_activo: false,
    banner_posicion: "top",
    banner_dismissible: true,
    banner_variant: "info"
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const emails = Array.isArray(currentAnnouncement.destinatarios_emails)
      ? currentAnnouncement.destinatarios_emails
      : (currentAnnouncement.destinatarios_emails || "").split(",").map((x) => x.trim()).filter(Boolean);
    const payload = { ...currentAnnouncement, destinatarios_emails: emails };
    onSubmit(payload);
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
                    <SelectItem value="Todos">🏃 Todos los grupos</SelectItem>
                    <SelectItem value="Fútbol Pre-Benjamín (Mixto)">⚽ Fútbol Pre-Benjamín (Mixto)</SelectItem>
                    <SelectItem value="Fútbol Benjamín (Mixto)">⚽ Fútbol Benjamín (Mixto)</SelectItem>
                    <SelectItem value="Fútbol Alevín (Mixto)">⚽ Fútbol Alevín (Mixto)</SelectItem>
                    <SelectItem value="Fútbol Infantil (Mixto)">⚽ Fútbol Infantil (Mixto)</SelectItem>
                    <SelectItem value="Fútbol Cadete">⚽ Fútbol Cadete</SelectItem>
                    <SelectItem value="Fútbol Juvenil">⚽ Fútbol Juvenil</SelectItem>
                    <SelectItem value="Fútbol Aficionado">⚽ Fútbol Aficionado</SelectItem>
                    <SelectItem value="Fútbol Femenino">⚽ Fútbol Femenino</SelectItem>
                    <SelectItem value="Baloncesto (Mixto)">🏀 Baloncesto (Mixto)</SelectItem>
                  </SelectContent>
                </Select>
                <div className="space-y-1">
                  <Label className="text-sm">Emails específicos (opcional)</Label>
                  <Input
                    placeholder="email1@dominio.com, email2@dominio.com"
                    value={currentAnnouncement.destinatarios_emails}
                    onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, destinatarios_emails: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">Si rellenas esta lista, solo esos emails verán el anuncio (además del filtro por grupo si aplica).</p>
                </div>
              </div>

              {/* Configuración de Banner */}
              <div className="space-y-3 md:col-span-2 p-4 rounded-lg bg-purple-50 border-2 border-purple-200">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium text-purple-900">Mostrar como Banner</Label>
                    <p className="text-sm text-purple-700">Aparecerá fijo en la parte superior o inferior de la app</p>
                  </div>
                  <Switch
                    checked={currentAnnouncement.mostrar_como_banner}
                    onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, mostrar_como_banner: checked })}
                    className="data-[state=checked]:bg-purple-600"
                  />
                </div>

                {currentAnnouncement.mostrar_como_banner && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <Label>Estado</Label>
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={currentAnnouncement.banner_activo}
                          onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, banner_activo: checked })}
                        />
                        <span className="text-sm">{currentAnnouncement.banner_activo ? 'Activo' : 'Inactivo'}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label>Posición</Label>
                      <Select
                        value={currentAnnouncement.banner_posicion}
                        onValueChange={(v) => setCurrentAnnouncement({ ...currentAnnouncement, banner_posicion: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="top">Arriba</SelectItem>
                          <SelectItem value="bottom">Abajo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <Label>Estilo</Label>
                      <Select
                        value={currentAnnouncement.banner_variant}
                        onValueChange={(v) => setCurrentAnnouncement({ ...currentAnnouncement, banner_variant: v })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="info">Info</SelectItem>
                          <SelectItem value="warning">Aviso</SelectItem>
                          <SelectItem value="success">Éxito</SelectItem>
                          <SelectItem value="danger">Urgente</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1 md:col-span-3">
                      <div className="flex items-center gap-3">
                        <Switch
                          checked={currentAnnouncement.banner_dismissible}
                          onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, banner_dismissible: checked })}
                        />
                        <Label>Permitir que el usuario lo oculte</Label>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Tipo de caducidad */}
              <div className="space-y-2 md:col-span-2">
                <Label className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-orange-600" />
                  Caducidad del Anuncio
                </Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={currentAnnouncement.tipo_caducidad === "horas" ? "default" : "outline"}
                    onClick={() => setCurrentAnnouncement({ ...currentAnnouncement, tipo_caducidad: "horas" })}
                    className={currentAnnouncement.tipo_caducidad === "horas" ? "bg-orange-600" : ""}
                  >
                    ⏱️ Por Horas
                  </Button>
                  <Button
                    type="button"
                    variant={currentAnnouncement.tipo_caducidad === "fecha" ? "default" : "outline"}
                    onClick={() => setCurrentAnnouncement({ ...currentAnnouncement, tipo_caducidad: "fecha" })}
                    className={currentAnnouncement.tipo_caducidad === "fecha" ? "bg-orange-600" : ""}
                  >
                    📅 Fecha Específica
                  </Button>
                </div>
              </div>

              {/* Configuración de caducidad */}
              {currentAnnouncement.tipo_caducidad === "horas" ? (
                <div className="space-y-2 md:col-span-2">
                  <Label>Duración del Anuncio</Label>
                  <Select
                    value={currentAnnouncement.duracion_horas?.toString() || "72"}
                    onValueChange={(value) => setCurrentAnnouncement({ ...currentAnnouncement, duracion_horas: parseInt(value) })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="6">⏱️ 6 horas</SelectItem>
                      <SelectItem value="12">⏱️ 12 horas</SelectItem>
                      <SelectItem value="24">📅 24 horas (1 día)</SelectItem>
                      <SelectItem value="48">📅 48 horas (2 días)</SelectItem>
                      <SelectItem value="72">📅 72 horas (3 días)</SelectItem>
                      <SelectItem value="168">📅 1 semana</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500">
                    El anuncio se ocultará automáticamente después de este tiempo
                  </p>
                </div>
              ) : (
                <div className="space-y-2 md:col-span-2">
                  <Label>Fecha de Expiración (opcional)</Label>
                  <Input
                    type="date"
                    value={currentAnnouncement.fecha_expiracion || ""}
                    onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, fecha_expiracion: e.target.value })}
                  />
                  <p className="text-xs text-slate-500">
                    El anuncio se ocultará automáticamente después de esta fecha
                  </p>
                </div>
              )}
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

              {/* Enviar a Mensajes del Club */}
              <div className="flex items-center justify-between p-4 rounded-lg bg-orange-50 border-2 border-orange-200">
                <div className="flex items-center gap-3">
                  <Bell className="w-5 h-5 text-orange-700" />
                  <div>
                    <Label className="text-base font-medium text-orange-900">Enviar a "Mensajes del Club"</Label>
                    <p className="text-sm text-orange-700">
                      Publica este anuncio como mensaje privado del club para cada familia
                    </p>
                  </div>
                </div>
                <Switch
                  checked={currentAnnouncement.enviar_chat === true}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, enviar_chat: checked })}
                  className="data-[state=checked]:bg-orange-600"
                />
              </div>
            </div>

            {/* Alertas informativas */}
            {currentAnnouncement.enviar_email && (
              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>Envío de email:</strong> Se enviará un email a todos los destinatarios seleccionados con el contenido del anuncio.
                </AlertDescription>
              </Alert>
            )}

            {/* Info sobre alertas */}
            <Alert className="bg-green-50 border-green-200">
              <Bell className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                <strong>🔔 Aparecerá automáticamente en el Centro de Alertas</strong> de todos los destinatarios hasta que lo lean o expire.
              </AlertDescription>
            </Alert>

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