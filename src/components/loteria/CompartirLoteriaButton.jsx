import React from "react";
import { Button } from "@/components/ui/button";
import { Share2 } from "lucide-react";

const MENSAJE_POR_DEFECTO = "🍀🎄 ¡Ya está aquí la Lotería de Navidad del CD Bustarviejo! Consigue tu décimo en los comercios del pueblo o online, y ayuda al club. ¡Mucha suerte!";

export default function CompartirLoteriaButton({ mensaje }) {
  const compartir = () => {
    const url = "https://app.cdbustarviejo.com/loteria";
    const texto = `${mensaje || MENSAJE_POR_DEFECTO}\n\n${url}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <Button
      onClick={compartir}
      size="lg"
      className="w-full bg-green-600 hover:bg-green-700 text-white font-bold h-14 rounded-2xl shadow-lg"
    >
      <Share2 className="w-5 h-5 mr-2" />
      Compartir por WhatsApp
    </Button>
  );
}