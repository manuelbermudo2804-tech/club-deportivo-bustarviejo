import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle, Loader2 } from "lucide-react";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function ValidateSecondParent() {
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      setError("No se encontró el token de invitación");
      return;
    }
    
    validateAndRedirect(token);
  }, []);

  const validateAndRedirect = async (token) => {
    try {
      const result = await base44.functions.invoke('validateSecondParent', { token });
      
      if (result.data.error) {
        setError(result.data.error);
        return;
      }
      
      // Redirigir a la app
      window.location.href = 'https://app.cdbustarviejo.com';
      
    } catch (err) {
      console.error("Error:", err);
      setError("Error al validar la invitación");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-20 h-20 mx-auto mb-4 rounded-xl shadow-lg" />
          
          {error ? (
            <>
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-slate-900 mb-2">Error</h2>
              <p className="text-slate-600">{error}</p>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
              <p className="text-slate-900 font-bold">Validando...</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}