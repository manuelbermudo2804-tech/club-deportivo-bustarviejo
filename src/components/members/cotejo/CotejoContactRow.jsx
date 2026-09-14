import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MessageCircle, RefreshCw, Copy } from "lucide-react";
import { toast } from "sonner";
import { buildWhatsAppMessage, buildEmailContent, formatPhoneForWhatsApp } from "./mensajesCotejo";

export default function CotejoContactRow({ persona, tipo, temporada, altaUrl, onSendEmail, sending }) {
  const phone = formatPhoneForWhatsApp(persona.telefono);
  const waMessage = buildWhatsAppMessage({ nombre: persona.nombre, tipo, temporada, url: altaUrl });
  const waLink = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(waMessage)}` : null;

  const copyMessage = async () => {
    await navigator.clipboard.writeText(waMessage);
    toast.success("Mensaje copiado");
  };

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white rounded-lg border">
      <div className="min-w-0">
        <p className="font-semibold text-slate-900 truncate">{persona.nombre || "Sin nombre"}</p>
        <p className="text-sm text-slate-600 truncate">
          {persona.email ? `📧 ${persona.email}` : "📧 sin email"}
          {persona.telefono ? ` · 📱 ${persona.telefono}` : " · 📱 sin teléfono"}
        </p>
        {tipo === "ex_socio" && persona.ultima_temporada && (
          <Badge variant="outline" className="text-xs mt-1">Última temporada: {persona.ultima_temporada}</Badge>
        )}
      </div>

      <div className="flex gap-2 shrink-0">
        <Button
          size="sm"
          variant="outline"
          disabled={!persona.email || sending}
          onClick={() => onSendEmail(persona)}
        >
          {sending ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Mail className="w-4 h-4 mr-1 text-orange-600" /> Email</>}
        </Button>

        {waLink ? (
          <a href={waLink} target="_blank" rel="noopener noreferrer">
            <Button size="sm" variant="outline">
              <MessageCircle className="w-4 h-4 mr-1 text-green-600" /> WhatsApp
            </Button>
          </a>
        ) : (
          <Button size="sm" variant="outline" onClick={copyMessage} title="Sin teléfono válido: copia el mensaje">
            <Copy className="w-4 h-4 mr-1" /> Copiar
          </Button>
        )}
      </div>
    </div>
  );
}