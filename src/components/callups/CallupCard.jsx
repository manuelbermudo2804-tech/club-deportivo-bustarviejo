import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MapPin, Clock, Users, Check, X, HelpCircle, Calendar } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CallupCard({ callup, onEdit, onDelete, isCoach }) {
  const confirmed = callup.jugadores_convocados.filter(j => j.confirmacion === "asistire").length;
  const declined = callup.jugadores_convocados.filter(j => j.confirmacion === "no_asistire").length;
  const pending = callup.jugadores_convocados.filter(j => j.confirmacion === "pendiente").length;
  const doubt = callup.jugadores_convocados.filter(j => j.confirmacion === "duda").length;

  const confirmationRate = callup.jugadores_convocados.length > 0 
    ? Math.round((confirmed / callup.jugadores_convocados.length) * 100) 
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className="border-2 border-orange-200 shadow-lg hover:shadow-xl transition-all duration-300">
        <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white pb-4">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge className="bg-white/20 text-white text-xs">
                  {callup.tipo}
                </Badge>
                {callup.publicada ? (
                  <Badge className="bg-green-500 text-white text-xs">Publicada</Badge>
                ) : (
                  <Badge className="bg-slate-500 text-white text-xs">Borrador</Badge>
                )}
              </div>
              <CardTitle className="text-xl leading-tight">
                {callup.titulo}
              </CardTitle>
              {callup.rival && (
                <p className="text-orange-100 text-sm mt-1">vs {callup.rival}</p>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-4">
          {/* Date & Time Info */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-orange-600" />
              <span className="font-semibold">
                {format(new Date(callup.fecha_partido), "EEEE, d 'de' MMMM", { locale: es })}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4 text-orange-600" />
              <span>Partido: <strong>{callup.hora_partido}</strong></span>
              {callup.hora_concentracion && (
                <span className="text-sm text-slate-500">
                  • Concentración: {callup.hora_concentracion}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-orange-600" />
              <span>{callup.ubicacion}</span>
              {callup.local_visitante && (
                <Badge variant="outline" className="text-xs">
                  {callup.local_visitante}
                </Badge>
              )}
            </div>
          </div>

          {/* Description */}
          {callup.descripcion && (
            <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-orange-600">
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{callup.descripcion}</p>
            </div>
          )}

          {/* Stats */}
          <div className="bg-slate-50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Tasa de Confirmación</span>
              <span className="text-lg font-bold text-orange-600">{confirmationRate}%</span>
            </div>
            
            <div className="grid grid-cols-4 gap-2">
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                  <Check className="w-4 h-4" />
                  <span className="font-bold">{confirmed}</span>
                </div>
                <p className="text-xs text-slate-500">Sí</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                  <X className="w-4 h-4" />
                  <span className="font-bold">{declined}</span>
                </div>
                <p className="text-xs text-slate-500">No</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-yellow-600 mb-1">
                  <HelpCircle className="w-4 h-4" />
                  <span className="font-bold">{doubt}</span>
                </div>
                <p className="text-xs text-slate-500">Duda</p>
              </div>
              
              <div className="text-center">
                <div className="flex items-center justify-center gap-1 text-slate-600 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="font-bold">{pending}</span>
                </div>
                <p className="text-xs text-slate-500">Pendiente</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <div className="flex items-center gap-2 text-slate-700">
                <Users className="w-4 h-4 text-orange-600" />
                <span className="text-sm">
                  <strong>{callup.jugadores_convocados.length}</strong> jugadores convocados
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          {isCoach && (
            <div className="flex gap-2 pt-2">
              <Button
                onClick={() => onEdit(callup)}
                variant="outline"
                size="sm"
                className="flex-1"
              >
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </Button>
              <Button
                onClick={() => onDelete(callup)}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}