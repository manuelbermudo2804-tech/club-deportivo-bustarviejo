import React, { useState } from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Pencil, Mail, Phone, User, Eye, Clock, Heart, FileText, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import PlayerDetailDialog from "./PlayerDetailDialog";

const categoryColors = {
  "Prebenjamín": "bg-purple-100 text-purple-700",
  "Benjamín": "bg-blue-100 text-blue-700",
  "Alevín": "bg-green-100 text-green-700",
  "Infantil": "bg-yellow-100 text-yellow-700",
  "Cadete": "bg-orange-100 text-orange-700",
  "Juvenil": "bg-red-100 text-red-700",
  "Senior": "bg-slate-100 text-slate-700"
};

const positionColors = {
  "Portero": "bg-blue-500",
  "Defensa": "bg-green-500",
  "Centrocampista": "bg-yellow-500",
  "Delantero": "bg-red-500"
};

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

const DIAS_ORDEN = {
  "Lunes": 1,
  "Martes": 2,
  "Miércoles": 3,
  "Jueves": 4,
  "Viernes": 5
};

export default function PlayerCard({ player, onEdit, onViewProfile, isParent = false, readOnly = false, schedules = [], isCoachOrCoordinator = false }) {
  const [showDetail, setShowDetail] = useState(false);
  
  // Determinar la página de pagos según si es padre o admin
  const paymentsPage = isParent ? "ParentPayments" : "Payments";
  
  // Filtrar horarios del jugador según su categoría/deporte
  const playerSchedules = schedules
    .filter(s => s.categoria === player.deporte && s.activo)
    .sort((a, b) => DIAS_ORDEN[a.dia_semana] - DIAS_ORDEN[b.dia_semana]);

  const hasMedicalInfo = player.ficha_medica && Object.values(player.ficha_medica).some(val => val);
  
  return (
    <>
      <PlayerDetailDialog
        player={player}
        open={showDetail}
        onOpenChange={setShowDetail}
      />
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <Card 
        className="border-none shadow-lg hover:shadow-xl transition-all duration-300 bg-white/90 backdrop-blur-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-blue-400"
        onClick={(e) => {
          // Solo abrir el modal si no se hizo click en un botón o link
          if (!e.target.closest('button') && !e.target.closest('a')) {
            setShowDetail(true);
          }
        }}
      >
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
          
          {/* Badge de número de camiseta */}
          {player.numero_camiseta && (
            <div className="absolute top-3 right-3 w-12 h-12 bg-slate-900 text-white rounded-full flex items-center justify-center font-bold text-lg shadow-lg">
              {player.numero_camiseta}
            </div>
          )}

          {/* Badge de estado */}
          <div className="absolute top-3 left-3">
            <Badge className={player.activo ? "bg-green-500 text-white" : "bg-slate-500 text-white"}>
              {player.activo ? "Activo" : "Inactivo"}
            </Badge>
          </div>

          {/* Badge de deporte */}
          <div className="absolute bottom-3 left-3">
            <Badge className={`${sportColors[player.deporte]} text-white`}>
              {sportIcons[player.deporte]} {player.deporte}
            </Badge>
          </div>
        </div>

        <CardContent className="p-4 space-y-3">
          <div>
            <h3 className="font-bold text-lg text-slate-900 mb-2">{player.nombre}</h3>
            <div className="flex flex-wrap gap-2">
              <Badge className={categoryColors[player.categoria]}>
                {player.categoria}
              </Badge>
              {player.posicion && (
                <Badge className={`${positionColors[player.posicion]} text-white`}>
                  {player.posicion}
                </Badge>
              )}
              {isCoachOrCoordinator && hasMedicalInfo && (
                <Badge className="bg-red-100 text-red-700 flex items-center gap-1">
                  <Heart className="w-3 h-3" />
                  Ficha Médica
                </Badge>
              )}
            </div>
          </div>

          {/* Click para ver detalles */}
          {isCoachOrCoordinator && hasMedicalInfo && (
            <div className="bg-gradient-to-r from-blue-50 to-blue-100 border-2 border-blue-300 rounded-lg p-2">
              <div className="flex items-center justify-center gap-2 text-sm text-blue-700 font-medium">
                <Eye className="w-4 h-4" />
                <span>Click para ver ficha médica completa</span>
              </div>
            </div>
          )}

          {/* Horarios de Entrenamientos */}
          {playerSchedules.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-green-100 border-2 border-green-300 rounded-lg p-3 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-green-700" />
                <p className="text-xs font-bold text-green-900">Horarios de Entrenamiento:</p>
              </div>
              <div className="space-y-1">
                {playerSchedules.map((schedule, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs bg-white rounded px-2 py-1 border border-green-200">
                    <span className="font-semibold text-green-800">{schedule.dia_semana}</span>
                    <span className="text-slate-700">{schedule.hora_inicio} - {schedule.hora_fin}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(player.email || player.telefono) && (
            <div className="space-y-1 text-sm text-slate-600">
              {player.email && (
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span className="truncate">{player.email}</span>
                </div>
              )}
              {player.telefono && (
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  <span>{player.telefono}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {onViewProfile && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onViewProfile(player);
                }}
                className="flex-1 hover:bg-purple-50 hover:text-purple-700"
              >
                <FileText className="w-4 h-4 mr-1" />
                Perfil
              </Button>
            )}
            {!readOnly && onEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(player);
                }}
                className="flex-1 hover:bg-orange-50 hover:text-orange-700"
              >
                <Pencil className="w-4 h-4 mr-1" />
                Editar
              </Button>
            )}
            <Link to={`${createPageUrl(paymentsPage)}?jugador_id=${player.id}`} className="flex-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="outline"
                size="sm"
                className="w-full hover:bg-blue-50 hover:text-blue-700"
              >
                <CreditCard className="w-4 h-4 mr-1" />
                Pagos
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </motion.div>
    </>
  );
}