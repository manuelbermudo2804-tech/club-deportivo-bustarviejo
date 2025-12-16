import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2, CheckCircle2 } from "lucide-react";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function ValidateSecondParent() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      setError("No se encontró el token de invitación");
      setLoading(false);
      return;
    }
    
    processInvitation(token);
  }, []);

  const processInvitation = async (token) => {
    try {
      console.log('🔍 Procesando invitación...');
      
      // Llamar a la función que valida y acepta la invitación
      const result = await base44.functions.invoke('acceptSecondParentInvitation', { token });
      
      if (result.data.error) {
        setError(result.data.error);
        setLoading(false);
        return;
      }
      
      console.log('✅ Invitación aceptada');
      setSuccess(true);
      setLoading(false);
      
      // Redirigir después de 2 segundos
      setTimeout(() => {
        window.location.href = 'https://app.cdbustarviejo.com';
      }, 2000);
      
    } catch (err) {
      console.error("Error:", err);
      setError("Error al procesar la invitación");
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-20 h-20 mx-auto mb-4 rounded-xl shadow-lg" />
            <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
            <p className="text-slate-600 font-medium">Validando invitación...</p>
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
            <Button onClick={() => window.location.href = 'https://app.cdbustarviejo.com'}>
              Ir a la App
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-600 via-green-700 to-green-800 flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-2 border-green-400">
          <CardContent className="py-12 text-center">
            <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-20 h-20 mx-auto mb-4 rounded-xl shadow-lg" />
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">✅ ¡Listo!</h2>
            <p className="text-slate-600 mb-4">Invitación aceptada correctamente</p>
            <p className="text-sm text-slate-500">Redirigiendo a la app...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}