import React from "react";
import { ExternalLink, Globe } from "lucide-react";

// URL de la web pública del club (externa, no la app)
const WEB_CLUB_URL = "https://www.cdbustarviejo.com";

// Botón flotante para volver a la WEB PÚBLICA del club (no a la app interna).
// La página pública /Porra es accesible sin login, así que el botón debe llevar
// al usuario a la web externa del club, no al menú interno.
export default function PorraVolverAppButton() {
  return (
    <a
      href={WEB_CLUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed top-4 left-4 z-50 inline-flex items-center gap-2 bg-white/95 backdrop-blur-md text-slate-900 font-bold px-4 py-2.5 rounded-full shadow-2xl border-2 border-orange-400 hover:bg-orange-50 hover:scale-105 transition-all text-sm md:text-base"
    >
      <Globe className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
      <span>Web del club</span>
      <ExternalLink className="w-3.5 h-3.5 md:w-4 md:h-4 text-orange-600/70" />
    </a>
  );
}