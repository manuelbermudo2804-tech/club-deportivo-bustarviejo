import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

export default function ValidateAdminInvitation() {
  const [status, setStatus] = useState("validating");
  const [error, setError] = useState(null);

  useEffect(() => {
    const validateAndRedirect = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const token = urlParams.get('invitation_token');

        if (!token) {
          setError("Token de invitación no encontrado");
          setStatus("error");
          return;
        }

        // Verificar que el token existe y es válido
        const invitations = await base44.entities.AdminInvitation.filter({ token });

        if (invitations.length === 0) {
          setError("Token de invitación inválido o expirado");
          setStatus("error");
          return;
        }

        const invitation = invitations[0];

        // Verificar si ya expiró
        if (invitation.fecha_expiracion && new Date(invitation.fecha_expiracion) < new Date()) {
          setError("Esta invitación ha expirado");
          setStatus("error");
          return;
        }

        // Verificar si ya fue aceptada
        if (invitation.estado === "aceptada") {
          setStatus("success");
          setTimeout(() => {
            window.location.href = "https://app.cdbustarviejo.com";
          }, 2000);
          return;
        }

        // Guardar token en localStorage para procesarlo después del login
        localStorage.setItem('pending_invitation_token', token);
        localStorage.setItem('pending_invitation_type', 'admin_invitation');

        setStatus("redirecting");

        // Redirigir a Base44 login con returnUrl
        setTimeout(() => {
          const loginUrl = 'https://app.base44.com/login';
          const returnUrl = encodeURIComponent('https://app.cdbustarviejo.com');
          window.location.href = `${loginUrl}?nextUrl=${returnUrl}`;
        }, 1500);

      } catch (err) {
        console.error("Error validando invitación:", err);
        setError("Error al validar la invitación");
        setStatus("error");
      }
    };

    validateAndRedirect();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-600 via-orange-700 to-green-700 flex items-center justify-center p-6">
      <Card className="max-w-md w-full border-none shadow-2xl">
        <CardContent className="p-8 text-center space-y-6">
          <div className="flex justify-center mb-4">
            <img 
              src={CLUB_LOGO_URL} 
              alt="CD Bustarviejo"
              className="w-24 h-24 rounded-2xl shadow-xl object-cover"
            />
          </div>

          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">
              CD Bustarviejo
            </h1>
            <p className="text-slate-600">Validando invitación...</p>
          </div>

          {status === "validating" && (
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-12 h-12 text-orange-600 animate-spin" />
              <p className="text-slate-700">Verificando tu invitación</p>
            </div>
          )}

          {status === "redirecting" && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <p className="text-slate-700">✅ Invitación válida</p>
              <p className="text-sm text-slate-600">Redirigiendo al registro...</p>
            </div>
          )}

          {status === "success" && (
            <div className="flex flex-col items-center gap-4">
              <CheckCircle2 className="w-12 h-12 text-green-600" />
              <p className="text-slate-700">✅ Ya estás registrado</p>
              <p className="text-sm text-slate-600">Redirigiendo a la app...</p>
            </div>
          )}

          {status === "error" && (
            <div className="flex flex-col items-center gap-4">
              <AlertCircle className="w-12 h-12 text-red-600" />
              <p className="text-red-700 font-medium">❌ {error}</p>
              <p className="text-sm text-slate-600">
                Contacta con el club si necesitas ayuda
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}