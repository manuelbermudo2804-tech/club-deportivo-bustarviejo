import React from "react";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

// Botón "Retar a un amigo por WhatsApp"
// Genera un mensaje pre-escrito con el alias del usuario y, si tiene mini-liga,
// incluye automáticamente el código para que los amigos se unan a su liga.
export default function CompartirPorraButton({ participante, miniLigas = [] }) {
  const handleCompartir = () => {
    const alias = participante?.alias_equipo || "Mi equipo";
    const baseUrl = "https://app.cdbustarviejo.com";
    // Si tiene mini-liga(s), usamos el código de la primera para enganchar al amigo
    const primerLiga = Array.isArray(miniLigas) && miniLigas.length > 0 ? miniLigas[0] : null;
    const codigoLiga = primerLiga?.codigo || "";

    const lineasLiga = codigoLiga
      ? `\n\n👥 *Únete a mi mini-liga privada:*\nCódigo: *${codigoLiga}*\n_(introdúcelo después de apuntarte para competir directamente contra mí)_`
      : "";

    const mensaje =
      `🏆 *¡Me he metido en la Porra del Mundial 2026!* 🌎\n\n` +
      `⚽ Mi equipo se llama *"${alias}"*\n` +
      `💰 Premios al 1º, 2º y 3º clasificados\n` +
      `💚 Organizada por el CD Bustarviejo\n\n` +
      `¿Te atreves a ganarme? 😏\n` +
      `Apúntate aquí 👉 ${baseUrl}/Porra` +
      lineasLiga;

    const url = `https://wa.me/?text=${encodeURIComponent(mensaje)}`;
    try {
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      toast.error("No se pudo abrir WhatsApp");
    }
  };

  return (
    <Button
      onClick={handleCompartir}
      className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-black shadow-lg hover:scale-[1.02] transition-all border-2 border-green-400/40"
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      📲 Retar a un amigo por WhatsApp
    </Button>
  );
}