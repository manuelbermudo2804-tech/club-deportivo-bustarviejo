import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export default function RecordarFirmaButton({ player, pendientes }) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const enviar = async () => {
    const destinatarios = [player.email_padre, player.email_tutor_2].filter(Boolean);
    if (destinatarios.length === 0) {
      toast.error("Este jugador no tiene email de familia registrado");
      return;
    }

    setSending(true);
    const fallidos = [];

    for (const to of destinatarios) {
      try {
        const res = await base44.functions.invoke("sendEmail", {
          to,
          subject: `⏰ Recordatorio: Firmas pendientes - ${player.nombre}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
            <div style="background:linear-gradient(135deg,#f59e0b,#ea580c);padding:20px;text-align:center;border-radius:10px 10px 0 0;">
              <h1 style="color:white;margin:0;">🖊️ Firmas Pendientes</h1>
            </div>
            <div style="background:#fff;padding:30px;border:1px solid #e5e7eb;">
              <p>Hola,</p>
              <p>Te recordamos que <strong>${player.nombre}</strong> tiene firmas de federación <strong>pendientes</strong>:</p>
              <ul>${pendientes.map((p) => `<li><strong>${p}</strong></li>`).join("")}</ul>
              <p>Por favor, accede a la app y completa las firmas lo antes posible.</p>
              <div style="text-align:center;margin:24px 0;">
                <a href="https://app.cdbustarviejo.com" style="background:#ea580c;color:#fff;padding:12px 20px;text-decoration:none;border-radius:10px;font-weight:bold;display:inline-block;">Abrir la app →</a>
              </div>
            </div>
          </div>`,
        });
        if (res?.data?.error) fallidos.push(`${to}: ${res.data.error}`);
      } catch (e) {
        fallidos.push(`${to}: ${e.message}`);
      }
    }

    setSending(false);

    if (fallidos.length === destinatarios.length) {
      toast.error(`No se pudo enviar. ${fallidos[0]}`);
      return;
    }
    setSent(true);
    const ok = destinatarios.length - fallidos.length;
    toast.success(`📧 Recordatorio enviado (${ok} destinatario${ok !== 1 ? "s" : ""})`);
    if (fallidos.length > 0) toast.error(`Falló para: ${fallidos.join(" · ")}`);
  };

  return (
    <Button
      onClick={enviar}
      disabled={sending}
      variant="outline"
      size="sm"
      className="text-orange-600 border-orange-300 hover:bg-orange-50 text-xs"
    >
      {sending ? (
        <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Enviando...</>
      ) : sent ? (
        <><CheckCircle2 className="w-3 h-3 mr-1" /> Enviado</>
      ) : (
        <><Send className="w-3 h-3 mr-1" /> Recordar</>
      )}
    </Button>
  );
}