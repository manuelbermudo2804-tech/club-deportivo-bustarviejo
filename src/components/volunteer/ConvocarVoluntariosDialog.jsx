import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Send, Mail, Bell, Loader2, Sparkles, Calendar, Clock, MapPin, ChevronDown } from "lucide-react";

const SYSTEM_EMAIL = "sistema@cdbustarviejo.com";
const SYSTEM_NAME = "Voluntariado CD Bustarviejo";

const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";

const PLANTILLAS = [
  {
    emoji: "🍺",
    nombre: "Barra en partido",
    asunto: "🍺 ¡Necesitamos ayuda en la barra!",
    mensaje: "¡Hola voluntarios! 👋\n\nEl próximo {fecha} a las {hora} somos sede de partido y necesitamos gente para la barra del campo.\n\n🏟️ Lugar: {lugar}\n📅 Fecha: {fecha}\n⏰ Hora de llegada: {hora}\n\nLas tareas son sencillas: preparar bocadillos, servir bebidas y recoger al final.\n\n¡Cualquier ayuda es bienvenida! Si puedes venir aunque sea un rato, nos viene genial. 💪\n\n¡Gracias de corazón!",
  },
  {
    emoji: "🏆",
    nombre: "Torneo / Jornada especial",
    asunto: "🏆 ¡Torneo en casa! Necesitamos voluntarios",
    mensaje: "¡Hola a todos! 🎉\n\nTenemos un torneo/jornada especial el {fecha} y necesitamos toda la ayuda posible.\n\n🏟️ Lugar: {lugar}\n📅 Fecha: {fecha}\n⏰ Hora: {hora}\n\n🔹 Barra y cocina\n🔹 Organización y logística\n🔹 Montaje y desmontaje\n🔹 Acompañamiento de equipos\n\nVa a ser un día genial para el club. ¡Cuantos más seamos, mejor saldrá todo!\n\n¿Te animas? 🙌",
  },
  {
    emoji: "🎉",
    nombre: "Fiesta / Evento social",
    asunto: "🎉 ¡Evento del club! ¿Nos echas una mano?",
    mensaje: "¡Hola familia! 🎊\n\nEstamos organizando un evento especial del club el {fecha} y necesitamos voluntarios para que salga redondo.\n\n📍 Lugar: {lugar}\n📅 Fecha: {fecha}\n⏰ Hora: {hora}\n\nNecesitamos ayuda con:\n🔹 Preparación del espacio\n🔹 Atención a los asistentes\n🔹 Barra / comida\n🔹 Recogida al final\n\n¡Va a ser un planazo! ¿Te apuntas? 😊",
  },
  {
    emoji: "🚛",
    nombre: "Logística / Transporte",
    asunto: "🚛 Necesitamos ayuda con transporte",
    mensaje: "¡Hola! 👋\n\nEl {fecha} necesitamos ayuda con el transporte y la logística para un desplazamiento.\n\n📍 Destino: {lugar}\n📅 Fecha: {fecha}\n⏰ Hora de salida: {hora}\n\nSi tienes coche y puedes llevar a algunos jugadores, nos vendría genial. También necesitamos ayuda para cargar/descargar material.\n\n¡Gracias por vuestro apoyo! 🙏",
  },
  {
    emoji: "📸",
    nombre: "Fotografía / Vídeo",
    asunto: "📸 ¿Puedes hacer fotos en el próximo evento?",
    mensaje: "¡Hola! 📷\n\nEl {fecha} tenemos un evento importante y nos encantaría tener fotos y/o vídeos para recordarlo.\n\n📍 Lugar: {lugar}\n📅 Fecha: {fecha}\n⏰ Hora: {hora}\n\nSi te gusta la fotografía o simplemente puedes sacar unas fotos con el móvil, ¡nos ayudaría mucho!\n\nLas fotos se compartirán en la galería del club. 🖼️\n\n¡Gracias!",
  },
  {
    emoji: "🔧",
    nombre: "Mantenimiento / Montaje",
    asunto: "🔧 Jornada de mantenimiento del campo",
    mensaje: "¡Hola voluntarios! 🛠️\n\nVamos a organizar una jornada de mantenimiento y mejoras en las instalaciones el {fecha}.\n\n📍 Lugar: {lugar}\n📅 Fecha: {fecha}\n⏰ Hora: {hora}\n\nTareas previstas:\n🔹 Limpieza general\n🔹 Pequeñas reparaciones\n🔹 Pintura / acondicionamiento\n🔹 Preparación de vestuarios\n\n¡Entre todos lo dejamos como nuevo! 💪\n\n¿Puedes venir?",
  },
];

function buildEmailHtml(asunto, mensaje, fecha, hora, lugar) {
  const mensajeHtml = mensaje.replace(/\n/g, '<br/>');
  return `
<div style="font-family:'Segoe UI',system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;background:#f5f5f5;padding:20px">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ea580c;border-radius:16px 16px 0 0">
    <tr>
      <td align="center" style="padding:28px 24px">
        <table cellpadding="0" cellspacing="0"><tr><td style="font-size:40px;line-height:1">⚽</td></tr></table>
        <h1 style="color:#ffffff;margin:12px 0 0;font-size:20px;font-weight:800">${asunto}</h1>
        <p style="color:#ffffff;margin:6px 0 0;font-size:13px;font-weight:600;opacity:0.85">CD Bustarviejo &middot; Voluntariado</p>
      </td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-left:1px solid #e0e0e0;border-right:1px solid #e0e0e0">
    <tr>
      <td style="padding:24px">
        ${(fecha || hora || lugar) ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f0fdf4;border:2px solid #86efac;border-radius:10px;margin-bottom:20px">
          <tr>
            <td style="padding:14px">
              ${fecha ? `<div style="margin-bottom:8px"><strong style="color:#166534;font-size:13px">📅 Fecha:</strong> <span style="color:#000000;font-size:15px;font-weight:700">${fecha}</span></div>` : ''}
              ${hora ? `<div style="margin-bottom:8px"><strong style="color:#166534;font-size:13px">⏰ Hora:</strong> <span style="color:#000000;font-size:15px;font-weight:700">${hora}</span></div>` : ''}
              ${lugar ? `<div><strong style="color:#166534;font-size:13px">📍 Lugar:</strong> <span style="color:#000000;font-size:15px;font-weight:700">${lugar}</span></div>` : ''}
            </td>
          </tr>
        </table>` : ''}
        <div style="color:#1a1a1a;line-height:1.7;font-size:15px">${mensajeHtml}</div>
      </td>
    </tr>
  </table>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#1e293b;border-radius:0 0 16px 16px">
    <tr>
      <td align="center" style="padding:18px 24px">
        <p style="color:#f1f5f9;font-size:12px;margin:0;font-weight:600">🤝 Gracias por ser parte del voluntariado del club</p>
        <p style="color:#94a3b8;font-size:11px;margin:6px 0 0">CD Bustarviejo &middot; <a href="https://app.cdbustarviejo.com" style="color:#fb923c;text-decoration:none;font-weight:600">app.cdbustarviejo.com</a></p>
      </td>
    </tr>
  </table>
</div>`;
}

export default function ConvocarVoluntariosDialog({ open, onOpenChange, volunteers, senderUser }) {
  const [asunto, setAsunto] = useState("🤝 Voluntariado CD Bustarviejo");
  const [mensaje, setMensaje] = useState("");
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [lugar, setLugar] = useState("Campo de Fútbol de Bustarviejo");
  const [viaApp, setViaApp] = useState(true);
  const [viaEmail, setViaEmail] = useState(true);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [showPlantillas, setShowPlantillas] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);

  const activeVolunteers = (volunteers || []).filter(v => v.activo !== false);
  const emails = [...new Set(activeVolunteers.map(v => v.email).filter(Boolean))];

  const applyPlantilla = (plantilla) => {
    let msg = plantilla.mensaje;
    if (fecha) msg = msg.replace(/\{fecha\}/g, fecha);
    if (hora) msg = msg.replace(/\{hora\}/g, hora);
    if (lugar) msg = msg.replace(/\{lugar\}/g, lugar);
    // Si no hay fecha/hora/lugar aún, dejar los placeholders visibles para que el usuario los rellene
    setAsunto(plantilla.asunto);
    setMensaje(msg);
    setShowPlantillas(false);
  };

  const generateWithAI = async () => {
    if (!fecha && !hora) {
      toast.error("Indica al menos la fecha o la hora para generar un mensaje");
      return;
    }
    setAiLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Genera un mensaje corto, cercano y motivador para convocar voluntarios de un club de fútbol (CD Bustarviejo).
Datos del evento:
- Fecha: ${fecha || "por determinar"}
- Hora: ${hora || "por determinar"}
- Lugar: ${lugar || "Campo de Fútbol de Bustarviejo"}
- Contexto adicional del usuario: "${mensaje || "necesitamos voluntarios"}"

El mensaje debe:
- Ser informal y cercano (tú, no usted)
- Incluir emojis pero sin pasarse
- Mencionar claramente la fecha, hora y lugar
- Ser breve (máximo 8-10 líneas)
- Terminar con una frase motivadora
- Estar en español de España

Devuelve SOLO el mensaje, sin asunto ni encabezados.`,
        response_json_schema: {
          type: "object",
          properties: {
            asunto: { type: "string", description: "Asunto corto con emoji" },
            mensaje: { type: "string", description: "Mensaje completo" }
          }
        }
      });
      if (result.asunto) setAsunto(result.asunto);
      if (result.mensaje) setMensaje(result.mensaje);
      toast.success("✨ Mensaje generado con IA");
    } catch (e) {
      console.error("Error IA:", e);
      toast.error("Error al generar con IA");
    }
    setAiLoading(false);
  };

  const replacePlaceholders = (text) => {
    let result = text;
    if (fecha) result = result.replace(/\{fecha\}/g, fecha);
    else result = result.replace(/\{fecha\}/g, "___");
    if (hora) result = result.replace(/\{hora\}/g, hora);
    else result = result.replace(/\{hora\}/g, "___");
    if (lugar) result = result.replace(/\{lugar\}/g, lugar);
    else result = result.replace(/\{lugar\}/g, "___");
    return result;
  };

  const handleSend = async () => {
    const finalMsg = replacePlaceholders(mensaje);
    if (!finalMsg.trim()) { toast.error("Escribe un mensaje"); return; }
    if (!plazas || plazas < 1) { toast.error("Indica cuántas plazas necesitas"); return; }
    setSending(true);

    let successCount = 0;

    // 0. Crear oportunidad de voluntariado automáticamente
    let oppId = null;
    try {
      const opp = await base44.entities.VolunteerOpportunity.create({
        titulo: asunto.replace(/^[^\w]*/, '').substring(0, 100) || "Convocatoria de voluntariado",
        descripcion: finalMsg.substring(0, 500),
        categoria: "evento",
        fecha: fecha || undefined,
        hora: hora || undefined,
        ubicacion: lugar || undefined,
        plazas: plazas,
        creado_por: senderUser?.email || "",
        creado_por_nombre: senderUser?.full_name || senderUser?.email || "",
        estado: "abierta",
        publicada: true
      });
      oppId = opp.id;
    } catch (e) { console.error("Error creando oportunidad:", e); }

    const appLink = "https://app.cdbustarviejo.com/voluntariado";

    // 1. Mensaje en la app (Mensajes del Club)
    if (viaApp) {
      let appOk = 0;
      const appMsg = `🤝 ${asunto}\n\n${finalMsg}\n\n━━━━━━━━━━━━━━━\n📋 Plazas: ${plazas}\n✅ Confirma tu asistencia en la sección de Voluntariado de la app`;
      for (const email of emails) {
        try {
          const existingConvs = await base44.entities.PrivateConversation.filter({
            participante_familia_email: email,
            participante_staff_email: SYSTEM_EMAIL
          });

          let convId;
          const volunteer = activeVolunteers.find(v => v.email === email);
          
          if (existingConvs.length > 0) {
            convId = existingConvs[0].id;
            await base44.entities.PrivateConversation.update(convId, {
              ultimo_mensaje: finalMsg.substring(0, 200),
              ultimo_mensaje_fecha: new Date().toISOString(),
              ultimo_mensaje_de: "staff"
            });
          } else {
            const newConv = await base44.entities.PrivateConversation.create({
              participante_familia_email: email,
              participante_familia_nombre: volunteer?.nombre || email,
              participante_staff_email: SYSTEM_EMAIL,
              participante_staff_nombre: SYSTEM_NAME,
              participante_staff_rol: "admin",
              categoria: "General",
              ultimo_mensaje: finalMsg.substring(0, 200),
              ultimo_mensaje_fecha: new Date().toISOString(),
              ultimo_mensaje_de: "staff"
            });
            convId = newConv.id;
          }

          await base44.entities.PrivateMessage.create({
            conversacion_id: convId,
            remitente_email: SYSTEM_EMAIL,
            remitente_nombre: SYSTEM_NAME,
            remitente_tipo: "staff",
            mensaje: appMsg,
            leido: false
          });
          appOk++;
        } catch (e) { console.error("Error mensaje app:", email, e); }
      }
      if (appOk > 0) {
        successCount++;
        toast.success(`📱 Mensaje enviado a ${appOk}/${emails.length} voluntarios en la app`);
      }
    }

    // 2. Email vía Resend (con botón de confirmación)
    if (viaEmail) {
      let emailOk = 0;
      const html = buildEmailHtml(asunto, finalMsg, fecha, hora, lugar, plazas, appLink);
      for (const email of emails) {
        try {
          await base44.functions.invoke('sendEmail', {
            to: email,
            subject: asunto,
            html
          });
          emailOk++;
        } catch (e) { console.error("Error email:", email, e); }
      }
      if (emailOk > 0) {
        successCount++;
        toast.success(`📧 Email enviado a ${emailOk}/${emails.length} voluntarios`);
      }
    }

    setSending(false);
    if (successCount > 0) setSent(true);
  };

  const reset = () => {
    setSent(false);
    setMensaje("");
    setFecha("");
    setHora("");
    setShowPlantillas(false);
    onOpenChange(false);
  };

  if (sent) {
    return (
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="sm:max-w-md text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h3 className="text-xl font-bold">¡Convocatoria enviada!</h3>
          <p className="text-slate-600 text-sm">
            Se ha contactado con {activeVolunteers.length} voluntarios
            {viaApp && viaEmail ? " por la app y por email" : viaApp ? " por la app" : " por email"}.
          </p>
          <Button onClick={reset} className="w-full bg-green-600 hover:bg-green-700">Cerrar</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Send className="w-5 h-5 text-green-600" />
            Convocar {activeVolunteers.length} voluntarios
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Destinatarios */}
          <div className="bg-green-50 rounded-xl p-3">
            <p className="text-sm font-medium text-green-800 mb-2">
              👥 {activeVolunteers.length} voluntarios seleccionados
            </p>
            <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
              {activeVolunteers.slice(0, 10).map(v => (
                <Badge key={v.id} variant="secondary" className="text-xs">{v.nombre}</Badge>
              ))}
              {activeVolunteers.length > 10 && (
                <Badge variant="outline" className="text-xs">+{activeVolunteers.length - 10} más</Badge>
              )}
            </div>
          </div>

          {/* Fecha, Hora, Lugar */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" /> Fecha
              </label>
              <Input type="date" value={fecha} onChange={e => setFecha(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Hora
              </label>
              <Input type="time" value={hora} onChange={e => setHora(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Lugar
            </label>
            <Input value={lugar} onChange={e => setLugar(e.target.value)} placeholder="Campo de Fútbol de Bustarviejo" />
          </div>

          {/* Plantillas rápidas */}
          <div>
            <button
              onClick={() => setShowPlantillas(!showPlantillas)}
              className="w-full flex items-center justify-between p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors border border-purple-200"
            >
              <span className="text-sm font-medium text-purple-800 flex items-center gap-2">
                ✨ Mensajes precargados
              </span>
              <ChevronDown className={`w-4 h-4 text-purple-600 transition-transform ${showPlantillas ? 'rotate-180' : ''}`} />
            </button>
            {showPlantillas && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                {PLANTILLAS.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => applyPlantilla(p)}
                    className="p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-green-400 hover:bg-green-50 transition-all text-left"
                  >
                    <span className="text-xl block mb-1">{p.emoji}</span>
                    <span className="text-xs font-medium text-slate-700">{p.nombre}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Botón IA */}
          <Button
            onClick={generateWithAI}
            disabled={aiLoading}
            variant="outline"
            className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
          >
            {aiLoading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generando con IA...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Generar mensaje con IA</>
            )}
          </Button>

          {/* Asunto */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Asunto</label>
            <Input value={asunto} onChange={e => setAsunto(e.target.value)} placeholder="Asunto del mensaje" />
          </div>

          {/* Mensaje */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-1 block">Mensaje *</label>
            <Textarea
              value={mensaje}
              onChange={e => setMensaje(e.target.value)}
              placeholder="Escribe tu mensaje o usa una plantilla de arriba..."
              rows={6}
              className="resize-none"
            />
            {mensaje && (mensaje.includes('{fecha}') || mensaje.includes('{hora}') || mensaje.includes('{lugar}')) && (
              <p className="text-xs text-amber-600 mt-1">
                💡 Los campos {'{fecha}'}, {'{hora}'} y {'{lugar}'} se reemplazarán automáticamente al enviar
              </p>
            )}
          </div>

          {/* Vías de contacto */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Enviar por:</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors border-2 border-blue-200">
                <Checkbox checked={viaApp} onCheckedChange={setViaApp} />
                <Bell className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <span className="font-medium text-sm">Mensaje en la app</span>
                  <p className="text-xs text-slate-500">Les llega a "Mensajes del Club"</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 text-[10px]">Recomendado</Badge>
              </label>

              <label className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors border-2 border-orange-200">
                <Checkbox checked={viaEmail} onCheckedChange={setViaEmail} />
                <Mail className="w-5 h-5 text-orange-600" />
                <div className="flex-1">
                  <span className="font-medium text-sm">Email</span>
                  <p className="text-xs text-slate-500">Correo bonito a {emails.length} direcciones</p>
                </div>
              </label>
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !mensaje.trim() || (!viaApp && !viaEmail)}
            className="w-full bg-green-600 hover:bg-green-700 py-6 text-base font-bold"
          >
            {sending ? (
              <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> Enviando...</>
            ) : (
              <><Send className="w-5 h-5 mr-2" /> Enviar convocatoria</>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}