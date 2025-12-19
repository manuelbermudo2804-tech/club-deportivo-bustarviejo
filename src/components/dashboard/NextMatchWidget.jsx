import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trophy, MapPin, Calendar, Clock, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function NextMatchWidget({ myPlayers = [] }) {
  const [showAllMatches, setShowAllMatches] = useState(false);

  const { data: allCallups = [] } = useQuery({
    queryKey: ['nextMatchCallups'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    staleTime: 60000,
  });

  const today = new Date().toISOString().split('T')[0];
  
  // Filtrar convocatorias relevantes para mis jugadores
  const myCallups = allCallups.filter(c => {
    if (!c.publicada || c.cerrada || c.fecha_partido < today) return false;
    return c.jugadores_convocados?.some(j => 
      myPlayers.some(p => p.id === j.jugador_id)
    );
  });

  // Ordenar por fecha + hora
  const sortedCallups = myCallups.sort((a, b) => {
    const dateCompare = a.fecha_partido.localeCompare(b.fecha_partido);
    if (dateCompare !== 0) return dateCompare;
    return (a.hora_partido || "").localeCompare(b.hora_partido || "");
  });

  const nextMatch = sortedCallups[0];
  const additionalMatches = sortedCallups.length - 1;

  const openGoogleMaps = (callup) => {
    if (callup.enlace_ubicacion) {
      window.open(callup.enlace_ubicacion, '_blank');
    } else if (callup.ubicacion) {
      const query = encodeURIComponent(callup.ubicacion);
      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }
  };

  if (!nextMatch) {
    return (
      <Card className="border-2 border-slate-300 bg-gradient-to-br from-slate-50 to-slate-100">
        <CardContent className="p-4 text-center">
          <Trophy className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-600">Sin partidos próximos</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowAllMatches(true)}
        className="w-full text-left h-full"
      >
        <Card className="border-2 border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 hover:scale-105 transition-all shadow-lg cursor-pointer h-full">
          <CardContent className="p-4 h-full flex flex-col">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-green-700 flex-shrink-0" />
                <p className="font-bold text-green-900 text-sm">⚽ PRÓXIMO PARTIDO</p>
              </div>
              {additionalMatches > 0 && (
                <span className="bg-green-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  +{additionalMatches} más
                </span>
              )}
            </div>
            <p className="font-bold text-slate-900 text-base mb-1">{nextMatch.titulo}</p>
            <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(new Date(nextMatch.fecha_partido), "EEE d MMM", { locale: es })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {nextMatch.hora_partido}
              </span>
            </div>
            <div className="flex-1"></div>
            <Button 
              size="sm" 
              className="w-full bg-green-600 hover:bg-green-700 text-white mt-auto"
              onClick={(e) => {
                e.stopPropagation();
                openGoogleMaps(nextMatch);
              }}
            >
              <MapPin className="w-4 h-4 mr-2" />
              📍 Cómo Llegar
            </Button>
          </CardContent>
        </Card>
      </button>

      <Dialog open={showAllMatches} onOpenChange={setShowAllMatches}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-600" />
              Próximos Partidos ({sortedCallups.length})
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {sortedCallups.map((callup) => (
              <Card key={callup.id} className="border-2 border-slate-200">
                <CardContent className="p-3">
                  <p className="font-bold text-sm text-slate-900 mb-1">{callup.categoria}</p>
                  <p className="text-sm text-slate-700 mb-2">{callup.titulo}</p>
                  <div className="flex items-center gap-3 text-xs text-slate-600 mb-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {format(new Date(callup.fecha_partido), "EEEE d MMM", { locale: es })}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {callup.hora_partido}
                    </span>
                  </div>
                  {callup.ubicacion && (
                    <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {callup.ubicacion}
                    </p>
                  )}
                  <Button 
                    size="sm" 
                    className="w-full bg-green-600 hover:bg-green-700"
                    onClick={() => openGoogleMaps(callup)}
                  >
                    <MapPin className="w-4 h-4 mr-2" />
                    📍 Cómo Llegar
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}