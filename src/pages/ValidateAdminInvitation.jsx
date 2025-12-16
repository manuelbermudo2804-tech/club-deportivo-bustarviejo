import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import InvitationPWAGuide from "../components/pwa/InvitationPWAGuide";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const APP_URL = "https://app.cdbustarviejo.com";

export default function ValidateAdminInvitation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (!tokenParam) {
      setError("No se encontró el token de invitación");
      setLoading(false);
      return;
    }
    
    validateToken(tokenParam);
  }, []);

  const validateToken = async (tokenValue) => {
    try {
      console.log('🔍 Validando token:', tokenValue);
      const invitations = await base44.asServiceRole.entities.AdminInvitation.filter({ token: tokenValue });
      
      if (invitations.length === 0) {
        setError("Enlace de invitación no válido o no encontrado");
        setLoading(false);
        return;
      }

      const inv = invitations[0];
      console.log('✅ Invitación encontrada:', inv.email_destino);
      
      // Verificar estado
      if (inv.estado === "aceptada") {
        // Ya fue aceptada - redirigir a la app
        console.log('ℹ️ Invitación ya aceptada, redirigiendo a la app');
        window.location.href = 'https://app.cdbustarviejo.com';
        return;
      }
      
      if (inv.estado === "expirada" || inv.estado === "cancelada") {
        setError("Esta invitación ha expirado o fue cancelada. Contacta con el club para solicitar una nueva.");
        setLoading(false);
        return;
      }

      // Verificar expiración
      if (inv.fecha_expiracion && new Date(inv.fecha_expiracion) < new Date()) {
        await base44.asServiceRole.entities.AdminInvitation.update(inv.id, { estado: "expirada" });
        setError("Esta invitación ha expirado. Por favor, contacta con el club para solicitar una nueva.");
        setLoading(false);
        return;
      }

      // Marcar como aceptada y registrar clic
      await base44.asServiceRole.entities.AdminInvitation.update(inv.id, {
        estado: "aceptada",
        fecha_aceptacion: new Date().toISOString(),
        clicada: true,
        fecha_clic: new Date().toISOString()
      });

      console.log('✅ Invitación validada, redirigiendo a la app...');
      
      // Redirigir a la app - Base44 manejará la autenticación
      window.location.href = 'https://app.cdbustarviejo.com';
    } catch (err) {
      console.error("Error validating token:", err);
      setError("Error al validar la invitación");
      setLoading(false);
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
            <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-20 h-20 mx-auto mb-4 rounded-xl shadow-lg" />
            <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-slate-900 mb-2">Invitación no válida</h2>
            <p className="text-slate-600 mb-6">{error}</p>
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                Contacta con el club: cdbustarviejo@gmail.com
              </p>
              <Button 
                onClick={() => {
                  window.location.href = 'https://app.cdbustarviejo.com';
                }} 
                variant="outline"
              >
                Ir a la App
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // No renderizar nada - la validación redirige automáticamente
  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-slate-600">Redirigiendo a la app...</p>
        </CardContent>
      </Card>
    </div>
  );
}