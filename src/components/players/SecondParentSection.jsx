import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Users, AlertCircle, ChevronDown, ChevronUp, Mail, Clock, Send, Loader2, Sparkles, Info, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const APP_URL = window.location.origin;

// Generar UUID v4
const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

export default function SecondParentSection({ 
  currentPlayer, 
  setCurrentPlayer, 
  existingFamilyPlayers,
  isEditing 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [existingSecondParent, setExistingSecondParent] = useState(null);
  const [pendingInvitation, setPendingInvitation] = useState(null);
  const [isSendingInvitation, setIsSendingInvitation] = useState(false);
  
  // Detectar si ya hay segundo progenitor en otros hermanos
  const segundoProgenitorEnOtrosHermanos = existingFamilyPlayers?.some(p => 
    p.email_tutor_2 && p.email_tutor_2.trim() !== ""
  );
  
  const datosSegundoProgenitorHermano = existingFamilyPlayers?.find(p => 
    p.email_tutor_2 && p.email_tutor_2.trim() !== ""
  );

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(console.error);
  }, []);

  // Buscar si ya existe un segundo progenitor registrado en otros hijos
  useEffect(() => {
    if (existingFamilyPlayers.length > 0 && currentUser) {
      const playerWithSecondParent = existingFamilyPlayers.find(p => 
        p.email_tutor_2 && 
        p.email_tutor_2 !== currentUser.email &&
        p.nombre_tutor_2
      );
      
      if (playerWithSecondParent) {
        setExistingSecondParent({
          nombre: playerWithSecondParent.nombre_tutor_2,
          email: playerWithSecondParent.email_tutor_2,
          telefono: playerWithSecondParent.telefono_tutor_2
        });
      }
    }
  }, [existingFamilyPlayers, currentUser]);

  // Buscar invitaciones pendientes para este jugador
  useEffect(() => {
    if (currentPlayer.id && currentPlayer.email_tutor_2) {
      checkPendingInvitation();
    }
  }, [currentPlayer.id, currentPlayer.email_tutor_2]);

  const checkPendingInvitation = async () => {
    try {
      const invitations = await base44.entities.SecondParentInvitation.filter({
        jugador_id: currentPlayer.id,
        estado: "pendiente"
      });
      if (invitations.length > 0) {
        setPendingInvitation(invitations[0]);
      }
    } catch (err) {
      console.error("Error checking invitations:", err);
    }
  };

  // Usar datos del segundo progenitor existente
  const useExistingSecondParent = () => {
    if (existingSecondParent) {
      setCurrentPlayer({
        ...currentPlayer,
        nombre_tutor_2: existingSecondParent.nombre,
        email_tutor_2: existingSecondParent.email,
        telefono_tutor_2: existingSecondParent.telefono || ""
      });
      toast.success("Datos del segundo progenitor cargados");
    }
  };

  // Solicitar invitación al segundo progenitor (notifica al admin)
  const sendInvitation = async () => {
    if (!currentPlayer.email_tutor_2?.trim()) {
      toast.error("Introduce el email del segundo progenitor");
      return;
    }

    if (!currentPlayer.id) {
      toast.info("La solicitud se enviará automáticamente al guardar el jugador");
      return;
    }

    setIsSendingInvitation(true);

    try {
      const token = generateUUID();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + 30);

      // Crear registro de invitación (para tracking)
      const invitation = await base44.entities.SecondParentInvitation.create({
        token: token,
        email_destino: currentPlayer.email_tutor_2.trim().toLowerCase(),
        nombre_destino: currentPlayer.nombre_tutor_2 || "",
        jugador_id: currentPlayer.id,
        jugador_nombre: currentPlayer.nombre,
        invitado_por_email: currentUser?.email,
        invitado_por_nombre: currentUser?.full_name,
        estado: "pendiente",
        fecha_envio: new Date().toISOString(),
        fecha_expiracion: expirationDate.toISOString()
      });

      // Ya no enviamos email - solo se registra en la BD para que aparezca en admin

      setPendingInvitation(invitation);
      toast.success("✅ Solicitud enviada al administrador");
    } catch (err) {
      console.error("Error enviando solicitud:", err);
      toast.error("Error al enviar la solicitud");
    } finally {
      setIsSendingInvitation(false);
    }
  };

  const generateInvitationEmail = (nombreDestino, nombreInvitador, nombreJugador, validationUrl) => {
    return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:20px;font-family:Arial,Helvetica,sans-serif;background-color:#f1f5f9;">
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:600px;margin:0 auto;background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">

<!-- Header naranja -->
<tr>
<td bgcolor="#ea580c" style="padding:30px;text-align:center;">
<img src="${CLUB_LOGO_URL}" alt="CD Bustarviejo" width="80" height="80" style="width:80px;height:80px;border-radius:12px;border:3px solid #ffffff;display:block;margin:0 auto;">
<h1 style="color:#ffffff;margin:15px 0 5px 0;font-size:26px;font-family:Arial,Helvetica,sans-serif;">CD BUSTARVIEJO</h1>
<p style="color:#fed7aa;margin:0;font-size:14px;">Club Deportivo</p>
</td>
</tr>

<!-- Contenido -->
<tr>
<td bgcolor="#ffffff" style="padding:30px;">
<h2 style="color:#1e293b;margin:0 0 15px 0;font-size:22px;text-align:center;font-family:Arial,Helvetica,sans-serif;">👋 ¡Te han invitado!</h2>

<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
Hola <strong>${nombreDestino}</strong>,
</p>

<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 20px 0;">
<strong style="color:#ea580c;">${nombreInvitador}</strong> te ha invitado a unirte a la aplicación del CD Bustarviejo como <strong>segundo progenitor</strong> de <strong>${nombreJugador}</strong>.
</p>

<!-- Info box -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:25px;">
<tr>
<td bgcolor="#f0fdf4" style="padding:15px;border-left:4px solid #22c55e;border-radius:0 8px 8px 0;">
<p style="color:#166534;font-size:14px;margin:0;"><strong>✅ ¿Qué podrás hacer?</strong></p>
<ul style="color:#166534;font-size:13px;margin:10px 0 0 0;padding-left:20px;">
<li><strong>Acceso completo:</strong> verás exactamente lo mismo que el primer progenitor</li>
<li>Ver convocatorias de partidos y confirmar asistencia</li>
<li>Hacer pagos de cuotas y ropa</li>
<li>Chatear con entrenadores y coordinador</li>
<li>Ver calendario, documentos, galería y eventos</li>
</ul>
</td>
</tr>
</table>

<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 25px 0;text-align:center;">
Para completar tu registro, haz clic en el botón:
</p>

<!-- Boton -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 25px auto;">
<tr>
<td bgcolor="#ea580c" style="border-radius:8px;">
<a href="${validationUrl}" target="_blank" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 35px;font-weight:bold;font-size:16px;font-family:Arial,Helvetica,sans-serif;">COMPLETAR REGISTRO →</a>
</td>
</tr>
</table>

<!-- Warning -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:20px;">
<tr>
<td bgcolor="#fef3c7" style="padding:15px;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
<p style="color:#92400e;font-size:13px;margin:0;">⏰ <strong>Este enlace es válido durante 30 días.</strong> Solo necesitas completar unos datos básicos para activar tu acceso.</p>
</td>
</tr>
</table>

<p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">Si no esperabas este email, puedes ignorarlo.</p>
</td>
</tr>

<!-- Footer -->
<tr>
<td bgcolor="#1e293b" style="padding:20px;text-align:center;">
<p style="color:#94a3b8;font-size:13px;margin:0 0 5px 0;">⚽ 🏀</p>
<p style="color:#64748b;font-size:12px;margin:0;">cdbustarviejo@gmail.com</p>
</td>
</tr>

</table>
</body>
</html>`;
  };

  // Si ya hay segundo progenitor con datos completos, mostrar solo resumen
  const hasCompleteSecondParent = currentPlayer.nombre_tutor_2 && 
                                   currentPlayer.email_tutor_2 && 
                                   currentPlayer.telefono_tutor_2;

  return (
    <div className="space-y-4 border-t border-slate-200 pt-6">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-slate-600" />
              <span className="text-lg font-semibold text-slate-900">
                Segundo Progenitor/Tutor (Opcional)
              </span>
              {hasCompleteSecondParent && (
                <Badge className="bg-green-100 text-green-800 text-xs ml-2">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Registrado
                </Badge>
              )}
              {pendingInvitation && (
                <Badge className="bg-yellow-100 text-yellow-800 text-xs ml-2">
                  <Clock className="w-3 h-3 mr-1" />
                  Invitación pendiente
                </Badge>
              )}
            </div>
            {isOpen ? <ChevronUp className="w-5 h-5 text-slate-500" /> : <ChevronDown className="w-5 h-5 text-slate-500" />}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="pt-4 space-y-4">
            
            {/* ALERTA SI YA HAY SEGUNDO PROGENITOR EN HERMANOS */}
            {segundoProgenitorEnOtrosHermanos && !currentPlayer.email_tutor_2 && datosSegundoProgenitorHermano && (
              <Alert className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-400">
                <Sparkles className="h-5 w-5 text-green-600" />
                <AlertDescription className="text-green-800">
                  <p className="font-bold text-base mb-2">
                    ✅ Ya tienes segundo progenitor en otro hijo
                  </p>
                  <div className="bg-white rounded-lg p-3 border border-green-300 text-sm space-y-1 mb-3">
                    <p><strong>Nombre:</strong> {datosSegundoProgenitorHermano.nombre_tutor_2}</p>
                    <p><strong>Email:</strong> {datosSegundoProgenitorHermano.email_tutor_2}</p>
                    {datosSegundoProgenitorHermano.telefono_tutor_2 && (
                      <p><strong>Teléfono:</strong> {datosSegundoProgenitorHermano.telefono_tutor_2}</p>
                    )}
                  </div>
                  <div className="bg-green-100 rounded-lg p-3 border border-green-300">
                    <p className="text-sm font-semibold mb-1">💡 ¿Son los mismos progenitores?</p>
                    <p className="text-sm">
                      <strong>No hace falta</strong> que rellenes esta sección de nuevo. Ambos padres ya recibirán 
                      notificaciones de este nuevo hijo automáticamente.
                    </p>
                    <p className="text-xs mt-2 text-green-700">
                      ℹ️ Solo rellena si el segundo progenitor de <strong>este hijo</strong> es diferente al de tus otros hijos.
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {/* Alerta informativa */}
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                <strong>👥 Acceso compartido:</strong> Al guardar el jugador con el email del segundo progenitor, se creará una <strong>solicitud de invitación</strong> que el administrador procesará.
                <p className="mt-2 text-xs">
                  ✅ Una vez que el admin la apruebe, recibirá un email para acceder a la app con acceso completo: pagos, convocatorias, chat, calendario, etc.
                </p>
              </AlertDescription>
            </Alert>

            {/* Si ya existe segundo progenitor en otros hijos */}
            {existingSecondParent && !hasCompleteSecondParent && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertCircle className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-blue-800 text-sm">
                  <strong>💡 Segundo progenitor detectado:</strong> Ya tienes registrado a <strong>{existingSecondParent.nombre}</strong> ({existingSecondParent.email}) como segundo progenitor en otros hijos.
                  <Button 
                    type="button" 
                    variant="link" 
                    className="text-blue-700 p-0 h-auto font-bold ml-2"
                    onClick={useExistingSecondParent}
                  >
                    Usar estos datos →
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Nota sobre cuota de socio */}
            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                Si el segundo progenitor quiere ser socio del club, debe rellenar el formulario de <strong>"Hacerse Socio"</strong> desde su propia cuenta con una cuota de 25€.
              </AlertDescription>
            </Alert>

            {/* Campos del formulario */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="nombre_tutor_2">Nombre y Apellidos</Label>
                <Input 
                  id="nombre_tutor_2" 
                  name="tutor2-name"
                  autoComplete="name"
                  value={currentPlayer.nombre_tutor_2 || ""} 
                  onChange={(e) => setCurrentPlayer({...currentPlayer, nombre_tutor_2: e.target.value})}
                  placeholder="Ej: Pedro García López" 
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email_tutor_2">Correo Electrónico</Label>
                <div className="flex gap-2">
                  <Input 
                    id="email_tutor_2" 
                    name="tutor2-email"
                    type="email" 
                    autoComplete="email"
                    value={currentPlayer.email_tutor_2 || ""} 
                    onChange={(e) => setCurrentPlayer({...currentPlayer, email_tutor_2: e.target.value})}
                    placeholder="padre@ejemplo.com"
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Se enviará una invitación automática a este email
                </p>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="telefono_tutor_2">Teléfono</Label>
                <Input 
                  id="telefono_tutor_2" 
                  name="tutor2-tel"
                  type="tel" 
                  autoComplete="tel"
                  value={currentPlayer.telefono_tutor_2 || ""} 
                  onChange={(e) => setCurrentPlayer({...currentPlayer, telefono_tutor_2: e.target.value})}
                  placeholder="600654321" 
                />
              </div>
            </div>

            {/* Estado de invitación */}
            {isEditing && currentPlayer.email_tutor_2 && (
              <div className="bg-slate-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-slate-600">
                  {hasCompleteSecondParent ? (
                    <>
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span className="text-sm font-medium text-green-700">
                        El segundo progenitor ya está registrado y recibirá invitación automáticamente al guardar
                      </span>
                    </>
                  ) : (
                    <>
                      <Info className="w-5 h-5 text-blue-600" />
                      <span className="text-sm text-blue-700">
                        Al guardar, se enviará automáticamente una invitación al email indicado
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}