import React, { useState, useEffect } from "react";
import { ArrowLeft, Home } from "lucide-react";

// Botón flotante para volver a la app del club
// Solo se muestra si el usuario tiene la PWA instalada o ya ha estado en la app
export default function PorraVolverAppButton() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Detectar si la PWA está instalada (modo standalone)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || window.navigator.standalone === true;

    // Detectar si ya estuvo en la app (token guardado)
    const hasAppToken = !!localStorage.getItem('base44_access_token');

    // Detectar si ya marcó la app como instalada
    const installedFlag = localStorage.getItem('installCompleted') === 'true';

    if (isStandalone || hasAppToken || installedFlag) {
      setVisible(true);
    }
  }, []);

  if (!visible) return null;

  return (
    <a
      href="/"
      className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 bg-white/95 backdrop-blur-md text-slate-900 font-bold px-4 py-2.5 rounded-full shadow-2xl border-2 border-orange-400 hover:bg-orange-50 hover:scale-105 transition-all text-sm md:text-base"
    >
      <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
      <Home className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
      <span>Volver a la app del club</span>
    </a>
  );
}