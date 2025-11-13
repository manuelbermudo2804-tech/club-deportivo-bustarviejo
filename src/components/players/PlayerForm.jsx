import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Upload, X, Loader2, AlertCircle, Lock, Users, Shield, Camera } from "lucide-react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function PlayerForm({ player, onSubmit, onCancel, isSubmitting, isParent = false }) {
  const formRef = useRef(null);
  
  const [currentPlayer, setCurrentPlayer] = useState(player || {
    nombre: "",
    foto_url: "",
    deporte: "Fútbol Pre-Benjamín (Mixto)",
    fecha_nacimiento: "",
    telefono: "",
    email_padre: "",
    telefono_tutor_2: "",
    email_tutor_2: "",
    direccion: "",
    activo: true,
    observaciones: "",
    acepta_politica_privacidad: false,
    fecha_aceptacion_privacidad: null,
    autorizacion_fotografia: ""
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
    
    // Validación de política de privacidad
    if (!currentPlayer.acepta_politica_privacidad) {
      toast.error("Debes aceptar la política de privacidad para continuar");
      return;
    }

    // Validación de autorización de fotografías
    if (!currentPlayer.autorizacion_fotografia) {
      toast.error("Debes seleccionar una opción para la autorización de fotografías");
      return;
    }

    // Añadir fecha de aceptación si no está editando
    if (!player) {
      currentPlayer.fecha_aceptacion_privacidad = new Date().toISOString();
    }

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
                <strong>Modo edición limitado:</strong> Algunos campos no pueden ser modificados. Contacta al administrador si necesitas cambios importantes.
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

            {/* Nombre y Apellidos */}
            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre y Apellidos del Jugador *</Label>
              <Input
                id="nombre"
                value={currentPlayer.nombre}
                onChange={(e) => setCurrentPlayer({...currentPlayer, nombre: e.target.value})}
                required
                placeholder="Ej: Juan García López"
                className="text-lg"
              />
            </div>

            {/* Categoría/Deporte */}
            <div className="space-y-2">
              <Label htmlFor="deporte">Categoría y Deporte *</Label>
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
                  <SelectItem value="Fútbol Pre-Benjamín (Mixto)">
                    ⚽ Fútbol Pre-Benjamín (Mixto) - 2019/2018
                  </SelectItem>
                  <SelectItem value="Fútbol Benjamín (Mixto)">
                    ⚽ Fútbol Benjamín (Mixto) - 2017/2016
                  </SelectItem>
                  <SelectItem value="Fútbol Alevín (Mixto)">
                    ⚽ Fútbol Alevín (Mixto) - 2015/2014
                  </SelectItem>
                  <SelectItem value="Fútbol Infantil (Mixto)">
                    ⚽ Fútbol Infantil (Mixto) - 2013/2012
                  </SelectItem>
                  <SelectItem value="Fútbol Cadete">
                    ⚽ Fútbol Cadete - 2011/2010
                  </SelectItem>
                  <SelectItem value="Fútbol Juvenil">
                    ⚽ Fútbol Juvenil - 2009/2008/2007
                  </SelectItem>
                  <SelectItem value="Fútbol Aficionado">
                    ⚽ Fútbol Aficionado - 2006 y anteriores
                  </SelectItem>
                  <SelectItem value="Fútbol Femenino">
                    ⚽ Fútbol Femenino
                  </SelectItem>
                  <SelectItem value="Baloncesto (Mixto)">
                    🏀 Baloncesto (Mixto)
                  </SelectItem>
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

            {/* Dirección */}
            <div className="space-y-2">
              <Label htmlFor="direccion">Dirección *</Label>
              <Input
                id="direccion"
                value={currentPlayer.direccion}
                onChange={(e) => setCurrentPlayer({...currentPlayer, direccion: e.target.value})}
                placeholder="Calle, número, ciudad..."
                required
              />
            </div>

            {/* Sección Primer Progenitor/Tutor */}
            <div className="space-y-4 border-t border-slate-200 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-orange-600" />
                <h3 className="text-lg font-semibold text-slate-900">Primer Progenitor/Tutor (Cuenta Principal)</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email Primer Progenitor */}
                <div className="space-y-2">
                  <Label htmlFor="email_padre">Correo Electrónico *</Label>
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
                  {!isParent && (
                    <p className="text-xs text-slate-500">
                      Este email tendrá acceso completo a la app (chat, pagos, jugadores)
                    </p>
                  )}
                </div>

                {/* Teléfono Primer Progenitor */}
                <div className="space-y-2">
                  <Label htmlFor="telefono">Teléfono *</Label>
                  <Input
                    id="telefono"
                    type="tel"
                    value={currentPlayer.telefono}
                    onChange={(e) => setCurrentPlayer({...currentPlayer, telefono: e.target.value})}
                    required
                    placeholder="600123456"
                  />
                </div>
              </div>
            </div>

            {/* Sección Segundo Progenitor/Tutor */}
            <div className="space-y-4 border-t border-slate-200 pt-6">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-slate-600" />
                <h3 className="text-lg font-semibold text-slate-900">Segundo Progenitor/Tutor (Opcional)</h3>
              </div>
              
              <Alert className="bg-blue-50 border-blue-200 mb-4">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>💡 Nuevo:</strong> Si añades un segundo email, esa persona también podrá:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Recibir todas las notificaciones (pagos, anuncios, recordatorios)</li>
                    <li>Acceder a la app creando su propia cuenta con ese email</li>
                    <li>Ver y gestionar los jugadores asociados</li>
                    <li>Participar en el chat del grupo</li>
                  </ul>
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Email Segundo Progenitor */}
                <div className="space-y-2">
                  <Label htmlFor="email_tutor_2">Correo Electrónico</Label>
                  <Input
                    id="email_tutor_2"
                    type="email"
                    value={currentPlayer.email_tutor_2}
                    onChange={(e) => setCurrentPlayer({...currentPlayer, email_tutor_2: e.target.value})}
                    placeholder="madre@ejemplo.com"
                  />
                  <p className="text-xs text-slate-500">
                    También tendrá acceso completo a la información del jugador
                  </p>
                </div>

                {/* Teléfono Segundo Progenitor */}
                <div className="space-y-2">
                  <Label htmlFor="telefono_tutor_2">Teléfono</Label>
                  <Input
                    id="telefono_tutor_2"
                    type="tel"
                    value={currentPlayer.telefono_tutor_2}
                    onChange={(e) => setCurrentPlayer({...currentPlayer, telefono_tutor_2: e.target.value})}
                    placeholder="600654321"
                  />
                </div>
              </div>
            </div>

            {/* Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observaciones">Observaciones (opcional)</Label>
              <Textarea
                id="observaciones"
                value={currentPlayer.observaciones}
                onChange={(e) => setCurrentPlayer({...currentPlayer, observaciones: e.target.value})}
                placeholder="Notas adicionales sobre el jugador..."
                rows={3}
              />
            </div>

            {/* AUTORIZACIONES - Solo para nuevos jugadores */}
            {!player && (
              <>
                {/* Autorización Tratamiento de Datos */}
                <div className="space-y-4 border-2 border-red-200 rounded-lg p-6 bg-red-50">
                  <div className="flex items-center gap-2 mb-4">
                    <Shield className="w-6 h-6 text-red-600" />
                    <h3 className="text-lg font-bold text-red-900">AUTORIZACIÓN PARA TRATAMIENTO DE DATOS *</h3>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 text-sm text-slate-800 space-y-3 max-h-64 overflow-y-auto border border-red-200">
                    <p>
                      Autorizo a que <strong>CLUB DEPORTIVO BUSTARVIEJO</strong> conserve en ficheros informáticos y/o en cualquier otro soporte físico los datos personales que le han sido proporcionados de forma voluntaria, y a tratar esa información con el objeto que le han sido facilitados, es decir, para la administración y gestión. Así mismo, el firmante declara conocer y aceptar las normas generales de funcionamiento del CLUB DEPORTIVO.
                    </p>
                    <p>
                      Autorizo al Club Deportivo Bustarviejo a que me envíen información relevante para el desarrollo de las actividades, ofertas y noticias relacionadas con la actividad de dicho club en forma de correo ordinario, correo electrónico, whatsapp o envío sms.
                    </p>
                    <p>
                      Por su parte, CLUB DEPORTIVO BUSTARVIEJO informa que podrá solicitar el contenido exacto de su información personal y podrá ejercer los derechos de rectificación, anulación o modificación que pudiera corresponderle, así como modificar esta autorización en cualquier sentido. Para ello puede ponerse en contacto con la directiva del Club en:
                    </p>
                    <p className="font-semibold text-center">
                      <a href="mailto:cdbustarviejo@gmail.com" className="text-orange-600 hover:text-orange-700">
                        cdbustarviejo@gmail.com
                      </a>
                    </p>
                  </div>

                  <div className="flex items-start gap-3 p-4 bg-white rounded-lg border-2 border-red-300">
                    <Checkbox
                      id="acepta_politica"
                      checked={currentPlayer.acepta_politica_privacidad}
                      onCheckedChange={(checked) => setCurrentPlayer({...currentPlayer, acepta_politica_privacidad: checked})}
                      className="mt-1"
                    />
                    <label
                      htmlFor="acepta_politica"
                      className="text-sm font-semibold text-slate-900 cursor-pointer leading-tight"
                    >
                      HE LEÍDO Y ACEPTO LA POLÍTICA DE PRIVACIDAD DEL CLUB
                    </label>
                  </div>

                  {!currentPlayer.acepta_politica_privacidad && (
                    <Alert className="bg-red-100 border-red-300">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        <strong>⚠️ Obligatorio:</strong> Debes aceptar la política de privacidad para poder registrar al jugador.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                {/* Autorización Fotografías/Videos */}
                <div className="space-y-4 border-2 border-orange-200 rounded-lg p-6 bg-orange-50">
                  <div className="flex items-center gap-2 mb-4">
                    <Camera className="w-6 h-6 text-orange-600" />
                    <h3 className="text-lg font-bold text-orange-900">AUTORIZACIÓN PARA FOTOGRAFÍAS/VIDEOS *</h3>
                  </div>
                  
                  <div className="bg-white rounded-lg p-4 text-sm text-slate-800 space-y-3 max-h-64 overflow-y-auto border border-orange-200">
                    <p>
                      <strong>AUTORIZO</strong> al CLUB DEPORTIVO BUSTARVIEJO a tomar fotografías y/o videos del jugador/a en las diferentes actividades organizadas o a las que acuda el Club, tales como competiciones, entrenamientos, eventos o encuentros deportivos; así mismo, AUTORIZA al Club a publicar dichas imágenes, en las que aparezca individualmente o en grupo, en la página Web del Club, en las cuentas oficiales del Club en Redes Sociales, en carteles publicitarios y en folletos informativos.
                    </p>
                    <p>
                      Por su parte, CLUB DEPORTIVO BUSTARVIEJO informa que podrá modificar esta autorización en cualquier momento. Para ello puede ponerse en contacto en la dirección de mail:
                    </p>
                    <p className="font-semibold text-center">
                      <a href="mailto:cdbustarviejo@gmail.com" className="text-orange-600 hover:text-orange-700">
                        cdbustarviejo@gmail.com
                      </a>
                    </p>
                  </div>

                  <RadioGroup
                    value={currentPlayer.autorizacion_fotografia}
                    onValueChange={(value) => setCurrentPlayer({...currentPlayer, autorizacion_fotografia: value})}
                    className="space-y-3"
                  >
                    <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border-2 border-orange-200 hover:bg-orange-50 transition-colors">
                      <RadioGroupItem value="SI AUTORIZO" id="si-autorizo" />
                      <Label htmlFor="si-autorizo" className="font-semibold cursor-pointer flex-1">
                        SI AUTORIZO
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-4 bg-white rounded-lg border-2 border-orange-200 hover:bg-orange-50 transition-colors">
                      <RadioGroupItem value="NO AUTORIZO" id="no-autorizo" />
                      <Label htmlFor="no-autorizo" className="font-semibold cursor-pointer flex-1">
                        NO AUTORIZO
                      </Label>
                    </div>
                  </RadioGroup>

                  {!currentPlayer.autorizacion_fotografia && (
                    <Alert className="bg-orange-100 border-orange-300">
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                      <AlertDescription className="text-orange-800 text-sm">
                        <strong>⚠️ Obligatorio:</strong> Debes seleccionar una opción para poder registrar al jugador.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </>
            )}

            {/* Información importante */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">📋 Información Importante:</p>
                <ul className="list-disc list-inside space-y-1 text-blue-800">
                  <li>Los campos marcados con * son obligatorios</li>
                  <li>Ambos progenitores recibirán todas las notificaciones por email</li>
                  <li>Para acceder a la app, cada uno debe registrarse con su email respectivo</li>
                  {!player && (
                    <li className="font-semibold text-red-700">Debes aceptar las autorizaciones de protección de datos para continuar</li>
                  )}
                </ul>
              </div>
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
                disabled={isSubmitting || (!player && (!currentPlayer.acepta_politica_privacidad || !currentPlayer.autorizacion_fotografia))}
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