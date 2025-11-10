
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Mail, Phone, MapPin, User } from "lucide-react";

export default function PlayerCard({ player, onEdit }) {
  const categoryColors = {
    "Prebenjamín": "bg-pink-100 text-pink-700",
    "Benjamín": "bg-orange-100 text-orange-700",
    "Alevín": "bg-yellow-100 text-yellow-700",
    "Infantil": "bg-green-100 text-green-700",
    "Cadete": "bg-blue-100 text-blue-700",
    "Juvenil": "bg-indigo-100 text-indigo-700",
    "Senior": "bg-purple-100 text-purple-700"
  };

  const positionColors = {
    "Portero": "bg-red-100 text-red-700",
    "Defensa": "bg-blue-100 text-blue-700",
    "Centrocampista": "bg-green-100 text-green-700",
    "Delantero": "bg-orange-100 text-orange-700"
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
    >
      <Card className="overflow-hidden hover:shadow-xl transition-all duration-300 border-none shadow-lg bg-white">
        <div className="relative h-48 bg-gradient-to-br from-orange-500 to-orange-700">
          {player.foto_url ? (
            <img
              src={player.foto_url}
              alt={player.nombre}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <User className="w-20 h-20 text-white opacity-50" />
            </div>
          )}
          {player.numero_camiseta && (
            <div className="absolute top-3 right-3 bg-slate-900 rounded-full w-12 h-12 flex items-center justify-center shadow-lg">
              <span className="text-xl font-bold text-orange-500">
                {player.numero_camiseta}
              </span>
            </div>
          )}
          {!player.activo && (
            <div className="absolute top-3 left-3">
              <Badge variant="secondary" className="bg-slate-800 text-white">
                Inactivo
              </Badge>
            </div>
          )}
        </div>
        
        <CardContent className="p-5 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">
              {player.nombre}
            </h3>
            <div className="flex flex-wrap gap-2">
              <Badge className={categoryColors[player.categoria] || "bg-slate-100 text-slate-700"}>
                {player.categoria}
              </Badge>
              {player.posicion && (
                <Badge className={positionColors[player.posicion] || "bg-slate-100 text-slate-700"}>
                  {player.posicion}
                </Badge>
              )}
            </div>
          </div>

          <div className="space-y-2 text-sm">
            {player.email && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail className="w-4 h-4" />
                <span className="truncate">{player.email}</span>
              </div>
            )}
            {player.telefono && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone className="w-4 h-4" />
                <span>{player.telefono}</span>
              </div>
            )}
            {player.direccion && (
              <div className="flex items-center gap-2 text-slate-600">
                <MapPin className="w-4 h-4" />
                <span className="truncate">{player.direccion}</span>
              </div>
            )}
          </div>

          <Button
            onClick={() => onEdit(player)}
            variant="outline"
            className="w-full hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300"
          >
            <Pencil className="w-4 h-4 mr-2" />
            Editar Ficha
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  );
}
