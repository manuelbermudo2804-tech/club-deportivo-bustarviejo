import React, { useState } from "react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, X, Loader2 } from "lucide-react";

export default function PlayerForm({ player, onSubmit, onCancel, isSubmitting }) {
  const [formData, setFormData] = useState(player || {
    nombre: "",
    foto_url: "",
    deporte: "Fútbol",
    fecha_nacimiento: "",
    dni: "",
    telefono: "",
    email: "",
    email_padre: "",
    direccion: "",
    categoria: "",
    posicion: "",
    numero_camiseta: "",
    activo: true,
    observaciones: ""
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      handleChange("foto_url", file_url);
    } catch (error) {
      console.error("Error uploading photo:", error);
    }
    setUploadingPhoto(false);
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
      <Card className="border-none shadow-xl bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-2xl">
            {player ? "Editar Jugador" : "Nuevo Jugador"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative">
                {formData.foto_url ? (
                  <div className="relative">
                    <img
                      src={formData.foto_url}
                      alt="Foto del jugador"
                      className="w-32 h-32 rounded-full object-cover border-4 border-orange-100"
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="icon"
                      className="absolute -top-2 -right-2 rounded-full h-8 w-8"
                      onClick={() => handleChange("foto_url", "")}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-32 h-32 rounded-full bg-slate-100 flex items-center justify-center border-4 border-dashed border-slate-300">
                    <Upload className="w-8 h-8 text-slate-400" />
                  </div>
                )}
              </div>
              <div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  id="photo-upload"
                  disabled={uploadingPhoto}
                />
                <label htmlFor="photo-upload">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={uploadingPhoto}
                    onClick={() => document.getElementById('photo-upload').click()}
                  >
                    {uploadingPhoto ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Subiendo...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Subir Foto
                      </>
                    )}
                  </Button>
                </label>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => handleChange("nombre", e.target.value)}
                  required
                  placeholder="Nombre y apellidos"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="deporte">Deporte *</Label>
                <Select
                  value={formData.deporte}
                  onValueChange={(value) => handleChange("deporte", value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fútbol">⚽ Fútbol</SelectItem>
                    <SelectItem value="Baloncesto">🏀 Baloncesto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento</Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={formData.fecha_nacimiento}
                  onChange={(e) => handleChange("fecha_nacimiento", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => handleChange("dni", e.target.value)}
                  placeholder="12345678X"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  value={formData.telefono}
                  onChange={(e) => handleChange("telefono", e.target.value)}
                  placeholder="+34 600 000 000"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email del Jugador</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="email@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email_padre">Email del Padre/Tutor *</Label>
                <Input
                  id="email_padre"
                  type="email"
                  value={formData.email_padre}
                  onChange={(e) => handleChange("email_padre", e.target.value)}
                  placeholder="padre@ejemplo.com"
                  required
                />
                <p className="text-xs text-slate-500">
                  Se usará para enviar recordatorios de pago
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direccion">Dirección</Label>
                <Input
                  id="direccion"
                  value={formData.direccion}
                  onChange={(e) => handleChange("direccion", e.target.value)}
                  placeholder="Dirección completa"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={formData.categoria}
                  onValueChange={(value) => handleChange("categoria", value)}
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

              <div className="space-y-2">
                <Label htmlFor="posicion">Posición</Label>
                <Select
                  value={formData.posicion}
                  onValueChange={(value) => handleChange("posicion", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona posición" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Portero">Portero</SelectItem>
                    <SelectItem value="Defensa">Defensa</SelectItem>
                    <SelectItem value="Centrocampista">Centrocampista</SelectItem>
                    <SelectItem value="Delantero">Delantero</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="numero_camiseta">Número de Camiseta</Label>
                <Input
                  id="numero_camiseta"
                  type="number"
                  value={formData.numero_camiseta}
                  onChange={(e) => handleChange("numero_camiseta", parseInt(e.target.value))}
                  placeholder="1-99"
                  min="1"
                  max="99"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="activo"
                  checked={formData.activo}
                  onCheckedChange={(checked) => handleChange("activo", checked)}
                />
                <Label htmlFor="activo">Jugador Activo</Label>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={formData.observaciones}
                onChange={(e) => handleChange("observaciones", e.target.value)}
                placeholder="Notas adicionales sobre el jugador..."
                rows={3}
              />
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
                  player ? "Actualizar" : "Crear Jugador"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}