import { Globe } from "lucide-react";

// Botón flotante para volver a la web pública del club desde cualquier página pública.
// Se posiciona arriba a la derecha para no chocar con BackToAppButton (arriba a la izquierda).
export default function BackToWebsiteButton({ url = "https://www.cdbustarviejo.com", position = "top-right" }) {
  const positionClasses = {
    "top-right": "top-4 right-4",
    "top-left": "top-4 left-4",
    "bottom-right": "bottom-4 right-4",
  };

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={`fixed ${positionClasses[position] || positionClasses["top-right"]} z-50 flex items-center gap-2 bg-white/90 backdrop-blur-sm text-slate-800 font-semibold text-sm px-4 py-2.5 rounded-full shadow-lg hover:bg-white hover:scale-105 active:scale-95 transition-all border border-slate-200`}
    >
      <Globe className="w-4 h-4" />
      <span className="hidden sm:inline">Web del club</span>
      <span className="sm:hidden">Web</span>
    </a>
  );
}