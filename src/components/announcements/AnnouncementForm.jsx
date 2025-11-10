import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2, AlertCircle, Mail } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AnnouncementForm({ announcement, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState(announcement || {
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

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const priorityIcons = {
    "Normal": "ℹ️",
    "Importante": "⚠️",
    "Urgente": "🚨"
  };

  const recipientIcons = {
    "Todos": "👥",
    "Fútbol": "⚽",
    "Baloncesto": "🏀",
    "Categoría Específica": "🎯"
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
            {announcement ? "Editar Anuncio" : "Nuevo Anuncio"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {formData.enviar_email && !announcement && (
              <Alert className="bg-blue-50 border-blue-200">
                <Mail className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Este anuncio se enviará por email a los destinatarios seleccionados cuando lo publiques.
                </AlertDescription>
              </Alert>
            )}

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="titulo">Título del Anuncio *</Label>
                <Input
                  id="titulo"
                  value={formData.titulo}
                  onChange={(e) => handleChange("titulo", e.target.value)}
                  required
                  placeholder="Ej: Partido suspendido por lluvia"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="contenido">Contenido del Mensaje *</Label>
                <Textarea
                  id="contenido"
                  value={formData.contenido}
                  onChange={(e) => handleChange("contenido", e.target.value)}
                  required
                  placeholder="Escribe el mensaje completo del anuncio..."
                  rows={6}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="prioridad">Prioridad *</Label>
                <Select
                  value={formData.prioridad}
                  onValueChange={(value) => handleChange("prioridad", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(priorityIcons).map(([prioridad, icon]) => (
                      <SelectItem key={prioridad} value={prioridad}>
                        {icon} {prioridad}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="destinatarios_tipo">Destinatarios *</Label>
                <Select
                  value={formData.destinatarios_tipo}
                  onValueChange={(value) => {
                    handleChange("destinatarios_tipo", value);
                    if (value !== "Categoría Específica") {
                      handleChange("categoria_destino", "");
                    }
                  }}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona destinatarios" />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(recipientIcons).map(([tipo, icon]) => (
                      <SelectItem key={tipo} value={tipo}>
                        {icon} {tipo}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {formData.destinatarios_tipo === "Categoría Específica" && (
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="categoria_destino">Categoría *</Label>
                  <Select
                    value={formData.categoria_destino}
                    onValueChange={(value) => handleChange("categoria_destino", value)}
                    required
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

              {!announcement && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enviar_email"
                    checked={formData.enviar_email}
                    onCheckedChange={(checked) => handleChange("enviar_email", checked)}
                  />
                  <Label htmlFor="enviar_email">📧 Enviar por Email</Label>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Switch
                  id="publicado"
                  checked={formData.publicado}
                  onCheckedChange={(checked) => handleChange("publicado", checked)}
                />
                <Label htmlFor="publicado">Publicar</Label>
              </div>
            </div>

            {formData.destinatarios_tipo !== "Todos" && (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Este anuncio solo será visible para {formData.destinatarios_tipo === "Categoría Específica" ? `la categoría ${formData.categoria_destino}` : formData.destinatarios_tipo}.
                </AlertDescription>
              </Alert>
            )}

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
                    {formData.enviar_email ? "Publicando y enviando..." : "Guardando..."}
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