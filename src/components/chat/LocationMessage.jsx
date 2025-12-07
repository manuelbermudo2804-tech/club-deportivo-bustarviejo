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
    <div className="mt-2 bg-white/10 backdrop-blur-sm rounded-lg p-3 border border-white/20">
      <div className="flex items-center gap-2 mb-2">
        <MapPin className="w-4 h-4 text-red-500" />
        <div className="flex-1">
          {ubicacion.nombre && (
            <p className="font-semibold text-sm">{ubicacion.nombre}</p>
          )}
          {ubicacion.direccion && (
            <p className="text-xs opacity-70">{ubicacion.direccion}</p>
          )}
        </div>
      </div>
      
      <Button 
        size="sm" 
        onClick={openInMaps}
        className="w-full bg-blue-600 hover:bg-blue-700"
      >
        <Navigation className="w-4 h-4 mr-2" />
        Abrir en Google Maps
      </Button>
    </div>
  );
}