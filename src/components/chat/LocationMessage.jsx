import React from "react";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation } from "lucide-react";

export default function LocationMessage({ ubicacion }) {
  if (!ubicacion) return null;

  const openInMaps = () => {
    const url = `https://www.google.com/maps?q=${ubicacion.latitud},${ubicacion.longitud}`;
    window.open(url, '_blank');
  };

  return (
    <div className="bg-white rounded-xl p-4 border-2 border-blue-200 shadow-sm">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-red-600" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-slate-900 mb-0.5">📍 Ubicación compartida</p>
          {ubicacion.nombre && (
            <p className="font-semibold text-sm text-slate-800">{ubicacion.nombre}</p>
          )}
          {ubicacion.direccion && (
            <p className="text-xs text-slate-600">{ubicacion.direccion}</p>
          )}
        </div>
      </div>
      
      <Button 
        size="sm" 
        onClick={openInMaps}
        className="w-full bg-blue-600 hover:bg-blue-700 shadow-md"
      >
        <Navigation className="w-4 h-4 mr-2" />
        Abrir en Google Maps
      </Button>
    </div>
  );
}