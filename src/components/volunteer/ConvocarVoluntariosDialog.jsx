import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { Send, Mail, MessageCircle, Bell, Loader2, ExternalLink } from "lucide-react";

export default function ConvocarVoluntariosDialog({ open, onOpenChange, volunteers }) {
  const [asunto, setAsunto] = useState("Voluntariado CD Bustarviejo");
  const [mensaje, setMensaje] = useState("");
  const [viaApp, setViaApp] = useState(true);
  const [viaEmail, setViaEmail] = useState(true);
  const [viaWhatsapp, setViaWhatsapp] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const activeVolunteers = (volunteers || []).filter(v => v.activo !== false);
  const emails = [...new Set(activeVolunteers.map(v => v.email).filter(Boolean))];
  const phones = activeVolunteers.filter(v => v.telefono).map(v => ({ nombre: v.nombre, telefono: v.telefono }));

  const handleSend = async () => {
    if (!mensaje.trim()) { toast.error("Escribe un mensaje"); return; }
    setSending(true);

    let successCount = 0;

    // 1. Notificación en la app (Announcement dirigido a voluntarios)
    if (viaApp) {
      try {
        await base44.entities.Announcement.create({
          titulo: asunto || "Voluntariado",
          contenido: mensaje,
          prioridad: "Importante",
          destinatarios_tipo: "Todos",
          destinatarios_emails: emails,
          publicado: true,
          enviar_email: false,
          fecha_publicacion: new Date().toISOString()
        });
        successCount++;
        toast.success(`📱 Notificación enviada a ${emails.length} voluntarios en la app`);
      } catch (e) {
        console.error("Error notificación app:", e);
        toast.error("Error al enviar notificación en la app");
      }
    }

    // 2. Email masivo
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

    // 3. WhatsApp: copiar teléfonos y abrir enlaces
    if (viaWhatsapp && phones.length > 0) {
      const encodedMsg = encodeURIComponent(mensaje);
      // Copiar lista al portapapeles
      const phoneList = phones.map(p => {
        const clean = p.telefono.replace(/\D/g, "");
        const intl = clean.startsWith("34") ? clean : `34${clean}`;
        return `${p.nombre}: wa.me/${intl}?text=${encodedMsg}`;
      }).join("\n");
      
      try {
        await navigator.clipboard.writeText(phoneList);
        toast.success(`💬 ${phones.length} enlaces WhatsApp copiados al portapapeles`);
        successCount++;
      } catch {
        toast.error("No se pudo copiar al portapapeles");
      }

      // Abrir el primer enlace como ejemplo
      if (phones.length > 0) {
        const first = phones[0].telefono.replace(/\D/g, "");
        const firstIntl = first.startsWith("34") ? first : `34${first}`;
        window.open(`https://wa.me/${firstIntl}?text=${encodedMsg}`, "_blank");
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