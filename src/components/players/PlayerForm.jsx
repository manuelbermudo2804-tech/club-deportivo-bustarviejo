import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Upload, X, Loader2, AlertCircle, Lock } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PlayerForm({ player, onSubmit, onCancel, isSubmitting, isParent = false }) {
  const formRef = useRef(null);
  
  const [currentPlayer, setCurrentPlayer] = useState(player || {
    nombre: "",
    foto_url: "",
    deporte: "Fútbol Masculino",
    fecha_nacimiento: "",
    dni: "",
    telefono: "",
    email_padre: "",
    direccion: "",
    categoria: "",
    posicion: "",
    numero_camiseta: "",
    activo: true,
    observaciones: ""
  });

  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);

  // Scroll al formulario cuando se monta
  useEffect(() => {
    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  // Obtener usuario actual (solo para padres)
  useEffect(() => {
    const fetchUser = async () => {
      if (isParent) {
        try {
          const user = await base44.auth.me();
          setCurrentUser(user);
          // Si es un nuevo jugador, establecer email del padre automáticamente
          if (!player) {
            setCurrentPlayer(prev => ({
              ...prev,
              email_padre: user.email
            }));
          }
        } catch (error) {
          console.error("Error fetching user:", error);
        }
      }
    };
    fetchUser();
  }, [isParent, player]);

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      setCurrentPlayer({
        ...currentPlayer,
        foto_url: response.file_url
      });
      toast.success("Foto subida correctamente");
    } catch (error) {
      console.error("Error uploading photo:", error);
      toast.error("Error al subir la foto");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(currentPlayer);
  };

  return (
    <motion.div
      ref={formRef}
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-none shadow-xl bg-white/90 backdrop-blur-sm">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl">
              {player ? "Editar Jugador" : "Nuevo Jugador"}
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {isParent && !player && (
            <Alert className="mb-6 bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Nuevo registro:</strong> Estás registrando un nuevo jugador asociado a tu cuenta ({currentUser?.email})
              </AlertDescription>
            </Alert>
          )}

          {isParent && player && (
            <Alert className="mb-6 bg-orange-50 border-orange-200">
              <Lock className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Modo edición limitado:</strong> Algunos campos no pueden ser modificados. Contacta al administrador si necesitas cambiar deporte, categoría o email.
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Foto del Jugador */}
            <div className="flex flex-col items-center space-y-4">
              <div className="relative">
                {currentPlayer.foto_url ? (
                  <img
                    src={currentPlayer.foto_url}
                    alt="Foto del jugador"
                    className="w-32 h-32 rounded-full object-cover border-4 border-orange-200 shadow-lg"
                  />
                ) : (
                  <div className="w-32 h-32 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-4xl font-bold shadow-lg">
                    {currentPlayer.nombre ? currentPlayer.nombre.charAt(0).toUpperCase() : "?"}
                  </div>
                )}
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
                    size="sm"
                    variant="outline"
                    className="absolute bottom-0 right-0 rounded-full"
                    disabled={uploadingPhoto}
                    onClick={() => document.getElementById('photo-upload').click()}
                  >
                    {uploadingPhoto ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                  </Button>
                </label>
              </div>
              <p className="text-sm text-slate-600">Haz clic en el icono para subir una foto</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Nombre */}
              <div className="space-y-2">
                <Label htmlFor="nombre">Nombre Completo *</Label>
                <Input
                  id="nombre"
                  value={currentPlayer.nombre}
                  onChange={(e) => setCurrentPlayer({...currentPlayer, nombre: e.target.value})}
                  required
                  placeholder="Ej: Juan García López"
                />
              </div>

              {/* Deporte */}
              <div className="space-y-2">
                <Label htmlFor="deporte">Deporte *</Label>
                <Select
                  value={currentPlayer.deporte}
                  onValueChange={(value) => setCurrentPlayer({...currentPlayer, deporte: value})}
                  required
                  disabled={isParent && player}
                >
                  <SelectTrigger className={isParent && player ? "bg-slate-100" : ""}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Fútbol Masculino">Fútbol Masculino ⚽</SelectItem>
                    <SelectItem value="Fútbol Femenino">Fútbol Femenino ⚽</SelectItem>
                    <SelectItem value="Baloncesto">Baloncesto 🏀</SelectItem>
                  </SelectContent>
                </Select>
                {isParent && player && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Solo el administrador puede modificar este campo
                  </p>
                )}
              </div>

              {/* Fecha de Nacimiento */}
              <div className="space-y-2">
                <Label htmlFor="fecha_nacimiento">Fecha de Nacimiento *</Label>
                <Input
                  id="fecha_nacimiento"
                  type="date"
                  value={currentPlayer.fecha_nacimiento}
                  onChange={(e) => setCurrentPlayer({...currentPlayer, fecha_nacimiento: e.target.value})}
                  required
                />
              </div>

              {/* DNI */}
              <div className="space-y-2">
                <Label htmlFor="dni">DNI</Label>
                <Input
                  id="dni"
                  value={currentPlayer.dni}
                  onChange={(e) => setCurrentPlayer({...currentPlayer, dni: e.target.value})}
                  placeholder="12345678A"
                />
              </div>

              {/* Teléfono */}
              <div className="space-y-2">
                <Label htmlFor="telefono">Teléfono</Label>
                <Input
                  id="telefono"
                  type="tel"
                  value={currentPlayer.telefono}
                  onChange={(e) => setCurrentPlayer({...currentPlayer, telefono: e.target.value})}
                  placeholder="600123456"
                />
              </div>

              {/* Email Padre */}
              <div className="space-y-2">
                <Label htmlFor="email_padre">Email del Padre/Tutor *</Label>
                <Input
                  id="email_padre"
                  type="email"
                  value={currentPlayer.email_padre}
                  onChange={(e) => setCurrentPlayer({...currentPlayer, email_padre: e.target.value})}
                  required
                  placeholder="padre@ejemplo.com"
                  disabled={isParent}
                  className={isParent ? "bg-slate-100" : ""}
                />
                {isParent && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Este es tu email y no puede ser modificado
                  </p>
                )}
              </div>

              {/* Categoría */}
              <div className="space-y-2">
                <Label htmlFor="categoria">Categoría *</Label>
                <Select
                  value={currentPlayer.categoria}
                  onValueChange={(value) => setCurrentPlayer({...currentPlayer, categoria: value})}
                  required
                  disabled={isParent && player}
                >
                  <SelectTrigger className={isParent && player ? "bg-slate-100" : ""}>
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
                {isParent && player && (
                  <p className="text-xs text-slate-500 flex items-center gap-1">
                    <Lock className="w-3 h-3" /> Solo el administrador puede modificar este campo
                  </p>
                )}
              </div>

              {/* Posición */}
              <div className="space-y-2">
                <Label htmlFor="posicion">Posición</Label>
                <Select
                  value={currentPlayer.posicion}
                  onValueChange={(value) => setCurrentPlayer({...currentPlayer, posicion: value})}
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
                <Label htmlFor="numero_camiseta">Número de Camiseta</Label>
                <Input
                  id="numero_camiseta"
                  type="number"
                  value={currentPlayer.numero_camiseta}
                  onChange={(e) => setCurrentPlayer({...currentPlayer, numero_camiseta: parseInt(e.target.value) || ""})}
                  placeholder="10"
                  min="1"
                  max="99"
                />
              </div>
            </div>

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección</Label>
              <Input
                id="direccion"
                value={currentPlayer.direccion}
                onChange={(e) => setCurrentPlayer({...currentPlayer, direccion: e.target.value})}
                placeholder="Calle, número, ciudad..."
              />
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones</Label>
              <Textarea
                id="observaciones"
                value={currentPlayer.observaciones}
                onChange={(e) => setCurrentPlayer({...currentPlayer, observaciones: e.target.value})}
                placeholder="Notas adicionales sobre el jugador..."
                rows={3}
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
                  player ? "Actualizar Jugador" : "Registrar Jugador"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}