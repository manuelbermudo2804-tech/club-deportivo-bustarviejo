import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, Loader2 } from "lucide-react";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function ValidateAdminInvitation() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    
    if (!token) {
      setError("No se encontró el token de invitación");
      setLoading(false);
      return;
    }
    
    processToken(token);
  }, []);

  const processToken = async (token) => {
    try {
      const invitations = await base44.entities.AdminInvitation.filter({ token });
      
      if (invitations.length === 0) {
        setError('Invitación no encontrada');
        setLoading(false);
        return;
      }
      
      const inv = invitations[0];
      
      if (inv.estado === 'expirada' || inv.estado === 'cancelada') {
        setError('Esta invitación ha expirado o fue cancelada');
        setLoading(false);
        return;
      }
      
      if (inv.fecha_expiracion && new Date(inv.fecha_expiracion) < new Date()) {
        setError('Esta invitación ha expirado');
        setLoading(false);
        return;
      }
      
      // Marcar como aceptada
      if (inv.estado === 'pendiente') {
        await base44.entities.AdminInvitation.update(inv.id, {
          estado: 'aceptada',
          fecha_aceptacion: new Date().toISOString(),
          clicada: true,
          fecha_clic: new Date().toISOString()
        });
      }
      
      // Redirigir al login
      console.log('✅ Redirigiendo al login...');
      window.location.href = 'https://app.cdbustarviejo.com';
      
    } catch (err) {
      console.error("Error:", err);
      setError("Error al procesar la invitación");
      setLoading(false);
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
              <h2 className="text-xl font-bold text-slate-900 mb-2">Invitación no válida</h2>
              <p className="text-slate-600 mb-6">{error}</p>
              <Button onClick={() => window.location.href = 'https://app.cdbustarviejo.com'}>
                Ir a la App
              </Button>
            </>
          ) : (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-orange-600 mx-auto mb-4" />
              <p className="text-slate-900 font-bold text-lg mb-2">Validando invitación...</p>
              <p className="text-slate-600 text-sm">Te redirigiremos en un momento</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}