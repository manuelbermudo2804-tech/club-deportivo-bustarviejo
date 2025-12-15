import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Users, Shield, Mail } from "lucide-react";
import { toast } from "sonner";
import InvitationPWAGuide from "../components/pwa/InvitationPWAGuide";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function ValidateSecondParent() {
  const [token, setToken] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  
  const [formData, setFormData] = useState({
    nombre_completo: "",
    telefono: "",
    dni: ""
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (!tokenParam) {
      setError("No se encontró el token de invitación");
      setLoading(false);
      return;
    }
    
    setToken(tokenParam);
    validateToken(tokenParam);
  }, []);

  const validateToken = async (tokenValue) => {
    try {
      const invitations = await base44.entities.SecondParentInvitation.filter({ token: tokenValue });
      
      if (invitations.length === 0) {
        setError("Token de invitación no válido o no encontrado");
        setLoading(false);
        return;
      }

      const inv = invitations[0];
      
      // Verificar estado
      if (inv.estado === "aceptada") {
        setError("Esta invitación ya ha sido utilizada");
        setLoading(false);
        return;
      }
      
      if (inv.estado === "expirada" || inv.estado === "cancelada") {
        setError("Esta invitación ha expirado o fue cancelada");
        setLoading(false);
        return;
      }

      // Verificar expiración
      if (inv.fecha_expiracion && new Date(inv.fecha_expiracion) < new Date()) {
        await base44.entities.SecondParentInvitation.update(inv.id, { estado: "expirada" });
        setError("Esta invitación ha expirado. Por favor, solicita una nueva invitación.");
        setLoading(false);
        return;
      }

      setInvitation(inv);
      setFormData({
        nombre_completo: inv.nombre_destino || "",
        telefono: "",
        dni: ""
      });
      setLoading(false);
    } catch (err) {
      console.error("Error validating token:", err);
      setError("Error al validar la invitación");
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.nombre_completo?.trim()) {
      toast.error("El nombre completo es obligatorio");
      return;
    }
    
    if (!formData.telefono?.trim()) {
      toast.error("El teléfono es obligatorio");
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Actualizar la invitación como aceptada
      await base44.entities.SecondParentInvitation.update(invitation.id, {
        estado: "aceptada",
        fecha_aceptacion: new Date().toISOString(),
        datos_completados: formData
      });

      // 2. Actualizar el jugador con los datos del segundo progenitor
      const player = await base44.entities.Player.filter({ id: invitation.jugador_id });
      if (player.length > 0) {
        await base44.entities.Player.update(invitation.jugador_id, {
          nombre_tutor_2: formData.nombre_completo,
          telefono_tutor_2: formData.telefono,
          // El email ya está guardado
        });
      }

      // 3. Enviar email de confirmación al segundo progenitor
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo",
        to: invitation.email_destino,
        subject: "✅ Registro completado - CD Bustarviejo",
        body: generateConfirmationEmail(formData.nombre_completo, invitation.jugador_nombre)
      });

      // 4. Notificar al primer progenitor
      if (invitation.invitado_por_email) {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: invitation.invitado_por_email,
          subject: `${formData.nombre_completo} ha completado su registro`,
          body: `Hola ${invitation.invitado_por_nombre || ''},\n\n${formData.nombre_completo} ha completado su registro como segundo progenitor de ${invitation.jugador_nombre}.\n\nAhora puede acceder a la aplicación del club con su propia cuenta.\n\nSaludos,\nCD Bustarviejo`
        });
      }

      setIsComplete(true);
      toast.success("¡Registro completado correctamente!");
    } catch (err) {
      console.error("Error completing registration:", err);
      toast.error("Error al completar el registro");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateConfirmationEmail = (nombre, jugadorNombre) => {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background-color:#f1f5f9;">
<table cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;">
<tr>
<td bgcolor="#ea580c" style="padding:30px;text-align:center;">
<img src="${CLUB_LOGO_URL}" alt="CD Bustarviejo" width="80" height="80" style="width:80px;height:80px;border-radius:12px;border:3px solid #ffffff;">
<h1 style="color:#ffffff;margin:15px 0 5px 0;font-size:26px;">CD BUSTARVIEJO</h1>
</td>
</tr>
<tr>
<td style="padding:30px;">
<h2 style="color:#16a34a;text-align:center;">✅ ¡Registro Completado!</h2>
<p style="color:#475569;font-size:15px;line-height:1.6;">
Hola <strong>${nombre}</strong>,
</p>
<p style="color:#475569;font-size:15px;line-height:1.6;">
Tu registro como segundo progenitor de <strong>${jugadorNombre}</strong> se ha completado correctamente.
</p>
<p style="color:#475569;font-size:15px;line-height:1.6;">
Ahora puedes acceder a la aplicación del club con tu cuenta y ver toda la información de tu hijo/a: convocatorias, pagos, calendario, chat del equipo, etc.
</p>
<table align="center" style="margin:25px auto;">
<tr>
<td bgcolor="#ea580c" style="border-radius:8px;">
<a href="https://club-gestion-bustarviejo-1fb134d6.base44.app" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 35px;font-weight:bold;">ACCEDER A LA APP →</a>
</td>
</tr>
</table>
</td>
</tr>
<tr>
<td bgcolor="#1e293b" style="padding:20px;text-align:center;">
<p style="color:#64748b;font-size:12px;margin:0;">cdbustarviejo@gmail.com</p>
</td>
</tr>
</table>
</body>
</html>`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-slate-600">Validando invitación...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Invitación no válida</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <Button onClick={() => window.location.href = "/"} variant="outline">
              Ir al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isComplete) {
    return (
      <>
        <InvitationPWAGuide />
        <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-orange-600 flex items-center justify-center p-4">
          <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-20 h-20 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">¡Registro Completado!</h2>
            <p className="text-slate-600 mb-6">
              Tu registro como segundo progenitor de <strong>{invitation.jugador_nombre}</strong> se ha completado correctamente.
            </p>
            <p className="text-sm text-slate-500 mb-6">
              Recibirás un email de confirmación con los detalles.
            </p>
            <Button 
              onClick={() => window.location.href = "/"} 
              className="bg-orange-600 hover:bg-orange-700"
            >
              Acceder a la App →
            </Button>
          </CardContent>
        </Card>
        </div>
      </>
    );
  }

  return (
    <>
      <InvitationPWAGuide />
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center border-b bg-gradient-to-r from-orange-50 to-green-50">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-20 h-20 mx-auto mb-3 rounded-xl shadow-lg" />
          <CardTitle className="text-2xl text-slate-900">
            👋 Bienvenido/a al CD Bustarviejo
          </CardTitle>
          <p className="text-slate-600 text-sm mt-2">
            Completa tu registro como segundo progenitor
          </p>
        </CardHeader>
        <CardContent className="pt-6">
          <Alert className="mb-6 bg-blue-50 border-blue-200">
            <Users className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800 text-sm">
              <strong>{invitation.invitado_por_nombre || "Un familiar"}</strong> te ha invitado a unirte a la app del club como segundo progenitor de <strong>{invitation.jugador_nombre}</strong>.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email (ya registrado)</Label>
              <Input 
                id="email"
                value={invitation.email_destino}
                disabled
                className="bg-slate-100"
              />
              <p className="text-xs text-slate-500">Este será tu email de acceso a la app</p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nombre">Nombre y Apellidos *</Label>
              <Input 
                id="nombre"
                value={formData.nombre_completo}
                onChange={(e) => setFormData({...formData, nombre_completo: e.target.value})}
                placeholder="Ej: María García López"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="telefono">Teléfono *</Label>
              <Input 
                id="telefono"
                type="tel"
                value={formData.telefono}
                onChange={(e) => setFormData({...formData, telefono: e.target.value})}
                placeholder="600 123 456"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="dni">DNI (opcional)</Label>
              <Input 
                id="dni"
                value={formData.dni}
                onChange={(e) => setFormData({...formData, dni: e.target.value})}
                placeholder="12345678A"
              />
            </div>

            <Alert className="bg-green-50 border-green-200">
              <Shield className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                <strong>✅ Acceso completo:</strong> Al completar este registro tendrás acceso total a la app con tu propia cuenta.
                <p className="mt-2 text-xs">
                  Verás exactamente lo mismo que el primer progenitor y podrás: hacer pagos, confirmar convocatorias, chatear con entrenadores, ver calendario, documentos, galería, etc.
                </p>
              </AlertDescription>
            </Alert>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-orange-600 hover:bg-orange-700 py-6 text-lg font-bold"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Completando registro...</>
              ) : (
                <>✅ Completar Registro</>
              )}
            </Button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            Si tienes problemas, contacta con: cdbustarviejo@gmail.com
          </p>
        </CardContent>
      </Card>
      </div>
    </>
  );
}