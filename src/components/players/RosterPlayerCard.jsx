import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, AlertTriangle } from "lucide-react";
import PlayerDetailDialog from "./PlayerDetailDialog";
import PlayerAvailabilityDialog from "./PlayerAvailabilityDialog";

const sportIcons = {
  "Fútbol Masculino": "⚽",
  "Fútbol Femenino": "⚽",
  "Baloncesto": "🏀"
};

const positionColors = {
  "Portero": "bg-blue-500",
  "Defensa": "bg-green-500",
  "Centrocampista": "bg-yellow-500",
  "Medio": "bg-yellow-500",
  "Delantero": "bg-red-500"
};

export default function RosterPlayerCard({ player, onUpdateAvailability, isUpdating }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const hasMedicalInfo = player.ficha_medica && Object.values(player.ficha_medica).some(val => val);
  const isUnavailable = player.lesionado || player.sancionado;

  const handleSaveAvailability = (data) => {
    if (onUpdateAvailability) {
      onUpdateAvailability(player.id, data);
    }
    setShowAvailability(false);
  };

  return (
    <>
      <PlayerDetailDialog
        player={player}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
      <PlayerAvailabilityDialog
        player={player}
        open={showAvailability}
        onOpenChange={setShowAvailability}
        onSave={handleSaveAvailability}
        isSaving={isUpdating}
      />
      <Card 
        className={`border-none shadow-md hover:shadow-lg transition-all duration-200 bg-white overflow-hidden ${
          isUnavailable ? "ring-2 ring-amber-400" : ""
        }`}
      >
      <div className="relative cursor-pointer" onClick={() => setShowDetail(true)}>
        {player.foto_url ? (
          <img
            src={player.foto_url}
            alt={player.nombre}
            className={`w-full h-32 object-cover ${isUnavailable ? "opacity-60" : ""}`}
          />
        ) : (
          <div className={`w-full h-32 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center ${isUnavailable ? "opacity-60" : ""}`}>
            <User className="w-12 h-12 text-white/50" />
          </div>
        )}
        
        {player.numero_camiseta && (
          <div className="absolute top-2 right-2 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
            {player.numero_camiseta}
          </div>
        )}

        {/* Badge de no disponible */}
        {isUnavailable && (
          <div className="absolute top-2 left-2">
            <Badge className="bg-amber-500 text-white text-xs animate-pulse">
              {player.lesionado ? "🤕 Lesionado" : "🚫 Sancionado"}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        <div>
          <h3 className="font-bold text-sm text-slate-900 mb-1 truncate">{player.nombre}</h3>
          <div className="flex flex-wrap gap-1">
            {player.posicion && player.posicion !== "Sin asignar" && (
              <Badge className={`${positionColors[player.posicion] || "bg-slate-500"} text-white text-xs py-0 px-2`}>
                {player.posicion}
              </Badge>
            )}
          </div>
        </div>

        {/* Motivo de indisponibilidad */}
        {isUnavailable && player.motivo_indisponibilidad && (
          <div className="text-xs text-amber-700 bg-amber-50 p-2 rounded border border-amber-200">
            <p className="font-medium">{player.motivo_indisponibilidad}</p>
            {player.fecha_disponibilidad && (
              <p className="text-amber-600 mt-1">
                📅 Vuelve: {new Date(player.fecha_disponibilidad).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
        )}

        <div className="space-y-1 text-xs text-slate-600">
          {player.email_padre && (
            <a 
              href={`mailto:${player.email_padre}`}
              className="flex items-center gap-1 truncate hover:text-orange-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{player.email_padre}</span>
            </a>
          )}
          {player.telefono && (
            <a 
              href={`tel:${player.telefono}`}
              className="flex items-center gap-1 hover:text-orange-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{player.telefono}</span>
            </a>
          )}
        </div>

        {/* Botón para gestionar disponibilidad */}
        {onUpdateAvailability && (
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              setShowAvailability(true);
            }}
            className={`w-full text-xs ${
              isUnavailable 
                ? "border-amber-400 text-amber-700 hover:bg-amber-50" 
                : "hover:bg-green-50 hover:text-green-700 hover:border-green-400"
            }`}
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            {isUnavailable ? "Gestionar Indisponibilidad" : "Marcar No Disponible"}
          </Button>
        )}
      </CardContent>
    </Card>
  </>
  );
}