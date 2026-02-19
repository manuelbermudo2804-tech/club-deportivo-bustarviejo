import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, Phone, Mail, AlertTriangle, Calendar, Pencil } from "lucide-react";
import PlayerDetailDialog from "./PlayerDetailDialog";
import PlayerAvailabilityDialog from "./PlayerAvailabilityDialog";
import PlayerPositionDialog from "./PlayerPositionDialog";

const positionColors = {
  "Portero": "from-blue-500 to-blue-600",
  "Defensa": "from-green-500 to-green-600",
  "Centrocampista": "from-yellow-500 to-yellow-600",
  "Medio": "from-yellow-500 to-amber-600",
  "Delantero": "from-red-500 to-red-600"
};

const positionEmojis = {
  "Portero": "🧤",
  "Defensa": "🛡️",
  "Medio": "🎯",
  "Centrocampista": "🎯",
  "Delantero": "⚡"
};

const calcAge = (d) => {
  if (!d) return null;
  const b = new Date(d), t = new Date();
  let a = t.getFullYear() - b.getFullYear();
  if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--;
  return a;
};

export default function RosterPlayerCard({ player, onUpdateAvailability, onUpdatePosition, isUpdating }) {
  const [showDetail, setShowDetail] = useState(false);
  const [showAvailability, setShowAvailability] = useState(false);
  const [showPosition, setShowPosition] = useState(false);
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
      <PlayerPositionDialog
        player={player}
        open={showPosition}
        onOpenChange={setShowPosition}
        onSave={(data) => {
          if (onUpdatePosition) onUpdatePosition(player.id, data);
          setShowPosition(false);
        }}
        isSaving={isUpdating}
      />
      <Card 
        className={`group border-none shadow-md hover:shadow-xl transition-all duration-300 bg-white overflow-hidden rounded-2xl ${
          isUnavailable ? "ring-2 ring-amber-400" : "hover:ring-2 hover:ring-blue-300"
        }`}
      >
      <div className="relative cursor-pointer" onClick={() => setShowDetail(true)}>
        {player.foto_url ? (
          <img
            src={player.foto_url}
            alt={player.nombre}
            className={`w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500 ${isUnavailable ? "opacity-50 grayscale" : ""}`}
          />
        ) : (
          <div className={`w-full h-36 bg-gradient-to-br from-blue-400 to-indigo-600 flex items-center justify-center ${isUnavailable ? "opacity-50" : ""}`}>
            <User className="w-14 h-14 text-white/30" />
          </div>
        )}
        
        {/* Overlay gradiente inferior */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Nombre sobre la imagen */}
        <div className="absolute bottom-0 left-0 right-0 p-2.5">
          <h3 className="font-bold text-sm text-white truncate drop-shadow-lg">{player.nombre}</h3>
          <button
            onClick={(e) => { e.stopPropagation(); setShowPosition(true); }}
            className={`inline-flex items-center gap-1 text-[10px] font-semibold text-white/90 bg-gradient-to-r ${
              player.posicion && player.posicion !== "Sin asignar"
                ? positionColors[player.posicion] || "from-slate-500 to-slate-600"
                : "from-slate-500 to-slate-600"
            } px-2 py-0.5 rounded-full mt-1 hover:opacity-80 transition-opacity`}
            title="Cambiar posición"
          >
            {positionEmojis[player.posicion] || "⚽"} {player.posicion || "Sin asignar"}
            <Pencil className="w-2.5 h-2.5 ml-0.5" />
          </button>
        </div>

        {/* Número de camiseta */}
        {player.numero_camiseta && (
          <div className="absolute top-2 right-2 w-9 h-9 bg-slate-900/80 backdrop-blur text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg border-2 border-white/30">
            {player.numero_camiseta}
          </div>
        )}

        {/* Edad */}
        {calcAge(player.fecha_nacimiento) && (
          <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm text-slate-700 text-[10px] font-bold px-2 py-1 rounded-full shadow">
            {calcAge(player.fecha_nacimiento)} años
          </div>
        )}

        {/* Badge de no disponible */}
        {isUnavailable && (
          <div className="absolute top-10 left-2">
            <Badge className="bg-amber-500/90 text-white text-[10px] animate-pulse shadow-lg">
              {player.lesionado ? "🤕 Lesionado" : "🚫 Sancionado"}
            </Badge>
          </div>
        )}
      </div>

      <CardContent className="p-3 space-y-2">
        {/* Motivo de indisponibilidad */}
        {isUnavailable && player.motivo_indisponibilidad && (
          <div className="text-[10px] text-amber-700 bg-amber-50 p-2 rounded-lg border border-amber-200">
            <p className="font-medium leading-tight">{player.motivo_indisponibilidad}</p>
            {player.fecha_disponibilidad && (
              <p className="text-amber-600 mt-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Vuelve: {new Date(player.fecha_disponibilidad).toLocaleDateString('es-ES')}
              </p>
            )}
          </div>
        )}

        {/* Contactos compactos */}
        <div className="space-y-1">
          {player.telefono && (
            <a 
              href={`tel:${player.telefono}`}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-blue-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{player.telefono}</span>
            </a>
          )}
          {player.email_padre && (
            <a 
              href={`mailto:${player.email_padre}`}
              className="flex items-center gap-1.5 text-[11px] text-slate-500 truncate hover:text-blue-600 transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{player.email_padre}</span>
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
            className={`w-full text-[11px] rounded-xl h-8 ${
              isUnavailable 
                ? "border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100" 
                : "border-slate-200 text-slate-500 hover:bg-green-50 hover:text-green-700 hover:border-green-400"
            }`}
          >
            <AlertTriangle className="w-3 h-3 mr-1" />
            {isUnavailable ? "Gestionar" : "Disponibilidad"}
          </Button>
        )}
      </CardContent>
    </Card>
  </>
  );
}