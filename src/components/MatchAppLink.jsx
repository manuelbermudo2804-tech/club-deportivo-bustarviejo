import React from "react";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";

export default function MatchAppLink({ className = "" }) {
  const handleMatchAppClick = (e) => {
    e.preventDefault();
    
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // URL web del club en MatchApp
    const clubUrl = "https://matchapp.online/club/cfbustarviejo";
    
    if (isIOS || isAndroid) {
      // En móvil: usar la URL web directamente
      // MatchApp detectará automáticamente si está instalada y la abrirá
      // Si no está instalada, mostrará la web y opción de descargar
      window.location.href = clubUrl;
      
    } else {
      // Desktop: abrir en nueva pestaña
      window.open(clubUrl, '_blank');
    }
  };

  return (
    <Button
      onClick={handleMatchAppClick}
      className={`bg-orange-600 hover:bg-orange-700 text-white font-bold shadow-xl ${className}`}
    >
      <Smartphone className="w-5 h-5 mr-2" />
      Abrir MatchApp
    </Button>
  );
}