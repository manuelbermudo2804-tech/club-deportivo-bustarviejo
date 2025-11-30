import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Mail, Send, Plus, X, Loader2, CheckCircle2, AlertCircle, Users, Trash2 } from "lucide-react";
import { toast } from "sonner";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const APP_URL = "https://app.base44.com/a/6911b8e453ca3ac01fb134d6";

export default function EmailInvitations() {
  const [user, setUser] = useState(null);
  const [emails, setEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [asunto, setAsunto] = useState("¡Bienvenido a la App del CD Bustarviejo! 📱⚽");
  const [mensajePersonalizado, setMensajePersonalizado] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const addEmail = () => {
    const email = currentEmail.trim().toLowerCase();
    if (!email) return;
    
    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      toast.error("Email no válido");
      return;
    }
    
    if (emails.includes(email)) {
      toast.error("Este email ya está en la lista");
      return;
    }
    
    setEmails([...emails, email]);
    setCurrentEmail("");
  };

  const addMultipleEmails = (text) => {
    // Separar por comas, punto y coma, espacios o saltos de línea
    const emailList = text.split(/[,;\s\n]+/).filter(e => e.trim());
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    let added = 0;
    let invalid = 0;
    
    emailList.forEach(email => {
      const cleanEmail = email.trim().toLowerCase();
      if (emailRegex.test(cleanEmail) && !emails.includes(cleanEmail)) {
        emails.push(cleanEmail);
        added++;
      } else if (!emailRegex.test(cleanEmail) && cleanEmail) {
        invalid++;
      }
    });
    
    setEmails([...emails]);
    
    if (added > 0) toast.success(`${added} emails añadidos`);
    if (invalid > 0) toast.warning(`${invalid} emails inválidos ignorados`);
  };

  const removeEmail = (emailToRemove) => {
    setEmails(emails.filter(e => e !== emailToRemove));
  };

  const clearAllEmails = () => {
    setEmails([]);
  };

  const generateEmailBody = (destinatarioEmail) => {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
    
    <!-- Header con logo -->
    <div style="background: linear-gradient(135deg, #ea580c 0%, #16a34a 100%); padding: 30px; text-align: center;">
      <img src="${CLUB_LOGO_URL}" alt="CD Bustarviejo" style="width: 120px; height: 120px; border-radius: 20px; border: 4px solid white; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
      <h1 style="color: white; margin: 20px 0 5px 0; font-size: 28px;">CD Bustarviejo</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 0; font-size: 16px;">Club Deportivo desde 1970</p>
    </div>
    
    <!-- Contenido principal -->
    <div style="padding: 40px 30px;">
      <h2 style="color: #1e293b; margin-bottom: 20px; font-size: 24px;">¡Bienvenido a nuestra App! 📱</h2>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Hola,
      </p>
      
      <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
        Te invitamos a unirte a la <strong>aplicación oficial del CD Bustarviejo</strong>. Con ella podrás:
      </p>
      
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 20px; margin-bottom: 25px;">
        <ul style="color: #475569; font-size: 15px; line-height: 2; margin: 0; padding-left: 20px;">
          <li>✅ <strong>Inscribir a tus jugadores</strong> de forma fácil</li>
          <li>✅ <strong>Recibir convocatorias</strong> de partidos y confirmar asistencia</li>
          <li>✅ <strong>Gestionar pagos</strong> y subir justificantes</li>
          <li>✅ <strong>Comunicarte</strong> con entrenadores y el club</li>
          <li>✅ <strong>Ver calendario</strong> de entrenamientos y eventos</li>
          <li>✅ <strong>Acceder a la galería</strong> de fotos del club</li>
        </ul>
      </div>

      ${mensajePersonalizado ? `
      <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin-bottom: 25px; border-radius: 0 8px 8px 0;">
        <p style="color: #92400e; font-size: 15px; margin: 0; line-height: 1.6;">
          ${mensajePersonalizado}
        </p>
      </div>
      ` : ''}
      
      <!-- Botón de acceso -->
      <div style="text-align: center; margin: 35px 0;">
        <a href="${APP_URL}" style="display: inline-block; background: linear-gradient(135deg, #ea580c 0%, #c2410c 100%); color: white; text-decoration: none; padding: 18px 45px; border-radius: 12px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 15px rgba(234, 88, 12, 0.4);">
          📲 ACCEDER A LA APP
        </a>
      </div>
      
      <p style="color: #64748b; font-size: 14px; text-align: center; margin-top: 30px;">
        Usa tu email <strong>${destinatarioEmail}</strong> para registrarte
      </p>
    </div>
    
    <!-- Footer -->
    <div style="background-color: #1e293b; padding: 25px 30px; text-align: center;">
      <p style="color: #94a3b8; font-size: 14px; margin: 0 0 10px 0;">
        CD Bustarviejo - Club Deportivo
      </p>
      <p style="color: #64748b; font-size: 12px; margin: 0;">
        📧 cdbustarviejo@gmail.com
      </p>
      <div style="margin-top: 15px;">
        <span style="color: #ea580c; font-size: 20px;">⚽</span>
        <span style="color: #16a34a; font-size: 20px; margin-left: 10px;">🏀</span>
      </div>
    </div>
    
  </div>
</body>
</html>
    `;
  };

  const sendInvitations = async () => {
    if (emails.length === 0) {
      toast.error("Añade al menos un email");
      return;
    }

    setIsSending(true);
    setSentCount(0);
    setErrorCount(0);

    let sent = 0;
    let errors = 0;

    for (const email of emails) {
      try {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: email,
          subject: asunto,
          body: generateEmailBody(email)
        });
        sent++;
        setSentCount(sent);
      } catch (error) {
        console.error(`Error enviando a ${email}:`, error);
        errors++;
        setErrorCount(errors);
      }
    }

    setIsSending(false);

    if (errors === 0) {
      toast.success(`✅ ${sent} invitaciones enviadas correctamente`);
      setEmails([]);
    } else {
      toast.warning(`Enviados: ${sent}, Errores: ${errors}`);
    }
  };

  if (user?.role !== "admin") {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-500">No tienes permisos para acceder a esta sección</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Mail className="w-7 h-7 text-orange-600" />
          Invitaciones por Email
        </h1>
        <p className="text-slate-600 mt-1">Envía invitaciones personalizadas a nuevos usuarios</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="space-y-4">
          {/* Asunto */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Asunto del email</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={asunto}
                onChange={(e) => setAsunto(e.target.value)}
                placeholder="Asunto del email..."
              />
            </CardContent>
          </Card>

          {/* Mensaje personalizado */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Mensaje adicional (opcional)</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={mensajePersonalizado}
                onChange={(e) => setMensajePersonalizado(e.target.value)}
                placeholder="Añade un mensaje personalizado que aparecerá destacado en el email..."
                rows={3}
              />
              <p className="text-xs text-slate-500 mt-2">
                Este mensaje aparecerá en un recuadro destacado dentro del email
              </p>
            </CardContent>
          </Card>

          {/* Añadir emails */}
          <Card className="border-none shadow-md">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between">
                <span>Destinatarios</span>
                <Badge className="bg-orange-100 text-orange-800">
                  {emails.length} emails
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Input individual */}
              <div className="flex gap-2">
                <Input
                  value={currentEmail}
                  onChange={(e) => setCurrentEmail(e.target.value)}
                  placeholder="email@ejemplo.com"
                  onKeyDown={(e) => e.key === "Enter" && addEmail()}
                />
                <Button onClick={addEmail} className="bg-orange-600 hover:bg-orange-700">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {/* Pegar múltiples */}
              <div>
                <Label className="text-xs text-slate-600">O pega varios emails (separados por comas, espacios o saltos de línea):</Label>
                <Textarea
                  placeholder="email1@ejemplo.com, email2@ejemplo.com&#10;email3@ejemplo.com"
                  rows={2}
                  className="mt-1"
                  onBlur={(e) => {
                    if (e.target.value) {
                      addMultipleEmails(e.target.value);
                      e.target.value = "";
                    }
                  }}
                />
              </div>

              {/* Lista de emails */}
              {emails.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-600">Lista de destinatarios:</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearAllEmails}
                      className="text-red-600 hover:text-red-700 h-7 text-xs"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Limpiar todo
                    </Button>
                  </div>
                  <div className="max-h-48 overflow-y-auto bg-slate-50 rounded-lg p-3 space-y-1">
                    {emails.map((email, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 shadow-sm">
                        <span className="text-sm text-slate-700 truncate">{email}</span>
                        <button
                          onClick={() => removeEmail(email)}
                          className="text-slate-400 hover:text-red-500 ml-2"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Botón enviar */}
          <Button
            onClick={sendInvitations}
            disabled={isSending || emails.length === 0}
            className="w-full bg-gradient-to-r from-orange-600 to-green-600 hover:from-orange-700 hover:to-green-700 py-6 text-lg font-bold shadow-lg"
          >
            {isSending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Enviando... ({sentCount}/{emails.length})
              </>
            ) : (
              <>
                <Send className="w-5 h-5 mr-2" />
                Enviar {emails.length} Invitación{emails.length !== 1 ? 'es' : ''}
              </>
            )}
          </Button>

          {/* Estado del envío */}
          {(sentCount > 0 || errorCount > 0) && !isSending && (
            <div className="flex gap-4">
              {sentCount > 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{sentCount} enviados</span>
                </div>
              )}
              {errorCount > 0 && (
                <div className="flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-5 h-5" />
                  <span>{errorCount} errores</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Preview */}
        <Card className="border-none shadow-lg">
          <CardHeader className="pb-3 bg-slate-50">
            <CardTitle className="text-base flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-600" />
              Vista previa del email
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="border rounded-b-lg overflow-hidden">
              <iframe
                srcDoc={generateEmailBody("usuario@ejemplo.com")}
                className="w-full h-[600px] border-0"
                title="Preview"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Información */}
      <Card className="border-none shadow-md bg-blue-50">
        <CardContent className="p-4">
          <h3 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Consejos para invitar usuarios
          </h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Los usuarios recibirán un email bonito con el logo del club y un botón para acceder</li>
            <li>• Pueden registrarse usando el mismo email al que les enviaste la invitación</li>
            <li>• Puedes pegar una lista de emails separados por comas o saltos de línea</li>
            <li>• Si añades un mensaje personalizado, aparecerá destacado en amarillo</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}