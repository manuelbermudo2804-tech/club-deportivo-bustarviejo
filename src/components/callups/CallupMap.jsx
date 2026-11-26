import React from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";

// Qué buscar en Google Maps: coordenadas del enlace, la búsqueda del enlace o el nombre del campo.
// Así el mapa pequeño, "Ver en Maps" y "Cómo llegar" apuntan siempre al mismo sitio.
function destinoDe(ubicacion, enlace) {
  if (enlace) {
    const coords = enlace.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/) || enlace.match(/[?&](?:q|ll|query)=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
    if (coords) return `${coords[1]},${coords[2]}`;
    try {
      const u = new URL(enlace);
      const q = u.searchParams.get("query") || u.searchParams.get("q");
      if (q) return q;
    } catch {}
  }
  return ubicacion || "";
}

export default function CallupMap({ ubicacion, enlaceUbicacion, localVisitante }) {
  const destino = destinoDe(ubicacion, enlaceUbicacion);

  const openInMaps = () => {
    window.open(enlaceUbicacion || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destino)}`, "_blank");
  };

  const openNavigation = () => {
    window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destino)}`, "_blank");
  };

  if (!destino) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <MapPin className="w-5 h-5 text-blue-600" />
        <p className="text-sm text-slate-600">Ubicación pendiente de confirmar</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl overflow-hidden border-2 border-blue-200 relative z-0">
      <iframe
        title={`Mapa: ${ubicacion || destino}`}
        src={`https://maps.google.com/maps?q=${encodeURIComponent(destino)}&z=15&output=embed`}
        className="w-full h-40 border-0 block"
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
      />
      <div className="bg-white p-3 flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-slate-900 truncate">{ubicacion}</p>
          {localVisitante && <span className="text-xs text-blue-600 font-medium">{localVisitante}</span>}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={openInMaps} className="text-xs">
            <ExternalLink className="w-3 h-3" />
          </Button>
          <Button size="sm" onClick={openNavigation} className="text-xs bg-blue-600 hover:bg-blue-700">
            <Navigation className="w-3 h-3 mr-1" />
            Ir
          </Button>
        </div>
      </div>
    </div>
  );
}