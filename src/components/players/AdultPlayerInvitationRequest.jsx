import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, CheckCircle2, Send, UserX } from "lucide-react";
import { toast } from "sonner";
import { CombinedSuccessAnimation } from "@/components/animations/SuccessAnimation";

const CATEGORIAS = [
  "Fútbol Pre-Benjamín (Mixto)",
  "Fútbol Benjamín (Mixto)",
  "Fútbol Alevín (Mixto)",
  "Fútbol Infantil (Mixto)",
  "Fútbol Cadete",
  "Fútbol Juvenil",
  "Fútbol Aficionado",
  "Fútbol Femenino",
  "Baloncesto (Mixto)"
];

export default function AdultPlayerInvitationRequest({ playerAge, playerData, parentEmail, parentName, onCancel }) {
  const [showForm, setShowForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCheckingEmail, setIsCheckingEmail] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [emailAlreadyExists, setEmailAlreadyExists] = useState(false);
  const [existingUserInfo, setExistingUserInfo] = useState(null);
  const [formData, setFormData] = useState({
    nombre_jugador: playerData?.nombre || "",
    email_jugador: "",
    telefono_jugador: playerData?.telefono || "",
    fecha_nacimiento: playerData?.fecha_nacimiento || "",
    categoria_deseada: playerData?.deporte || ""
  });

  // Validación de seguridad para evitar errores
  if (!playerAge || playerAge < 18) {
    return null;
  }

  // Validar email permitiendo caracteres especiales como ñ
  const isValidEmail = (email) => {
    if (!email) return false;
    // Regex que permite ñ y otros caracteres Unicode en emails
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
    return emailRegex.test(email);
  };

  // Verificar si el email ya está registrado
  const checkEmailExists = async (email) => {
    if (!email || !isValidEmail(email)) return;
    
    setIsCheckingEmail(true);
    setEmailAlreadyExists(false);
    setExistingUserInfo(null);
    
    try {
      const [users, players] = await Promise.all([
        base44.entities.User.list(),
        base44.entities.Player.list()
      ]);
      
      const emailLower = email.toLowerCase().trim();
      
      // Buscar en usuarios
      const existingUser = users.find(u => u.email?.toLowerCase() === emailLower);
      
      // Buscar en jugadores (por email_padre o email_jugador)
      const existingPlayer = players.find(p => 
        p.email_padre?.toLowerCase() === emailLower ||
        p.email_jugador?.toLowerCase() === emailLower
      );
      
      if (existingUser || existingPlayer) {
        setEmailAlreadyExists(true);
        setExistingUserInfo({
          isUser: !!existingUser,
          userName: existingUser?.full_name,
          isPlayer: !!existingPlayer,
          playerName: existingPlayer?.nombre
        });
      }
    } catch (error) {
      console.error("Error verificando email:", error);
    } finally {
      setIsCheckingEmail(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre_jugador || !formData.email_jugador) {
      toast.error("Por favor, rellena el nombre y email del jugador");
      return;
    }

    if (!isValidEmail(formData.email_jugador)) {
      toast.error("Por favor, introduce un email válido");
      return;
    }

    if (emailAlreadyExists) {
      toast.error("Este email ya está registrado en el sistema");
      return;
    }

    setIsSubmitting(true);
    try {
      await base44.entities.InvitationRequest.create({
        nombre_jugador: formData.nombre_jugador,
        email_jugador: formData.email_jugador,
        telefono_jugador: formData.telefono_jugador,
        fecha_nacimiento: formData.fecha_nacimiento,
        categoria_deseada: formData.categoria_deseada,
        solicitado_por_nombre: parentName || "Padre/Familiar",
        solicitado_por_email: parentEmail || "",
        estado: "pendiente"
      });

      setSubmitted(true);
      toast.success("✅ Solicitud enviada correctamente");
    } catch (error) {
      console.error("Error creando solicitud:", error);
      toast.error("Error al enviar la solicitud");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <CombinedSuccessAnimation show={true} message="¡Solicitud Enviada!" withConfetti={true} />
        <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl text-center space-y-4 z-[101]">
          <div className="text-6xl">📧</div>
          <h2 className="text-2xl font-bold text-green-700">¡Solicitud Enviada!</h2>
          <p className="text-slate-600">
            Hemos recibido tu solicitud para enviar una invitación a <strong>{formData.nombre_jugador}</strong>.
          </p>
          <p className="text-sm text-slate-500">
            El administrador del club revisará la solicitud y enviará la invitación al email <strong>{formData.email_jugador}</strong>.
          </p>
          <Button onClick={onCancel} className="w-full bg-green-600 hover:bg-green-700">
            Cerrar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Alert className="mb-6 bg-red-50 border-2 border-red-300">
      <AlertCircle className="h-5 w-5 text-red-600" />
      <AlertDescription className="text-red-800">
        <div className="space-y-4">
          <p className="font-bold text-lg text-red-900">
            ⛔ No puedes inscribir a un jugador mayor de 18 años
          </p>
          <p>
            Según la fecha de nacimiento introducida, este jugador tiene <strong>{playerAge} años</strong> y es mayor de edad.
          </p>
          
          <div className="bg-white rounded-lg p-4 border border-red-200">
            <p className="font-bold text-red-900 mb-2">👤 ¿Qué debe hacer el jugador?</p>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>El jugador debe <strong>registrarse en la app con su propio email</strong></li>
              <li>Una vez dentro, debe ir a <strong>"Mis Jugadores"</strong> y registrarse él mismo</li>
              <li>Su panel será automáticamente el <strong>"Panel Jugador"</strong></li>
            </ol>
          </div>

          <div className="bg-amber-50 rounded-lg p-3 border border-amber-200">
            <p className="text-sm text-amber-800">
              <strong>💡 Nota:</strong> Los jugadores mayores de 18 años no tienen descuento de hermanos y se representan a sí mismos.
            </p>
          </div>

          {!showForm ? (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
              <p className="font-bold text-blue-900 mb-2">📧 ¿El jugador necesita una invitación?</p>
              <p className="text-sm text-blue-800 mb-3">
                Puedes solicitar que el club envíe una invitación por email al jugador para que pueda registrarse.
              </p>
              <Button 
                onClick={() => setShowForm(true)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Send className="w-4 h-4 mr-2" />
                Solicitar invitación para el jugador
              </Button>
            </div>
          ) : (
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 space-y-4">
              <p className="font-bold text-blue-900">📧 Solicitar invitación para el jugador</p>
              <form onSubmit={handleSubmit} className="space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-sm text-blue-900">Nombre del jugador *</Label>
                    <Input
                      value={formData.nombre_jugador}
                      onChange={(e) => setFormData({...formData, nombre_jugador: e.target.value})}
                      placeholder="Nombre completo"
                      required
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-blue-900">Email del jugador *</Label>
                    <div className="relative">
                      <Input
                        type="email"
                        value={formData.email_jugador}
                        onChange={(e) => setFormData({...formData, email_jugador: e.target.value})}
                        onBlur={(e) => checkEmailExists(e.target.value)}
                        placeholder="email@ejemplo.com"
                        required
                        className={`bg-white ${emailAlreadyExists ? 'border-red-500 border-2' : ''}`}
                      />
                      {isCheckingEmail && (
                        <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                      )}
                    </div>
                    {emailAlreadyExists && existingUserInfo && (
                      <div className="mt-2 p-3 bg-red-100 border border-red-300 rounded-lg">
                        <div className="flex items-start gap-2">
                          <UserX className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="font-bold text-red-900 text-sm">⚠️ Este email ya está registrado</p>
                            {existingUserInfo.isUser && (
                              <p className="text-xs text-red-800">
                                Usuario existente: <strong>{existingUserInfo.userName}</strong>
                              </p>
                            )}
                            {existingUserInfo.isPlayer && (
                              <p className="text-xs text-red-800">
                                Jugador existente: <strong>{existingUserInfo.playerName}</strong>
                              </p>
                            )}
                            <p className="text-xs text-red-700 mt-1">
                              El jugador ya puede acceder a la app con este email. No necesita invitación.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-blue-900">Teléfono del jugador</Label>
                    <Input
                      type="tel"
                      value={formData.telefono_jugador}
                      onChange={(e) => setFormData({...formData, telefono_jugador: e.target.value})}
                      placeholder="600123456"
                      className="bg-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm text-blue-900">Categoría deseada</Label>
                    <Select 
                      value={formData.categoria_deseada} 
                      onValueChange={(v) => setFormData({...formData, categoria_deseada: v})}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Seleccionar..." />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIAS.map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                    disabled={isSubmitting}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="submit"
                    className="bg-blue-600 hover:bg-blue-700"
                    disabled={isSubmitting || emailAlreadyExists || isCheckingEmail}
                  >
                    {isSubmitting ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
                    ) : (
                      <><Send className="w-4 h-4 mr-2" />Enviar solicitud</>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          <p className="text-sm text-red-700">
            Si necesitas cambiar la fecha de nacimiento, hazlo arriba en el formulario.
          </p>
        </div>
      </AlertDescription>
    </Alert>
  );
}