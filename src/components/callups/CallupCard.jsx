import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MapPin, Clock, Users, Check, X, HelpCircle, Calendar, ExternalLink, Lock, Unlock, UserCheck } from "lucide-react";
import AdminQuickConfirmDialog from "./AdminQuickConfirmDialog";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CallupCard({ callup, onEdit, onDelete, isCoach, onCloseNow, onReopen, isAdmin, onRefresh }) {
  const [showQuickConfirm, setShowQuickConfirm] = React.useState(false);
  const jugadores = callup.jugadores_convocados || [];
  const confirmed = jugadores.filter(j => j.confirmacion === "asistire").length;
  const declined = jugadores.filter(j => j.confirmacion === "no_asistire").length;
  const pending = jugadores.filter(j => j.confirmacion === "pendiente").length;
  const doubt = jugadores.filter(j => j.confirmacion === "duda").length;

  const confirmationRate = jugadores.length > 0 
    ? Math.round((confirmed / jugadores.length) * 100) 
    : 0;

  // Check if the match date has passed
  const today = new Date().toISOString().split('T')[0];
  const isPast = callup.fecha_partido < today;
  const canDelete = isPast || callup.cerrada;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <Card className={`border-2 shadow-lg hover:shadow-xl transition-all duration-300 ${
        canDelete ? 'border-slate-300 opacity-75' : 'border-orange-200'
      }`}>
        <CardHeader className={`text-white pb-4 ${
          canDelete ? 'bg-gradient-to-r from-slate-600 to-slate-700' : 'bg-gradient-to-r from-orange-600 to-orange-700'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge className="bg-white/20 text-white text-xs">
                  {callup.tipo}
                </Badge>
                <Badge className="bg-white/30 text-white text-xs font-semibold">
                  {callup.categoria}
                </Badge>
                {callup.publicada ? (
                  <Badge className="bg-green-500 text-white text-xs">Publicada</Badge>
                ) : (
                  <Badge className="bg-slate-500 text-white text-xs">Borrador</Badge>
                )}
                {canDelete && (
                  <Badge className="bg-red-500 text-white text-xs">Pasada</Badge>
                )}
                {/* Badge de respuestas pendientes para entrenadores */}
                {pending > 0 && callup.publicada && !canDelete && (
                  <Badge className="bg-yellow-500 text-white text-xs animate-pulse">
                    ⏳ {pending} sin respuesta
                  </Badge>
                )}
              </div>
              <CardTitle className="text-xl leading-tight">
                {callup.titulo}
              </CardTitle>
              {callup.rival && (
                <p className={`text-sm mt-1 ${canDelete ? 'text-slate-200' : 'text-orange-100'}`}>
                  vs {callup.rival}
                </p>
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

            <div className="flex items-start gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span>{callup.ubicacion}</span>
                {callup.local_visitante && (
                  <Badge variant="outline" className="text-xs ml-2">
                    {callup.local_visitante}
                  </Badge>
                )}
                {callup.enlace_ubicacion && (
                  <div className="mt-1">
                    <a 
                      href={callup.enlace_ubicacion}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      Ver en Google Maps
                    </a>
                  </div>
                )}
              </div>
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
                  <strong>{jugadores.length}</strong> jugadores convocados
                </span>
              </div>
            </div>
          </div>
          
          {/* Lista de jugadores por estado de confirmación */}
          {jugadores.length > 0 && (
            <div className="space-y-2">
              {confirmed > 0 && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-200">
                  <p className="text-xs font-semibold text-green-800 mb-2">✅ Confirmados ({confirmed}):</p>
                  <p className="text-xs text-green-700 leading-relaxed">
                    {jugadores
                      .filter(j => j.confirmacion === "asistire")
                      .map(j => j.jugador_nombre)
                      .join(", ")}
                  </p>
                </div>
              )}
              
              {declined > 0 && (
                <div className="bg-red-50 rounded-lg p-3 border border-red-200">
                  <p className="text-xs font-semibold text-red-800 mb-2">❌ No asisten ({declined}):</p>
                  <p className="text-xs text-red-700 leading-relaxed">
                    {jugadores
                      .filter(j => j.confirmacion === "no_asistire")
                      .map(j => j.jugador_nombre)
                      .join(", ")}
                  </p>
                </div>
              )}
              
              {doubt > 0 && (
                <div className="bg-yellow-50 rounded-lg p-3 border border-yellow-200">
                  <p className="text-xs font-semibold text-yellow-800 mb-2">❓ En duda ({doubt}):</p>
                  <p className="text-xs text-yellow-700 leading-relaxed">
                    {jugadores
                      .filter(j => j.confirmacion === "duda")
                      .map(j => j.jugador_nombre)
                      .join(", ")}
                  </p>
                </div>
              )}
              
              {pending > 0 && (
                <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                  <p className="text-xs font-semibold text-slate-800 mb-2">⏳ Pendientes ({pending}):</p>
                  <p className="text-xs text-slate-700 leading-relaxed">
                    {jugadores
                      .filter(j => j.confirmacion === "pendiente")
                      .map(j => j.jugador_nombre)
                      .join(", ")}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          {isCoach && (
            <div className="flex flex-wrap gap-2 pt-2">
              {!canDelete && (
                <>
                  <Button
                    onClick={() => onEdit?.(callup)}
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[140px]"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Editar
                  </Button>
                  {!callup.cerrada ? (
                    <Button
                      onClick={() => onCloseNow?.(callup)}
                      variant="secondary"
                      size="sm"
                      className="flex-1 min-w-[160px]"
                    >
                      <Lock className="w-4 h-4 mr-2" />
                      Cerrar ahora
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onReopen?.(callup)}
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[140px]"
                    >
                      <Unlock className="w-4 h-4 mr-2" />
                      Reabrir
                    </Button>
                  )}
                </>
              )}
              {canDelete && (
                <Button
                  onClick={() => onDelete?.(callup)}
                  variant="destructive"
                  size="sm"
                  className="flex-1 bg-red-600 hover:bg-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Eliminar Convocatoria
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}