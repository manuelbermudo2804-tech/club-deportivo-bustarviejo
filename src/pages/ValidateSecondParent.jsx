import React, { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function ValidateSecondParent() {
  useEffect(() => {
    // Obtener token y redirigir a la app principal
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (token) {
      // Redirigir a la app con el token como parámetro
      window.location.href = `https://app.cdbustarviejo.com?invitation_token=${token}&type=second_parent`;
    } else {
      window.location.href = 'https://app.cdbustarviejo.com';
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardContent className="py-12 text-center">
          <img src={CLUB_LOGO_URL} alt="CD Bustarviejo" className="w-20 h-20 mx-auto mb-4 rounded-xl shadow-lg" />
          <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-slate-900 font-bold">Redirigiendo...</p>
        </CardContent>
      </Card>
    </div>
  );
}