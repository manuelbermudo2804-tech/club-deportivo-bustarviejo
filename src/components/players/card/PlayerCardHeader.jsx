import React from "react";
import { Badge } from "@/components/ui/badge";
import { User, FileCheck } from "lucide-react";

const sportColors = {
  "Fútbol Masculino": "bg-blue-500",
  "Fútbol Femenino": "bg-pink-500",
  "Baloncesto": "bg-orange-500"
};

const sportIcons = {
  "Fútbol Masculino": "⚽",
  "Fútbol Femenino": "⚽",
  "Baloncesto": "🏀"
};

export default function PlayerCardHeader({ player, seasonConfig, fichaCompleta, completedItems, totalItems }) {
  return (
    <div className="relative">
      {player.foto_url ? (
        <img
          src={player.foto_url}
          alt={player.nombre}
          className="w-full h-48 object-cover"
        />
      ) : (
        <div className="w-full h-48 bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center">
          <User className="w-20 h-20 text-white/50" />
        </div>
      )}

      {player.numero_camiseta && (
        <div className="absolute top-3 right-3 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
          {player.numero_camiseta}
        </div>
      )}

      <div className="absolute top-3 left-3 flex flex-col gap-1">
        {player.estado_renovacion === "pendiente" && seasonConfig?.permitir_renovaciones ? (
          <Badge className="bg-red-600 text-white animate-pulse shadow-lg">
            ⚠️ RENOVAR JUGADOR
          </Badge>
        ) : player.estado_renovacion === "no_renueva" && seasonConfig?.permitir_renovaciones ? (
          <Badge className="bg-slate-600 text-white shadow-lg">
            ❌ NO RENUEVA
          </Badge>
        ) : player.activo ? (
          <Badge className="bg-green-500 text-white">Activo</Badge>
        ) : !seasonConfig?.permitir_renovaciones && !player.activo ? (
          <Badge className="bg-slate-500 text-white">Inactivo</Badge>
        ) : (
          <Badge className="bg-yellow-500 text-white animate-pulse">⚠️ PENDIENTE RENOVAR</Badge>
        )}
        {player.categoria_requiere_revision && (
          <Badge className="bg-orange-500 text-white text-[10px] animate-pulse">
            🔍 Revisar categoría
          </Badge>
        )}
        {fichaCompleta ? (
          <Badge className="bg-emerald-600 text-white text-[10px]">
            <FileCheck className="w-3 h-3 mr-1" />
            Ficha completa
          </Badge>
        ) : (
          <Badge className="bg-amber-500 text-white text-[10px] animate-pulse">
            ⚠️ {completedItems}/{totalItems} completo
          </Badge>
        )}
      </div>

      <div className="absolute bottom-3 left-3">
        <Badge className={`${sportColors[player.deporte] || "bg-slate-500"} text-white`}>
          {sportIcons[player.deporte] || "🏅"} {player.deporte}
        </Badge>
      </div>
    </div>
  );
}