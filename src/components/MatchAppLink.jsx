import React from "react";
import { Button } from "@/components/ui/button";
import { Smartphone } from "lucide-react";

export default function MatchAppLink({ className = "" }) {
  const handleMatchAppClick = (e) => {
    e.preventDefault();
    
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    const isAndroid = /Android/i.test(navigator.userAgent);
    
    // URL del club en MatchApp
    const clubUrl = "https://matchapp.online/club/cfbustarviejo";
    
    // Deep link para abrir la app si está instalada
    const deepLink = "matchapp://club/cfbustarviejo";
    
    if (isIOS) {
      // iOS: Intentar abrir la app, si falla ir a App Store
      const appStoreUrl = "https://apps.apple.com/es/app/matchapp/id1234567890"; // Reemplazar con el ID real
      
      // Intentar abrir deep link
      window.location.href = deepLink;
      
      // Si no se abre la app en 2 segundos, redirigir a App Store
      setTimeout(() => {
        if (document.hidden) return; // La app se abrió
        window.location.href = appStoreUrl;
      }, 2000);
      
    } else if (isAndroid) {
      // Android: Intentar abrir la app, si falla ir a Google Play
      const playStoreUrl = "https://play.google.com/store/apps/details?id=com.matchapp.app"; // Reemplazar con el package name real
      
      // Intentar abrir deep link
      window.location.href = deepLink;
      
      // Si no se abre la app en 2 segundos, redirigir a Google Play
      setTimeout(() => {
        if (document.hidden) return; // La app se abrió
        window.location.href = playStoreUrl;
      }, 2000);
      
    } else {
      // Desktop o navegador no reconocido: abrir URL web directamente
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