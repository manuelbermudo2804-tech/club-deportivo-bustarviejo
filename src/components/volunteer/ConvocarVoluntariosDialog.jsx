import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Send, Mail, MessageCircle, Bell, Loader2, Copy } from "lucide-react";

const SYSTEM_EMAIL = "sistema@cdbustarviejo.com";
const SYSTEM_NAME = "Voluntariado CD Bustarviejo";

export default function ConvocarVoluntariosDialog({ open, onOpenChange, volunteers, senderUser }) {
  const [asunto, setAsunto] = useState("Voluntariado CD Bustarviejo");
  const [mensaje, setMensaje] = useState("");
  const [viaApp, setViaApp] = useState(true);
  const [viaEmail, setViaEmail] = useState(false);
  const [viaWhatsapp, setViaWhatsapp] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [whatsappCopied, setWhatsappCopied] = useState(false);

  const activeVolunteers = (volunteers || []).filter(v => v.activo !== false);
  const emails = [...new Set(activeVolunteers.map(v => v.email).filter(Boolean))];
  const phones = activeVolunteers.filter(v => v.telefono).map(v => ({ nombre: v.nombre, telefono: v.telefono }));

  const handleSend = async () => {
    if (!mensaje.trim()) { toast.error("Escribe un mensaje"); return; }
    setSending(true);

    let successCount = 0;

    // 1. Mensaje en la app → PrivateConversation + PrivateMessage (Mensajes del Club)
    if (viaApp) {
      let appOk = 0;
      for (const email of emails) {
        try {
          // Buscar conversación existente con este padre desde sistema
          const existingConvs = await base44.entities.PrivateConversation.filter({
            participante_familia_email: email,
            participante_staff_email: SYSTEM_EMAIL
          });

          let convId;
          const volunteer = activeVolunteers.find(v => v.email === email);
          
          if (existingConvs.length > 0) {
            convId = existingConvs[0].id;
            // Actualizar último mensaje
            await base44.entities.PrivateConversation.update(convId, {
              ultimo_mensaje: mensaje.substring(0, 200),
              ultimo_mensaje_fecha: new Date().toISOString(),
              ultimo_mensaje_de: "staff"
            });
          } else {
            // Crear nueva conversación
            const newConv = await base44.entities.PrivateConversation.create({
              participante_familia_email: email,
              participante_familia_nombre: volunteer?.nombre || email,
              participante_staff_email: SYSTEM_EMAIL,
              participante_staff_nombre: SYSTEM_NAME,
              participante_staff_rol: "admin",
              categoria: "General",
              ultimo_mensaje: mensaje.substring(0, 200),
              ultimo_mensaje_fecha: new Date().toISOString(),
              ultimo_mensaje_de: "staff"
            });
            convId = newConv.id;
          }

          // Crear mensaje
          await base44.entities.PrivateMessage.create({
            conversacion_id: convId,
            remitente_email: SYSTEM_EMAIL,
            remitente_nombre: SYSTEM_NAME,
            remitente_tipo: "staff",
            mensaje: `🤝 ${asunto || "Voluntariado"}\n\n${mensaje}`,
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

    // 2. Email masivo (usando integración Core.SendEmail que SÍ funciona)
    if (viaEmail) {
      let emailOk = 0;
      for (const email of emails) {
        try {
          await base44.integrations.Core.SendEmail({
            to: email,
            subject: asunto || "Voluntariado CD Bustarviejo",
            body: `<div style="font-family:system-ui;max-width:600px;margin:0 auto">
              <div style="background:linear-gradient(135deg,#16a34a,#15803d);padding:20px;border-radius:12px 12px 0 0;text-align:center">
                <h2 style="color:white;margin:0">🤝 Voluntariado CD Bustarviejo</h2>
              </div>
              <div style="background:white;padding:24px;border:1px solid #e2e8f0;border-radius:0 0 12px 12px">
                <p style="white-space:pre-wrap;color:#334155;line-height:1.6">${mensaje}</p>
                <hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0"/>
                <p style="color:#94a3b8;font-size:13px;text-align:center">CD Bustarviejo · Voluntariado</p>
              </div>
            </div>`
          });
          emailOk++;
        } catch (e) { console.error("Error email:", email, e); }
      }
      if (emailOk > 0) {
        successCount++;
        toast.success(`📧 Email enviado a ${emailOk}/${emails.length} voluntarios`);
      }
    }

    // 3. WhatsApp: copiar TODOS los enlaces al portapapeles de una vez
    if (viaWhatsapp && phones.length > 0) {
      const encodedMsg = encodeURIComponent(mensaje);
      const phoneList = phones.map(p => {
        const clean = p.telefono.replace(/\D/g, "");
        const intl = clean.startsWith("34") ? clean : `34${clean}`;
        return `${p.nombre}: https://wa.me/${intl}?text=${encodedMsg}`;
      }).join("\n\n");
      
      try {
        await navigator.clipboard.writeText(phoneList);
        setWhatsappCopied(true);
        toast.success(`💬 ${phones.length} enlaces WhatsApp copiados. Pégalos donde quieras.`);
        successCount++;
      } catch {
        toast.error("No se pudo copiar al portapapeles");
      }
    }

    setSending(false);
    if (successCount > 0) setSent(true);
  };

  const reset = () => {
    setSent(false);
    setMensaje("");
    onOpenChange(false);
  };

  if (sent) {
    return (
      <Dialog open={open} onOpenChange={reset}>
        <DialogContent className="sm:max-w-md text-center space-y-4">
          <div className="text-6xl">✅</div>
          <h3 className="text-xl font-bold">¡Convocatoria enviada!</h3>
          <p className="text-slate-600 text-sm">
            Se ha contactado con {activeVolunteers.length} voluntarios por las vías seleccionadas.
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
              {activeVolunteers.slice(0, 15).map(v => (
                <Badge key={v.id} variant="secondary" className="text-xs">{v.nombre}</Badge>
              ))}
              {activeVolunteers.length > 15 && (
                <Badge variant="outline" className="text-xs">+{activeVolunteers.length - 15} más</Badge>
              )}
            </div>
          </div>

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
              placeholder="Ej: Mañana somos sede y necesitamos abrir el bar a las 9h. ¿Puedes venir?"
              rows={4}
              className="resize-none"
            />
          </div>

          {/* Vías de contacto */}
          <div>
            <label className="text-sm font-medium text-slate-700 mb-2 block">Enviar por:</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                <Checkbox checked={viaApp} onCheckedChange={setViaApp} />
                <Bell className="w-5 h-5 text-blue-600" />
                <div className="flex-1">
                  <span className="font-medium text-sm">Notificación en la app</span>
                  <p className="text-xs text-slate-500">Les llega como mensaje del club</p>
                </div>
                <Badge className="bg-blue-100 text-blue-700 text-[10px]">Recomendado</Badge>
              </label>

              <label className="flex items-center gap-3 p-3 bg-orange-50 rounded-xl cursor-pointer hover:bg-orange-100 transition-colors">
                <Checkbox checked={viaEmail} onCheckedChange={setViaEmail} />
                <Mail className="w-5 h-5 text-orange-600" />
                <div className="flex-1">
                  <span className="font-medium text-sm">Email</span>
                  <p className="text-xs text-slate-500">Correo electrónico a {emails.length} direcciones</p>
                </div>
              </label>

              <label className="flex items-center gap-3 p-3 bg-green-50 rounded-xl cursor-pointer hover:bg-green-100 transition-colors">
                <Checkbox checked={viaWhatsapp} onCheckedChange={setViaWhatsapp} />
                <MessageCircle className="w-5 h-5 text-green-600" />
                <div className="flex-1">
                  <span className="font-medium text-sm">WhatsApp</span>
                  <p className="text-xs text-slate-500">Copia enlaces wa.me individuales ({phones.length} teléfonos)</p>
                </div>
              </label>
            </div>
          </div>

          <Button
            onClick={handleSend}
            disabled={sending || !mensaje.trim() || (!viaApp && !viaEmail && !viaWhatsapp)}
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