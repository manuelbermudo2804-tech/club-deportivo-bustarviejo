import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Heart, AlertTriangle } from "lucide-react";

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
  return (
    <Card className="border-none shadow-md hover:shadow-lg transition-all duration-200 bg-white overflow-hidden">
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
          <div className="flex flex-wrap gap-1">
            {player.posicion && (
              <Badge className={`${positionColors[player.posicion]} text-white text-xs py-0 px-2`}>
                {player.posicion}
              </Badge>
            )}
          </div>
        </div>

        {/* Información Médica Compacta */}
        {player.ficha_medica && Object.values(player.ficha_medica).some(val => val) && (
          <div className="bg-red-50 border border-red-200 rounded p-2 space-y-1">
            <div className="flex items-center gap-1 mb-1">
              <Heart className="w-3 h-3 text-red-600" />
              <span className="text-xs font-bold text-red-900">Info Médica</span>
            </div>
            <div className="space-y-0.5 text-xs">
              {player.ficha_medica.alergias && (
                <div className="flex items-start gap-1">
                  <span className="font-semibold text-red-700">🚨</span>
                  <span className="text-slate-700 line-clamp-2">{player.ficha_medica.alergias}</span>
                </div>
              )}
              {player.ficha_medica.grupo_sanguineo && (
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-red-700">🩸</span>
                  <span className="text-slate-700 font-bold">{player.ficha_medica.grupo_sanguineo}</span>
                </div>
              )}
              {player.ficha_medica.lesiones && (
                <div className="flex items-start gap-1 bg-yellow-50 px-1 py-0.5 rounded border border-yellow-200">
                  <AlertTriangle className="w-3 h-3 text-yellow-700 flex-shrink-0 mt-0.5" />
                  <span className="text-slate-700 line-clamp-1">{player.ficha_medica.lesiones}</span>
                </div>
              )}
              {(player.ficha_medica.contacto_emergencia_nombre || player.ficha_medica.contacto_emergencia_telefono) && (
                <div className="flex items-start gap-1 text-xs">
                  <span className="font-semibold text-red-700">📞</span>
                  <span className="text-slate-700 line-clamp-1">
                    {player.ficha_medica.contacto_emergencia_nombre}
                    {player.ficha_medica.contacto_emergencia_telefono && ` - ${player.ficha_medica.contacto_emergencia_telefono}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="space-y-1 text-xs text-slate-600">
          {player.email_padre && (
            <a 
              href={`mailto:${player.email_padre}`}
              className="flex items-center gap-1 truncate hover:text-orange-600 transition-colors"
            >
              <Mail className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{player.email_padre}</span>
            </a>
          )}
          {player.telefono && (
            <a 
              href={`tel:${player.telefono}`}
              className="flex items-center gap-1 hover:text-orange-600 transition-colors"
            >
              <Phone className="w-3 h-3 flex-shrink-0" />
              <span>{player.telefono}</span>
            </a>
          )}
        </div>
      </CardContent>
    </Card>
  );
}