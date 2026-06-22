import React from "react";
import { Check, CheckCheck } from "lucide-react";

// Doble check estilo WhatsApp para mensajes propios.
// "Leído" = alguien DISTINTO del autor aparece en leido_por (en grupo el autor
// siempre se incluye a sí mismo, así que no cuenta para el doble check azul).
export default function ReadTicks({ message, senderEmail, lightOnDark = false }) {
  const leidoPor = message?.leido_por || [];
  const leidoPorOtro = leidoPor.some(lp => lp.email && lp.email !== senderEmail);

  if (leidoPorOtro) {
    return <CheckCheck className="w-3.5 h-3.5 text-sky-500" />;
  }
  return <Check className={`w-3.5 h-3.5 ${lightOnDark ? 'text-white opacity-60' : 'opacity-50'}`} />;
}