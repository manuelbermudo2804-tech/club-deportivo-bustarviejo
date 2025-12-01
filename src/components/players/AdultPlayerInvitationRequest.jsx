import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertCircle, Loader2, CheckCircle2, Send } from "lucide-react";
import { toast } from "sonner";

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
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    nombre_jugador: playerData?.nombre || "",
    email_jugador: "",
    telefono_jugador: playerData?.telefono || "",
    fecha_nacimiento: playerData?.fecha_nacimiento || "",
    categoria_deseada: playerData?.deporte || ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre_jugador || !formData.email_jugador) {
      toast.error("Por favor, rellena el nombre y email del jugador");
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
      <Alert className="mb-6 bg-green-50 border-2 border-green-300">
        <CheckCircle2 className="h-5 w-5 text-green-600" />
        <AlertDescription className="text-green-800">
          <div className="space-y-3">
            <p className="font-bold text-lg text-green-900">
              ✅ ¡Solicitud enviada!
            </p>
            <p>
              Hemos recibido tu solicitud para enviar una invitación a <strong>{formData.nombre_jugador}</strong>.
            </p>
            <p className="text-sm">
              El administrador del club revisará la solicitud y enviará la invitación al email <strong>{formData.email_jugador}</strong>.
            </p>
            <Button onClick={onCancel} variant="outline" className="mt-2">
              Volver
            </Button>
          </div>
        </AlertDescription>
      </Alert>
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
                    <Input
                      type="email"
                      value={formData.email_jugador}
                      onChange={(e) => setFormData({...formData, email_jugador: e.target.value})}
                      placeholder="email@ejemplo.com"
                      required
                      className="bg-white"
                    />
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
                    disabled={isSubmitting}
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