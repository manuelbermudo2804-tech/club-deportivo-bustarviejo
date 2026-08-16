import React from "react";
import { MessageCircle } from "lucide-react";

// Normaliza un teléfono español a formato wa.me (solo dígitos con prefijo 34)
export function toWhatsAppNumber(telefono) {
  if (!telefono) return null;
  const digits = String(telefono).replace(/\D/g, '');
  if (digits.length < 9) return null;
  return digits.startsWith('34') && digits.length > 9 ? digits : `34${digits.slice(-9)}`;
}

export default function WhatsAppButton({ telefono }) {
  const phone = toWhatsAppNumber(telefono);
  if (!phone) return null;
  return (
    <a
      href={`https://wa.me/${phone}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-medium rounded-lg transition-colors"
    >
      <MessageCircle className="w-3.5 h-3.5" />
      WhatsApp
    </a>
  );
}