import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Edit, Trash2, MapPin, Clock, Users, Check, X, HelpCircle, Calendar, ExternalLink, Lock, Unlock, UserCheck, Shield, Ban, RefreshCw, Send } from "lucide-react";
import AdminQuickConfirmDialog from "./AdminQuickConfirmDialog";
import CallupStatusBanner from "./CallupStatusBanner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function CallupCard({ callup, onEdit, onDelete, isCoach, onCloseNow, onReopen, isAdmin, onRefresh, onCancel, onReschedule, onPublish }) {
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
      <Card className={`border-2 shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden ${
        !callup.publicada && !canDelete
          ? 'border-dashed border-slate-400 bg-slate-50/50'
          : canDelete ? 'border-slate-200 opacity-70' 
          : pending > 0 ? 'border-amber-300' : 'border-green-200'
      }`}>
        <CardHeader className={`text-white pb-4 ${
          !callup.publicada && !canDelete
            ? 'bg-gradient-to-r from-slate-600 to-slate-700'
            : canDelete 
              ? 'bg-gradient-to-r from-slate-500 to-slate-600' 
              : pending > 0 
                ? 'bg-gradient-to-r from-orange-600 via-orange-700 to-amber-700'
                : 'bg-gradient-to-r from-green-600 to-green-700'
        }`}>
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <Badge className="bg-white/20 text-white text-xs">
                  {callup.tipo}
                </Badge>
                <Badge className="bg-white/25 text-white text-xs font-semibold">
                  {callup.categoria}
                </Badge>
                {callup.local_visitante && (
                  <Badge className="bg-white/15 text-white text-xs">
                    {callup.local_visitante === "Local" ? "🏠" : "✈️"} {callup.local_visitante}
                  </Badge>
                )}
                {callup.estado_convocatoria === "cancelada" ? (
                   <Badge className="bg-red-600 text-white text-xs">🚫 CANCELADA</Badge>
                 ) : callup.estado_convocatoria === "reprogramada" ? (
                   <Badge className="bg-amber-500 text-white text-xs">🔄 REPROGRAMADA</Badge>
                 ) : callup.publicada ? (
                   <Badge className="bg-green-500/80 text-white text-xs">✓ Publicada</Badge>
                 ) : (
                   <Badge className="bg-slate-500/80 text-white text-xs">📝 Borrador</Badge>
                 )}
                 {canDelete && (
                   <Badge className="bg-red-500/80 text-white text-xs">Pasada</Badge>
                 )}
              </div>
              <CardTitle className="text-lg leading-tight">
                {callup.titulo}
              </CardTitle>
              {callup.rival && (
                <div className="flex items-center gap-1.5 mt-1">
                  <Shield className="w-3.5 h-3.5 text-white/70" />
                  <p className={`text-sm font-medium ${canDelete ? 'text-slate-200' : 'text-white/90'}`}>
                    vs {callup.rival}
                  </p>
                </div>
              )}
              {/* Badge urgente de pendientes */}
              {pending > 0 && callup.publicada && !canDelete && (
                <div className="mt-2">
                  <Badge className="bg-red-500 text-white text-xs animate-pulse shadow-lg">
                    ⚠️ {pending} sin respuesta
                  </Badge>
                </div>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-4 space-y-3">
          {/* Status banner (cancelled/rescheduled) */}
          <CallupStatusBanner callup={callup} />

          {/* Date & Time Info - compacto */}
          <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
            <div className="flex items-center gap-2 text-slate-700">
              <Calendar className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <span className="font-semibold text-sm capitalize">
                {format(new Date(callup.fecha_partido), "EEEE, d 'de' MMMM", { locale: es })}
              </span>
            </div>
            
            <div className="flex items-center gap-2 text-slate-700">
              <Clock className="w-4 h-4 text-orange-600 flex-shrink-0" />
              <span className="text-sm">⚽ <strong>{callup.hora_partido}</strong></span>
              {callup.hora_concentracion && (
                <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
                  🏃 {callup.hora_concentracion}
                </span>
              )}
            </div>

            <div className="flex items-start gap-2 text-slate-700">
              <MapPin className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-sm">{callup.ubicacion}</span>
                {callup.enlace_ubicacion && (
                  <a 
                    href={callup.enlace_ubicacion}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline mt-0.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    Ver en Google Maps
                  </a>
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

          {/* Stats - barra visual + grid */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Confirmaciones</span>
              <span className="text-sm font-bold text-orange-600">{confirmationRate}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
              {confirmed > 0 && <div className="bg-green-500 h-full" style={{ width: `${(confirmed/jugadores.length)*100}%` }} />}
              {declined > 0 && <div className="bg-red-400 h-full" style={{ width: `${(declined/jugadores.length)*100}%` }} />}
              {doubt > 0 && <div className="bg-yellow-400 h-full" style={{ width: `${(doubt/jugadores.length)*100}%` }} />}
              {pending > 0 && <div className="bg-slate-300 h-full" style={{ width: `${(pending/jugadores.length)*100}%` }} />}
            </div>
            
            <div className="grid grid-cols-4 gap-1.5">
              <div className="bg-green-50 rounded-lg p-2 text-center border border-green-200">
                <span className="text-lg font-bold text-green-600">{confirmed}</span>
                <p className="text-[10px] text-green-700">✅ Sí</p>
              </div>
              <div className="bg-red-50 rounded-lg p-2 text-center border border-red-200">
                <span className="text-lg font-bold text-red-600">{declined}</span>
                <p className="text-[10px] text-red-700">❌ No</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 text-center border border-yellow-200">
                <span className="text-lg font-bold text-yellow-600">{doubt}</span>
                <p className="text-[10px] text-yellow-700">❓ Duda</p>
              </div>
              <div className="bg-slate-50 rounded-lg p-2 text-center border border-slate-200">
                <span className="text-lg font-bold text-slate-600">{pending}</span>
                <p className="text-[10px] text-slate-600">⏳ Pend.</p>
              </div>
            </div>

            <p className="text-xs text-slate-500 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-orange-600" />
              <strong>{jugadores.length}</strong> jugadores convocados
            </p>
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

          {/* Admin Quick Confirm */}
          {isAdmin && pending > 0 && !canDelete && (
            <Button
              onClick={() => setShowQuickConfirm(true)}
              variant="outline"
              size="sm"
              className="w-full border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800"
            >
              <UserCheck className="w-4 h-4 mr-2" />
              ⚡ Confirmar asistencia manualmente ({pending} pendientes)
            </Button>
          )}

          {/* Actions */}
          {isCoach && (
            <div className="flex flex-wrap gap-2 pt-2">
              {!canDelete && callup.estado_convocatoria !== "cancelada" && (
                <>
                  {/* Botón PUBLICAR — solo activo si hay jugadores convocados */}
                  {!callup.publicada && (
                    jugadores.length === 0 ? (
                      <div className="w-full bg-amber-50 border-2 border-amber-300 rounded-lg p-3 mb-1">
                        <div className="flex items-start gap-2">
                          <div className="text-amber-600 text-xl flex-shrink-0">⚠️</div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-amber-900 mb-1">
                              Borrador sin jugadores convocados
                            </p>
                            <p className="text-xs text-amber-800 leading-relaxed">
                              Pulsa <strong>Editar</strong> para seleccionar los jugadores que quieres convocar. Una vez revisado, podrás publicar y enviar la convocatoria.
                            </p>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <Button
                        onClick={() => onPublish?.(callup)}
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white shadow-lg font-semibold mb-1"
                      >
                        <Send className="w-4 h-4 mr-2" />
                        🚀 Publicar y Enviar Convocatoria ({jugadores.length} convocados)
                      </Button>
                    )
                  )}
                  <Button
                    onClick={() => onEdit?.(callup)}
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[100px]"
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Editar
                  </Button>
                  {!callup.cerrada ? (
                    <Button
                      onClick={() => onCloseNow?.(callup)}
                      variant="secondary"
                      size="sm"
                      className="flex-1 min-w-[100px]"
                    >
                      <Lock className="w-4 h-4 mr-1" />
                      Cerrar
                    </Button>
                  ) : (
                    <Button
                      onClick={() => onReopen?.(callup)}
                      variant="outline"
                      size="sm"
                      className="flex-1 min-w-[100px]"
                    >
                      <Unlock className="w-4 h-4 mr-1" />
                      Reabrir
                    </Button>
                  )}
                  <Button
                    onClick={() => onReschedule?.(callup)}
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[120px] border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800"
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Reprogramar
                  </Button>
                  <Button
                    onClick={() => onCancel?.(callup)}
                    variant="outline"
                    size="sm"
                    className="flex-1 min-w-[100px] border-red-300 bg-red-50 hover:bg-red-100 text-red-700"
                  >
                    <Ban className="w-4 h-4 mr-1" />
                    Cancelar
                  </Button>
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

      <AdminQuickConfirmDialog
        open={showQuickConfirm}
        onOpenChange={setShowQuickConfirm}
        callup={callup}
        onUpdated={onRefresh}
      />
    </motion.div>
  );
}