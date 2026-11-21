import React from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getCallupMapsUrl } from "./callupLocation";

export default function CallupMap({ ubicacion, enlaceUbicacion, localVisitante }) {
  const mapsUrl = getCallupMapsUrl({
    ubicacion,
    enlace_ubicacion: enlaceUbicacion
  });

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
          <MapPin className="w-5 h-5 text-orange-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900">{ubicacion || "Ubicación pendiente de confirmar"}</p>
          {localVisitante && (
            <span className="text-xs text-slate-500 font-medium">{localVisitante}</span>
          )}
          <div className="flex flex-wrap gap-2 mt-3">
            {mapsUrl ? (
              <>
                <Button size="sm" onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")} className="bg-orange-600 hover:bg-orange-700">
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Abrir ubicación en Google Maps
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}>
                  <Navigation className="w-3 h-3 mr-1" />
                  Cómo llegar
                </Button>
              </>
            ) : (
              <p className="text-xs text-amber-700">El club debe confirmar la ubicación exacta.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
