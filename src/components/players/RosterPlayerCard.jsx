import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Heart, Eye } from "lucide-react";
import PlayerDetailDialog from "../players/PlayerDetailDialog";

const sportIcons = {
  "Fútbol Masculino": "⚽",
  "Fútbol Femenino": "⚽",
  "Baloncesto": "🏀"
};

const positionColors = {
  "Portero": "bg-blue-500",
  "Defensa": "bg-green-500",
  "Centrocampista": "bg-yellow-500",
  "Delantero": "bg-red-500"
};

export default function RosterPlayerCard({ player }) {
  const [showDetail, setShowDetail] = useState(false);
  const hasMedicalInfo = player.ficha_medica && Object.values(player.ficha_medica).some(val => val);

  return (
    <>
      <PlayerDetailDialog
        player={player}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
      <Card 
        className="border-none shadow-md hover:shadow-lg transition-all duration-200 bg-white overflow-hidden cursor-pointer hover:border-2 hover:border-blue-400"
        onClick={() => setShowDetail(true)}
      >
        <div className="relative">
          {player.foto_url ? (
            <img
              src={player.foto_url}
              alt={player.nombre}
              className="w-full h-32 object-cover"
            />
          ) : (
            <div className="w-full h-32 bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
              <User className="w-12 h-12 text-white/50" />
            </div>
          )}
          
          {player.numero_camiseta && (
            <div className="absolute top-2 right-2 w-10 h-10 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-sm shadow-lg">
              {player.numero_camiseta}
            </div>
          )}
        </div>

        <CardContent className="p-3 space-y-2">
          <div>
            <h3 className="font-bold text-sm text-slate-900 mb-1 truncate">{player.nombre}</h3>
            <div className="flex flex-wrap gap-1 items-center">
              {player.posicion && (
                <Badge className={`${positionColors[player.posicion]} text-white text-xs py-0 px-2`}>
                  {player.posicion}
                </Badge>
              )}
              {hasMedicalInfo && (
                <Badge className="bg-red-100 text-red-700 text-xs py-0 px-2 flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  Ficha Médica
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-1 text-xs text-slate-600">
            {player.email_padre && (
              <div className="flex items-center gap-1 truncate">
                <Mail className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{player.email_padre}</span>
              </div>
            )}
            {player.telefono && (
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 flex-shrink-0" />
                <span>{player.telefono}</span>
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <div className="flex items-center justify-center gap-1 text-xs text-blue-600 font-medium">
              <Eye className="w-3 h-3" />
              <span>Click para ver detalles</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}