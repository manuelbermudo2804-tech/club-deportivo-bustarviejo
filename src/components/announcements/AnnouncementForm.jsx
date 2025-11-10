import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertTriangle, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AnnouncementForm({ announcement, onSubmit, onCancel, isSubmitting }) {
  const [currentAnnouncement, setCurrentAnnouncement] = useState(announcement || {
    titulo: "",
    contenido: "",
    prioridad: "Normal",
    destinatarios_tipo: "Todos",
    categoria_destino: "",
    publicado: true,
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
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Título */}
            <div className="space-y-2">
              <Label>Título del Anuncio *</Label>
              <Input
                placeholder="Título del anuncio"
                value={currentAnnouncement.titulo}
                onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, titulo: e.target.value })}
                required
              />
            </div>

            {/* Contenido */}
            <div className="space-y-2">
              <Label>Contenido *</Label>
              <Textarea
                placeholder="Escribe el contenido del anuncio..."
                value={currentAnnouncement.contenido}
                onChange={(e) => setCurrentAnnouncement({ ...currentAnnouncement, contenido: e.target.value })}
                rows={6}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Prioridad */}
              <div className="space-y-2">
                <Label>Prioridad *</Label>
                <Select
                  value={currentAnnouncement.prioridad}
                  onValueChange={(value) => setCurrentAnnouncement({ ...currentAnnouncement, prioridad: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">📝 Normal</SelectItem>
                    <SelectItem value="Importante">⚠️ Importante</SelectItem>
                    <SelectItem value="Urgente">🔴 Urgente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Destinatarios */}
              <div className="space-y-2">
                <Label>Destinatarios *</Label>
                <Select
                  value={currentAnnouncement.destinatarios_tipo}
                  onValueChange={(value) => setCurrentAnnouncement({ 
                    ...currentAnnouncement, 
                    destinatarios_tipo: value,
                    categoria_destino: value === "Categoría Específica" ? currentAnnouncement.categoria_destino : ""
                  })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todos</SelectItem>
                    <SelectItem value="Fútbol Masculino">⚽ Fútbol Masculino</SelectItem>
                    <SelectItem value="Fútbol Femenino">⚽ Fútbol Femenino</SelectItem>
                    <SelectItem value="Baloncesto">🏀 Baloncesto</SelectItem>
                    <SelectItem value="Categoría Específica">🎯 Categoría Específica</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Categoría específica (si aplica) */}
              {currentAnnouncement.destinatarios_tipo === "Categoría Específica" && (
                <div className="space-y-2 md:col-span-2">
                  <Label>Selecciona Categoría *</Label>
                  <Select
                    value={currentAnnouncement.categoria_destino}
                    onValueChange={(value) => setCurrentAnnouncement({ ...currentAnnouncement, categoria_destino: value })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona una categoría" />
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
            </div>

            {/* Switches */}
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
                <div>
                  <Label className="text-base font-medium">Publicar Anuncio</Label>
                  <p className="text-sm text-slate-500">¿Hacer visible para destinatarios?</p>
                </div>
                <Switch
                  checked={currentAnnouncement.publicado}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, publicado: checked })}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div>
                  <Label className="text-base font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-blue-600" />
                    Enviar por Email
                  </Label>
                  <p className="text-sm text-blue-700">Notificar a destinatarios vía correo electrónico</p>
                </div>
                <Switch
                  checked={currentAnnouncement.enviar_email}
                  onCheckedChange={(checked) => setCurrentAnnouncement({ ...currentAnnouncement, enviar_email: checked })}
                />
              </div>
            </div>

            {/* Alertas informativas */}
            {currentAnnouncement.enviar_email && (
              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Se enviará un email a todos los destinatarios seleccionados cuando se guarde el anuncio.
                </AlertDescription>
              </Alert>
            )}

            {currentAnnouncement.destinatarios_tipo === "Todos" && (
              <Alert className="bg-orange-50 border-orange-200">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  Este anuncio será visible para todos los usuarios del club.
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
                  announcement ? "Actualizar Anuncio" : "Crear Anuncio"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}