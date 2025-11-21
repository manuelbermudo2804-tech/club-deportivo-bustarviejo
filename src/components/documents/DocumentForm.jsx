import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { motion } from "framer-motion";
import { X, Upload, Loader2, Bell, AlertCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function DocumentForm({ document, players, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState(document || {
    titulo: "",
    descripcion: "",
    tipo: "Información General",
    tipo_destinatario: "categoria",
    categoria_destino: "Todos",
    jugadores_destino: [],
    archivo_url: "",
    enlace_firma_externa: "",
    codigo_qr_url: "",
    requiere_firma: false,
    fecha_limite_firma: "",
    publicado: true,
    enviar_notificacion: false,
    firmas: [],
    frecuencia_recordatorios_dias: 3,
    dias_antes_alerta_admin: 3,
    porcentaje_alerta_admin: 50
  });

  const [uploading, setUploading] = useState(false);
  const [uploadingQR, setUploadingQR] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error("Solo se permiten archivos PDF");
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, archivo_url: file_url });
      toast.success("Archivo subido correctamente");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Error al subir el archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleQRUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    setUploadingQR(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData({ ...formData, codigo_qr_url: file_url });
      toast.success("Código QR subido correctamente");
    } catch (error) {
      console.error("Error uploading QR:", error);
      toast.error("Error al subir el código QR");
    } finally {
      setUploadingQR(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!formData.titulo) {
      toast.error("El título es obligatorio");
      return;
    }

    // Si requiere firma y no tiene enlace externo, inicializar array de firmas
    if (formData.requiere_firma && !formData.enlace_firma_externa && !document) {
      let firmasIniciales = [];
      
      if (formData.tipo_destinatario === "categoria") {
        firmasIniciales = players
          .filter(p => {
            if (formData.categoria_destino === "Todos") return true;
            return p.deporte === formData.categoria_destino;
          })
          .map(p => ({
            jugador_id: p.id,
            jugador_nombre: p.nombre,
            email_padre: p.email_padre,
            firmado: false,
            fecha_firma: null,
            comentario: ""
          }));
      } else {
        firmasIniciales = players
          .filter(p => formData.jugadores_destino.includes(p.id))
          .map(p => ({
            jugador_id: p.id,
            jugador_nombre: p.nombre,
            email_padre: p.email_padre,
            firmado: false,
            fecha_firma: null,
            comentario: ""
          }));
      }
      
      formData.firmas = firmasIniciales;
    }

    onSubmit(formData);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-2 border-orange-200">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100">
          <div className="flex items-center justify-between">
            <CardTitle>{document ? "Editar Documento" : "Nuevo Documento"}</CardTitle>
            <Button variant="ghost" size="icon" onClick={onCancel}>
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="titulo">Título *</Label>
              <Input
                id="titulo"
                value={formData.titulo}
                onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
                placeholder="Ej: Estatutos del Club 2024"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="descripcion">Descripción</Label>
              <Textarea
                id="descripcion"
                value={formData.descripcion || ""}
                onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                placeholder="Descripción del documento"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tipo">Tipo de Documento</Label>
              <Select value={formData.tipo} onValueChange={(value) => setFormData({ ...formData, tipo: value })}>
                <SelectTrigger id="tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Estatutos">Estatutos</SelectItem>
                  <SelectItem value="Reglamentación">Reglamentación</SelectItem>
                  <SelectItem value="Normativa Federación">Normativa Federación</SelectItem>
                  <SelectItem value="Autorización">Autorización</SelectItem>
                  <SelectItem value="Consentimiento">Consentimiento</SelectItem>
                  <SelectItem value="Información General">Información General</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3">
              <Label>Tipo de Destinatarios</Label>
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.tipo_destinatario === "categoria"}
                    onChange={() => setFormData({ ...formData, tipo_destinatario: "categoria", jugadores_destino: [] })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Por Categoría</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={formData.tipo_destinatario === "individual"}
                    onChange={() => setFormData({ ...formData, tipo_destinatario: "individual" })}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">Jugadores Individuales</span>
                </label>
              </div>
            </div>

            {formData.tipo_destinatario === "categoria" ? (
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría Destino</Label>
                <Select value={formData.categoria_destino} onValueChange={(value) => setFormData({ ...formData, categoria_destino: value })}>
                  <SelectTrigger id="categoria">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Todos">Todas las Categorías</SelectItem>
                    <SelectItem value="Fútbol Pre-Benjamín (Mixto)">Fútbol Pre-Benjamín</SelectItem>
                    <SelectItem value="Fútbol Benjamín (Mixto)">Fútbol Benjamín</SelectItem>
                    <SelectItem value="Fútbol Alevín (Mixto)">Fútbol Alevín</SelectItem>
                    <SelectItem value="Fútbol Infantil (Mixto)">Fútbol Infantil</SelectItem>
                    <SelectItem value="Fútbol Cadete">Fútbol Cadete</SelectItem>
                    <SelectItem value="Fútbol Juvenil">Fútbol Juvenil</SelectItem>
                    <SelectItem value="Fútbol Aficionado">Fútbol Aficionado</SelectItem>
                    <SelectItem value="Fútbol Femenino">Fútbol Femenino</SelectItem>
                    <SelectItem value="Baloncesto (Mixto)">Baloncesto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Seleccionar Jugadores</Label>
                <div className="border rounded-lg p-4 max-h-64 overflow-y-auto space-y-2">
                  {players.length === 0 ? (
                    <p className="text-sm text-slate-500">No hay jugadores disponibles</p>
                  ) : (
                    players.map((player) => (
                      <label key={player.id} className="flex items-start gap-2 cursor-pointer hover:bg-slate-50 p-3 rounded border border-transparent hover:border-slate-200">
                        <Checkbox
                          checked={formData.jugadores_destino.includes(player.id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setFormData({
                                ...formData,
                                jugadores_destino: [...formData.jugadores_destino, player.id]
                              });
                            } else {
                              setFormData({
                                ...formData,
                                jugadores_destino: formData.jugadores_destino.filter(id => id !== player.id)
                              });
                            }
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">{player.nombre}</span>
                            <span className="text-xs text-slate-500">{player.deporte}</span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1">
                            👤 {player.email_padre}
                          </div>
                        </div>
                      </label>
                    ))
                  )}
                </div>
                <p className="text-xs text-slate-500">
                  Seleccionados: {formData.jugadores_destino.length} jugador{formData.jugadores_destino.length !== 1 ? 'es' : ''}
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="archivo">Archivo PDF</Label>
              <div className="flex gap-2">
                <Input
                  id="archivo"
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  disabled={uploading}
                />
                {uploading && <Loader2 className="w-5 h-5 animate-spin text-orange-600" />}
              </div>
              {formData.archivo_url && (
                <a 
                  href={formData.archivo_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Ver archivo actual
                </a>
              )}
            </div>

            <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg">
              <Switch
                id="requiere_firma"
                checked={formData.requiere_firma}
                onCheckedChange={(checked) => setFormData({ ...formData, requiere_firma: checked })}
              />
              <Label htmlFor="requiere_firma" className="cursor-pointer">
                Este documento requiere firma
              </Label>
            </div>

            {formData.requiere_firma && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="enlace_firma">Enlace para Firma Digital (opcional)</Label>
                  <Input
                    id="enlace_firma"
                    value={formData.enlace_firma_externa || ""}
                    onChange={(e) => setFormData({ ...formData, enlace_firma_externa: e.target.value })}
                    placeholder="https://plataforma-federacion.com/firmar/..."
                  />
                  <p className="text-xs text-slate-500">
                    Si dejas este campo vacío, las familias confirmarán desde la app. Si añades un enlace externo, se les redirigirá allí.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="codigo_qr">Código QR (opcional)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="codigo_qr"
                      type="file"
                      accept="image/*"
                      onChange={handleQRUpload}
                      disabled={uploadingQR}
                    />
                    {uploadingQR && <Loader2 className="w-5 h-5 animate-spin text-orange-600" />}
                  </div>
                  {formData.codigo_qr_url && (
                    <div className="mt-2">
                      <img 
                        src={formData.codigo_qr_url} 
                        alt="Código QR" 
                        className="w-32 h-32 border rounded-lg"
                      />
                    </div>
                  )}
                  <p className="text-xs text-slate-500">
                    Sube la imagen del código QR generado por la federación para que las familias puedan escanearlo.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="fecha_limite">Fecha Límite (opcional)</Label>
                  <Input
                    id="fecha_limite"
                    type="date"
                    value={formData.fecha_limite_firma || ""}
                    onChange={(e) => setFormData({ ...formData, fecha_limite_firma: e.target.value })}
                  />
                </div>
              </>
            )}

            <div className="flex items-center space-x-2 p-4 bg-slate-50 rounded-lg">
              <Switch
                id="publicado"
                checked={formData.publicado}
                onCheckedChange={(checked) => setFormData({ ...formData, publicado: checked })}
              />
              <Label htmlFor="publicado" className="cursor-pointer">
                Publicar documento (visible para familias)
              </Label>
            </div>

            <div className="flex items-center space-x-2 p-4 bg-blue-50 rounded-lg">
              <Switch
                id="enviar_notificacion"
                checked={formData.enviar_notificacion}
                onCheckedChange={(checked) => setFormData({ ...formData, enviar_notificacion: checked })}
              />
              <Label htmlFor="enviar_notificacion" className="cursor-pointer">
                Enviar notificación por email a las familias
              </Label>
            </div>

            {formData.requiere_firma && (
              <Accordion type="single" collapsible className="w-full border rounded-lg">
                <AccordionItem value="notifications" className="border-none">
                  <AccordionTrigger className="px-4 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <Bell className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold">Notificaciones Automáticas</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4 pb-4 space-y-4">
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                      <p className="text-sm text-blue-900">
                        <AlertCircle className="w-4 h-4 inline mr-2" />
                        Configura recordatorios a familias y alertas para admins
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Frecuencia de recordatorios a familias (días)</Label>
                      <Select
                        value={formData.frecuencia_recordatorios_dias.toString()}
                        onValueChange={(value) => setFormData({...formData, frecuencia_recordatorios_dias: parseInt(value)})}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">🔕 Desactivado</SelectItem>
                          <SelectItem value="1">📧 Cada día</SelectItem>
                          <SelectItem value="2">📧 Cada 2 días</SelectItem>
                          <SelectItem value="3">📧 Cada 3 días (recomendado)</SelectItem>
                          <SelectItem value="5">📧 Cada 5 días</SelectItem>
                          <SelectItem value="7">📧 Cada semana</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Alertar admins X días antes del vencimiento</Label>
                        <Select
                          value={formData.dias_antes_alerta_admin.toString()}
                          onValueChange={(value) => setFormData({...formData, dias_antes_alerta_admin: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="1">1 día antes</SelectItem>
                            <SelectItem value="2">2 días antes</SelectItem>
                            <SelectItem value="3">3 días antes</SelectItem>
                            <SelectItem value="5">5 días antes</SelectItem>
                            <SelectItem value="7">1 semana antes</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Alertar admins si % pendiente supera</Label>
                        <Select
                          value={formData.porcentaje_alerta_admin.toString()}
                          onValueChange={(value) => setFormData({...formData, porcentaje_alerta_admin: parseInt(value)})}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="30">30%</SelectItem>
                            <SelectItem value="40">40%</SelectItem>
                            <SelectItem value="50">50%</SelectItem>
                            <SelectItem value="60">60%</SelectItem>
                            <SelectItem value="70">70%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 p-3 rounded">
                      <p className="text-xs text-slate-700">
                        📋 Recordatorios cada <strong>{formData.frecuencia_recordatorios_dias === 0 ? 'nunca' : `${formData.frecuencia_recordatorios_dias} día${formData.frecuencia_recordatorios_dias !== 1 ? 's' : ''}`}</strong>. 
                        Alertas a admins <strong>{formData.dias_antes_alerta_admin} día${formData.dias_antes_alerta_admin !== 1 ? 's' : ''}</strong> antes del vencimiento 
                        o si hay más del <strong>{formData.porcentaje_alerta_admin}%</strong> pendiente.
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || uploading || uploadingQR}
                className="bg-orange-600 hover:bg-orange-700"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  document ? "Actualizar" : "Publicar Documento"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}