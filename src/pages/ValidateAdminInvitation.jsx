import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";
import InvitationPWAGuide from "../components/pwa/InvitationPWAGuide";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

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
      console.log('🔍 Validando token admin:', tokenValue);
      
      const result = await base44.functions.invoke('validateInvitationToken', {
        token: tokenValue,
        invitationType: 'admin'
      });
      
      if (!result.data.valid) {
        setError(result.data.error || 'Token no válido');
        setLoading(false);
        return;
      }
      
      console.log('✅ Token válido, redirigiendo a la app...');
      
      // Redirigir directamente a la app
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
            <p className="text-slate-600">Validando y redirigiendo...</p>
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
                onClick={() => window.location.href = 'https://app.cdbustarviejo.com'} 
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