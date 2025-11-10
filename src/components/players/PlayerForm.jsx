import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Upload, Loader2 } from "lucide-react";

export default function PlayerForm({ player, onSubmit, onCancel, isSubmitting }) {
  const [currentPlayer, setCurrentPlayer] = useState(player || {
    nombre: "",
    foto_url: "",
    deporte: "Fútbol Masculino",
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

  const [uploading, setUploading] = useState(false);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setCurrentPlayer({ ...currentPlayer, foto_url: file_url });
    } catch (error) {
      console.error("Error uploading photo:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(currentPlayer);
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
            {player ? "Editar Jugador" : "Nuevo Jugador"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre */}
              <div className="space-y-2">
                <Label>Nombre Completo *</Label>
                <Input
                  placeholder="Nombre del jugador"
                  value={currentPlayer.nombre}
                  onChange={(e) => setCurrentPlayer({ ...currentPlayer, nombre: e.target.value })}
                  required
                />
              </div>

              {/* Deporte */}
              <div className="space-y-2">
                <Label>Deporte *</Label>
                <Select
                  value={currentPlayer.deporte}
                  onValueChange={(value) => setCurrentPlayer({ ...currentPlayer, deporte: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona deporte" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fútbol Masculino">⚽ Fútbol Masculino</SelectItem>
                    <SelectItem value="Fútbol Femenino">⚽ Fútbol Femenino</SelectItem>
                    <SelectItem value="Baloncesto">🏀 Baloncesto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <Label>Categoría *</Label>
                <Select
                  value={currentPlayer.categoria}
                  onValueChange={(value) => setCurrentPlayer({ ...currentPlayer, categoria: value })}
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

              {/* Fecha de Nacimiento */}
              <div className="space-y-2">
                <Label>Fecha de Nacimiento</Label>
                <Input
                  type="date"
                  value={currentPlayer.fecha_nacimiento}
                  onChange={(e) => setCurrentPlayer({ ...currentPlayer, fecha_nacimiento: e.target.value })}
                />
              </div>

              {/* DNI */}
              <div className="space-y-2">
                <Label>DNI</Label>
                <Input
                  placeholder="DNI del jugador"
                  value={currentPlayer.dni}
                  onChange={(e) => setCurrentPlayer({ ...currentPlayer, dni: e.target.value })}
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label>Teléfono</Label>
                <Input
                  placeholder="Teléfono de contacto"
                  value={currentPlayer.telefono}
                  onChange={(e) => setCurrentPlayer({ ...currentPlayer, telefono: e.target.value })}
                />
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="Email del jugador"
                  value={currentPlayer.email}
                  onChange={(e) => setCurrentPlayer({ ...currentPlayer, email: e.target.value })}
                />
              </div>

              {/* Email Padre */}
              <div className="space-y-2">
                <Label>Email Padre/Tutor</Label>
                <Input
                  type="email"
                  placeholder="Email del padre/tutor"
                  value={currentPlayer.email_padre}
                  onChange={(e) => setCurrentPlayer({ ...currentPlayer, email_padre: e.target.value })}
                />
              </div>

              {/* Posición */}
              <div className="space-y-2">
                <Label>Posición</Label>
                <Select
                  value={currentPlayer.posicion}
                  onValueChange={(value) => setCurrentPlayer({ ...currentPlayer, posicion: value })}
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

              {/* Número de Camiseta */}
              <div className="space-y-2">
                <Label>Número de Camiseta</Label>
                <Input
                  type="number"
                  placeholder="Ej: 10"
                  value={currentPlayer.numero_camiseta}
                  onChange={(e) => setCurrentPlayer({ ...currentPlayer, numero_camiseta: e.target.value })}
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label>Dirección</Label>
              <Input
                placeholder="Dirección completa"
                value={currentPlayer.direccion}
                onChange={(e) => setCurrentPlayer({ ...currentPlayer, direccion: e.target.value })}
              />
            </div>

            {/* Foto */}
            <div className="space-y-2">
              <Label>Foto del Jugador</Label>
              <div className="flex items-center gap-4">
                {currentPlayer.foto_url && (
                  <img
                    src={currentPlayer.foto_url}
                    alt="Foto del jugador"
                    className="w-20 h-20 rounded-lg object-cover border-2 border-slate-200"
                  />
                )}
                <div className="flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                    id="photo-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="photo-upload">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={uploading}
                      onClick={() => document.getElementById('photo-upload').click()}
                      className="w-full"
                    >
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Subiendo...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          {currentPlayer.foto_url ? "Cambiar Foto" : "Subir Foto"}
                        </>
                      )}
                    </Button>
                  </label>
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label>Observaciones</Label>
              <Textarea
                placeholder="Notas adicionales sobre el jugador..."
                value={currentPlayer.observaciones}
                onChange={(e) => setCurrentPlayer({ ...currentPlayer, observaciones: e.target.value })}
                rows={3}
              />
            </div>

            {/* Activo */}
            <div className="flex items-center justify-between p-4 rounded-lg bg-slate-50">
              <div>
                <Label className="text-base font-medium">Jugador Activo</Label>
                <p className="text-sm text-slate-500">¿El jugador está actualmente en el club?</p>
              </div>
              <Switch
                checked={currentPlayer.activo}
                onCheckedChange={(checked) => setCurrentPlayer({ ...currentPlayer, activo: checked })}
              />
            </div>

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
                  player ? "Actualizar Jugador" : "Crear Jugador"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}