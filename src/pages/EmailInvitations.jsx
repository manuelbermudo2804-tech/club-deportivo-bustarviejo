import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, Send, Plus, X, Loader2, CheckCircle2, AlertCircle, Users, Trash2, Clock, UserPlus, History, Filter, Calendar, RefreshCw, Eye, MousePointer } from "lucide-react";
import { toast } from "sonner";

const CLUB_LOGO_URL = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
const DEFAULT_APP_URL = "https://club-gestion-bustarviejo-1fb134d6.base44.app";
const TRACKING_BASE_URL = "https://club-gestion-bustarviejo-1fb134d6.base44.app/api/emailTracking";

export default function EmailInvitations() {
  const [user, setUser] = useState(null);
  const [emails, setEmails] = useState([]);
  const [currentEmail, setCurrentEmail] = useState("");
  const [asunto, setAsunto] = useState("¡Bienvenido a la App del CD Bustarviejo! 📱⚽");
  const [mensajePersonalizado, setMensajePersonalizado] = useState("");
  const [appUrl, setAppUrl] = useState(DEFAULT_APP_URL);
  const [isSending, setIsSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [errorCount, setErrorCount] = useState(0);
  const [activeTab, setActiveTab] = useState("enviar");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filtroFecha, setFiltroFecha] = useState("todos");
  const [filtroInteraccion, setFiltroInteraccion] = useState("todos");
  const [busquedaHistorial, setBusquedaHistorial] = useState("");

  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  // Solicitudes de invitación pendientes (jugadores +18)
  const { data: invitationRequests = [] } = useQuery({
    queryKey: ['invitationRequests'],
    queryFn: () => base44.entities.InvitationRequest.list('-created_date'),
    enabled: !!user && user.role === "admin",
  });

  const pendingRequests = invitationRequests.filter(r => r.estado === "pendiente");

  // Historial de invitaciones enviadas
  const { data: emailHistory = [], isLoading: loadingHistory } = useQuery({
    queryKey: ['emailHistory'],
    queryFn: () => base44.entities.EmailInvitation.list('-created_date'),
    enabled: !!user && user.role === "admin",
  });

  // Filtrar historial
  const filteredHistory = emailHistory.filter(inv => {
    // Filtro por estado
    if (filtroEstado !== "todos" && inv.estado !== filtroEstado) return false;
    
    // Filtro por fecha
    if (filtroFecha !== "todos") {
      const invDate = new Date(inv.created_date);
      const now = new Date();
      if (filtroFecha === "hoy") {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        if (invDate < today) return false;
      } else if (filtroFecha === "semana") {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        if (invDate < weekAgo) return false;
      } else if (filtroFecha === "mes") {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        if (invDate < monthAgo) return false;
      }
    }

    // Filtro por interacción (abierta/clicada)
    if (filtroInteraccion !== "todos") {
      if (filtroInteraccion === "abierta" && !inv.abierta) return false;
      if (filtroInteraccion === "no_abierta" && inv.abierta) return false;
      if (filtroInteraccion === "clicada" && !inv.clicada) return false;
      if (filtroInteraccion === "no_clicada" && inv.clicada) return false;
    }
    
    // Filtro por búsqueda
    if (busquedaHistorial) {
      const search = busquedaHistorial.toLowerCase();
      return (
        inv.email_destinatario?.toLowerCase().includes(search) ||
        inv.nombre_destinatario?.toLowerCase().includes(search) ||
        inv.asunto?.toLowerCase().includes(search)
      );
    }
    
    return true;
  });

  // Marcar solicitud como enviada
  const markAsSentMutation = useMutation({
    mutationFn: async (requestId) => {
      await base44.entities.InvitationRequest.update(requestId, {
        estado: "enviada",
        fecha_envio: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitationRequests'] });
      toast.success("Solicitud marcada como enviada");
    }
  });

  // Añadir email de solicitud a la lista
  const addRequestEmail = (request) => {
    console.log("Añadiendo email:", request);
    const emailToAdd = request.email_jugador;
    
    if (!emailToAdd) {
      toast.error("Esta solicitud no tiene email");
      return;
    }
    
    if (emails.includes(emailToAdd)) {
      toast.info("Este email ya está en la lista");
      return;
    }
    
    const newEmails = [...emails, emailToAdd];
    setEmails(newEmails);
    toast.success(`✅ Email de ${request.nombre_jugador} añadido a la lista`);
  };

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

  const generateEmailBody = (destinatarioEmail, linkUrl, invitationId) => {
    // URLs de tracking
    const trackingPixelUrl = invitationId ? `${TRACKING_BASE_URL}?id=${invitationId}&action=open` : '';
    const trackingClickUrl = invitationId ? `${TRACKING_BASE_URL}?id=${invitationId}&action=click&redirect=${encodeURIComponent(linkUrl)}` : linkUrl;
    const finalLinkUrl = invitationId ? trackingClickUrl : linkUrl;
    
    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
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
<h2 style="color:#1e293b;margin:0 0 15px 0;font-size:22px;text-align:center;font-family:Arial,Helvetica,sans-serif;">🎉 ¡Bienvenido a la App!</h2>
<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 25px 0;text-align:center;">
Te invitamos a usar la <strong style="color:#ea580c;">aplicación oficial</strong> del club para gestionar todo sobre tus jugadores.
</p>

<!-- Features -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:25px;background-color:#f8fafc;border-radius:8px;">
<tr>
<td style="padding:15px;width:50%;text-align:center;border-bottom:1px solid #e2e8f0;">
<span style="font-size:28px;">📋</span><br>
<span style="color:#475569;font-size:13px;font-weight:bold;">Convocatorias</span>
</td>
<td style="padding:15px;width:50%;text-align:center;border-bottom:1px solid #e2e8f0;">
<span style="font-size:28px;">💳</span><br>
<span style="color:#475569;font-size:13px;font-weight:bold;">Pagos</span>
</td>
</tr>
<tr>
<td style="padding:15px;width:50%;text-align:center;">
<span style="font-size:28px;">💬</span><br>
<span style="color:#475569;font-size:13px;font-weight:bold;">Chat</span>
</td>
<td style="padding:15px;width:50%;text-align:center;">
<span style="font-size:28px;">📅</span><br>
<span style="color:#475569;font-size:13px;font-weight:bold;">Calendario</span>
</td>
</tr>
</table>

${mensajePersonalizado ? `
<!-- Mensaje personalizado -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-bottom:25px;">
<tr>
<td bgcolor="#fef3c7" style="padding:15px;border-left:4px solid #f59e0b;border-radius:0 8px 8px 0;">
<p style="color:#92400e;font-size:14px;margin:0;">💬 ${mensajePersonalizado}</p>
</td>
</tr>
</table>
` : ''}

<!-- Boton -->
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 20px auto;">
<tr>
<td bgcolor="#ea580c" style="border-radius:8px;">
<a href="${finalLinkUrl}" target="_blank" style="display:inline-block;color:#ffffff;text-decoration:none;padding:14px 35px;font-weight:bold;font-size:16px;font-family:Arial,Helvetica,sans-serif;">ACCEDER A LA APP →</a>
</td>
</tr>
</table>

${invitationId ? `<!-- Pixel de tracking -->
<img src="${trackingPixelUrl}" width="1" height="1" style="display:none;" alt="" />` : ''}

<p style="color:#94a3b8;font-size:12px;text-align:center;margin:0;">Haz clic en el botón para empezar</p>
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
        // Primero creamos el registro para obtener el ID para tracking
        const invitationRecord = await base44.entities.EmailInvitation.create({
          email_destinatario: email,
          asunto: asunto,
          estado: "enviada",
          enviado_por: user.email,
          enviado_por_nombre: user.full_name,
          mensaje_personalizado: mensajePersonalizado || null,
          abierta: false,
          clicada: false
        });

        // Enviamos el email con el ID para tracking
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: email,
          subject: asunto,
          body: generateEmailBody(email, appUrl, invitationRecord.id)
        });
        
        sent++;
        setSentCount(sent);
      } catch (error) {
        console.error(`Error enviando a ${email}:`, error);
        
        // Guardar error en historial
        await base44.entities.EmailInvitation.create({
          email_destinatario: email,
          asunto: asunto,
          estado: "error",
          error_mensaje: error.message || "Error desconocido",
          enviado_por: user.email,
          enviado_por_nombre: user.full_name,
          abierta: false,
          clicada: false
        });
        
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
    
    // Refrescar historial
    queryClient.invalidateQueries({ queryKey: ['emailHistory'] });
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
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
            <Mail className="w-7 h-7 text-orange-600" />
            Invitaciones por Email
          </h1>
          <p className="text-slate-600 mt-1">Envía invitaciones y consulta el historial</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingRequests.length > 0 && (
            <Badge className="bg-red-500 text-white text-base px-4 py-2 animate-pulse">
              <Clock className="w-4 h-4 mr-2" />
              {pendingRequests.length} solicitud{pendingRequests.length !== 1 ? 'es' : ''} pendiente{pendingRequests.length !== 1 ? 's' : ''}
            </Badge>
          )}
          <Badge className="bg-blue-100 text-blue-800 text-sm px-3 py-1">
            <History className="w-3 h-3 mr-1" />
            {emailHistory.length} enviadas
          </Badge>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="enviar" className="flex items-center gap-2">
            <Send className="w-4 h-4" />
            Enviar Invitaciones
          </TabsTrigger>
          <TabsTrigger value="historial" className="flex items-center gap-2">
            <History className="w-4 h-4" />
            Historial ({emailHistory.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="enviar" className="mt-6">

      {/* Solicitudes pendientes de jugadores +18 */}
      {pendingRequests.length > 0 && (
        <Card className="border-2 border-red-300 bg-red-50 shadow-lg">
          <CardHeader className="pb-3 bg-red-100">
            <CardTitle className="text-lg flex items-center gap-2 text-red-900">
              <UserPlus className="w-5 h-5" />
              🚨 Solicitudes de Invitación Pendientes (Jugadores +18)
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <p className="text-sm text-red-800 mb-4">
              Estos jugadores mayores de 18 años necesitan una invitación para poder registrarse. 
              Sus padres/familiares han solicitado que se les envíe el acceso.
            </p>
            <div className="space-y-3">
              {pendingRequests.map(request => (
                <div key={request.id} className="bg-white rounded-xl p-4 border border-red-200 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{request.nombre_jugador}</span>
                        {request.categoria_deseada && (
                          <Badge variant="outline" className="text-xs">{request.categoria_deseada}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-slate-600">
                        📧 <strong>{request.email_jugador}</strong>
                        {request.telefono_jugador && <span className="ml-3">📱 {request.telefono_jugador}</span>}
                      </p>
                      <p className="text-xs text-slate-500">
                        Solicitado por: {request.solicitado_por_nombre} ({request.solicitado_por_email})
                      </p>
                      <p className="text-xs text-slate-400">
                        {new Date(request.created_date).toLocaleDateString('es-ES', { 
                          day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                        })}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const emailToAdd = request.email_jugador;
                          if (!emailToAdd) {
                            toast.error("Esta solicitud no tiene email");
                            return;
                          }
                          if (emails.includes(emailToAdd)) {
                            toast.info("Este email ya está en la lista");
                            return;
                          }
                          setEmails([...emails, emailToAdd]);
                          toast.success(`✅ Email de ${request.nombre_jugador} añadido`);
                        }}
                        className="border-orange-300 text-orange-700 hover:bg-orange-50"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Añadir a lista
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => markAsSentMutation.mutate(request.id)}
                        disabled={markAsSentMutation.isPending}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-1" />
                        Marcar enviada
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Formulario */}
        <div className="space-y-4">
          {/* Enlace de la App */}
          <Card className="border-none shadow-md border-2 border-orange-200">
            <CardHeader className="pb-3 bg-orange-50">
              <CardTitle className="text-base flex items-center gap-2">
                🔗 Enlace de la App
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <Input
                value={appUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="https://tu-dominio.com"
              />
              <p className="text-xs text-slate-500 mt-2">
                Este es el enlace que aparecerá en el botón "ACCEDER A LA APP"
              </p>
            </CardContent>
          </Card>

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
                srcDoc={generateEmailBody("usuario@ejemplo.com", appUrl)}
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
        </TabsContent>

        {/* Tab Historial */}
        <TabsContent value="historial" className="mt-6 space-y-4">
          {/* Filtros */}
          <Card className="border-none shadow-md">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-slate-500" />
                  <span className="text-sm font-medium text-slate-700">Filtros:</span>
                </div>
                
                <div className="flex flex-wrap gap-3 flex-1">
                  <Input
                    placeholder="🔍 Buscar email, nombre..."
                    value={busquedaHistorial}
                    onChange={(e) => setBusquedaHistorial(e.target.value)}
                    className="w-full md:w-64"
                  />
                  
                  <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Estado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todos">Todos los estados</SelectItem>
                      <SelectItem value="enviada">✅ Enviadas</SelectItem>
                      <SelectItem value="error">❌ Con error</SelectItem>
                      <SelectItem value="rebotada">↩️ Rebotadas</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <Select value={filtroFecha} onValueChange={setFiltroFecha}>
                                          <SelectTrigger className="w-40">
                                            <SelectValue placeholder="Fecha" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="todos">Todas las fechas</SelectItem>
                                            <SelectItem value="hoy">Hoy</SelectItem>
                                            <SelectItem value="semana">Última semana</SelectItem>
                                            <SelectItem value="mes">Último mes</SelectItem>
                                          </SelectContent>
                                        </Select>

                                        <Select value={filtroInteraccion} onValueChange={setFiltroInteraccion}>
                                          <SelectTrigger className="w-44">
                                            <SelectValue placeholder="Interacción" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="todos">Todas</SelectItem>
                                            <SelectItem value="abierta">👁️ Abiertas</SelectItem>
                                            <SelectItem value="no_abierta">🚫 No abiertas</SelectItem>
                                            <SelectItem value="clicada">👆 Con clic</SelectItem>
                                            <SelectItem value="no_clicada">🚫 Sin clic</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>

                                      <Button
                  variant="outline"
                  size="sm"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['emailHistory'] })}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Estadísticas rápidas */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-green-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-green-700">
                  {emailHistory.filter(e => e.estado === "enviada").length}
                </p>
                <p className="text-xs text-green-600">Enviadas ✅</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-red-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-red-700">
                  {emailHistory.filter(e => e.estado === "error").length}
                </p>
                <p className="text-xs text-red-600">Con error ❌</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-orange-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-orange-700">
                  {emailHistory.filter(e => e.estado === "rebotada").length}
                </p>
                <p className="text-xs text-orange-600">Rebotadas ↩️</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-blue-50">
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-blue-700">
                  {emailHistory.length}
                </p>
                <p className="text-xs text-blue-600">Total 📧</p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de historial */}
          {loadingHistory ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : filteredHistory.length === 0 ? (
            <Card className="border-none shadow-md">
              <CardContent className="py-12 text-center">
                <Mail className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">
                  {emailHistory.length === 0 
                    ? "No hay invitaciones enviadas todavía" 
                    : "No hay resultados con los filtros seleccionados"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-none shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center justify-between">
                  <span>Historial de Invitaciones</span>
                  <Badge variant="outline">{filteredHistory.length} resultados</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y">
                  {filteredHistory.map((inv) => (
                    <div key={inv.id} className="p-4 hover:bg-slate-50 transition-colors">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-900 truncate">
                              {inv.email_destinatario}
                            </span>
                            {inv.estado === "enviada" && (
                                                              <Badge className="bg-green-100 text-green-800 text-xs">✅ Enviada</Badge>
                                                            )}
                                                            {inv.estado === "error" && (
                                                              <Badge className="bg-red-100 text-red-800 text-xs">❌ Error</Badge>
                                                            )}
                                                            {inv.estado === "rebotada" && (
                                                              <Badge className="bg-orange-100 text-orange-800 text-xs">↩️ Rebotada</Badge>
                                                            )}
                                                            {inv.abierta && (
                                                              <Badge className="bg-purple-100 text-purple-800 text-xs flex items-center gap-1">
                                                                <Eye className="w-3 h-3" /> Abierta
                                                              </Badge>
                                                            )}
                                                            {inv.clicada && (
                                                              <Badge className="bg-cyan-100 text-cyan-800 text-xs flex items-center gap-1">
                                                                <MousePointer className="w-3 h-3" /> Clic
                                                              </Badge>
                                                            )}
                          </div>
                          <p className="text-sm text-slate-600 truncate">
                            📧 {inv.asunto}
                          </p>
                          {inv.error_mensaje && (
                            <p className="text-xs text-red-600 mt-1">
                              ⚠️ {inv.error_mensaje}
                            </p>
                          )}
                          {inv.mensaje_personalizado && (
                                                        <p className="text-xs text-amber-600 mt-1 truncate">
                                                          💬 "{inv.mensaje_personalizado}"
                                                        </p>
                                                      )}
                                                      {inv.fecha_apertura && (
                                                        <p className="text-xs text-purple-600 mt-1">
                                                          👁️ Abierto: {new Date(inv.fecha_apertura).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                      )}
                                                      {inv.fecha_clic && (
                                                        <p className="text-xs text-cyan-600 mt-1">
                                                          👆 Clic: {new Date(inv.fecha_clic).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                      )}
                        </div>
                        <div className="text-right text-sm text-slate-500 flex-shrink-0">
                          <div className="flex items-center gap-1 justify-end">
                            <Calendar className="w-3 h-3" />
                            {new Date(inv.created_date).toLocaleDateString('es-ES', {
                              day: 'numeric',
                              month: 'short',
                              year: 'numeric'
                            })}
                          </div>
                          <div className="text-xs mt-1">
                            {new Date(inv.created_date).toLocaleTimeString('es-ES', {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </div>
                          {inv.enviado_por_nombre && (
                            <div className="text-xs text-slate-400 mt-1">
                              por {inv.enviado_por_nombre}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}