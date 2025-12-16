import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Users, Shield } from "lucide-react";
import { toast } from "sonner";
import InvitationPWAGuide from "../components/pwa/InvitationPWAGuide";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function ValidateSecondParent() {
  const [token, setToken] = useState(null);
  const [invitation, setInvitation] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      console.log('🔍 Validando token:', tokenValue);
      
      const result = await base44.functions.invoke('validateInvitationToken', {
        token: tokenValue,
        invitationType: 'second_parent'
      });
      
      if (!result.data.valid) {
        setError(result.data.error || 'Token no válido');
        setLoading(false);
        return;
      }
      
      if (result.data.alreadyAccepted) {
        console.log('ℹ️ Ya aceptada, redirigiendo...');
        window.location.href = 'https://app.cdbustarviejo.com';
        return;
      }
      
      console.log('✅ Token válido');
      setInvitation(result.data.invitation);
      setFormData({
        nombre_completo: result.data.invitation.nombre_destino || "",
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
      const result = await base44.functions.invoke('completeSecondParentRegistration', {
        token,
        formData
      });

      if (result.data.success) {
        console.log('✅ Registro completado');
        window.location.href = 'https://app.cdbustarviejo.com';
      } else {
        toast.error(result.data.error || 'Error al completar el registro');
        setIsSubmitting(false);
      }
    } catch (err) {
      console.error("Error:", err);
      toast.error("Error al completar el registro");
      setIsSubmitting(false);
    }
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
            <Button 
              onClick={() => window.location.href = 'https://app.cdbustarviejo.com'} 
              variant="outline"
            >
              Ir a la App
            </Button>
          </CardContent>
        </Card>
      </div>
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
              <strong>{invitation.invitado_por_nombre || "Un familiar"}</strong> te ha invitado como segundo progenitor de <strong>{invitation.jugador_nombre}</strong>.
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
              <p className="text-xs text-slate-500">Este será tu email de acceso</p>
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
                <strong>✅ Acceso completo:</strong> Tendrás acceso total a la app con tu propia cuenta.
              </AlertDescription>
            </Alert>

            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-orange-600 hover:bg-orange-700 py-6 text-lg font-bold"
            >
              {isSubmitting ? (
                <><Loader2 className="w-5 h-5 mr-2 animate-spin" />Completando...</>
              ) : (
                <>✅ Completar Registro</>
              )}
            </Button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            Contacto: cdbustarviejo@gmail.com
          </p>
        </CardContent>
      </Card>
      </div>
    </>
  );
}