import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Clock, Users, ExternalLink, CheckCircle2, XCircle, HelpCircle, Loader2, Phone, Bell, Trophy, Shield } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CombinedSuccessAnimation } from "../components/animations/SuccessAnimation";

import WeatherWidget from "../components/callups/WeatherWidget";
import CallupCountdown from "../components/callups/CallupCountdown";
import CallupMap from "../components/callups/CallupMap";
import CallupStatusBanner from "../components/callups/CallupStatusBanner";
import { usePageTutorial } from "../components/tutorials/useTutorial";
import { useActiveSeason } from "../components/season/SeasonProvider";

export default function ParentCallups() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCallup, setSelectedCallup] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [confirmationData, setConfirmationData] = useState({
    confirmacion: "",
    comentario: ""
  });
  const [showSuccess, setShowSuccess] = useState(false);

  const queryClient = useQueryClient();
  
  // Tutorial interactivo para primera visita
  usePageTutorial("parent_callups");

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);

        const allPlayers = await base44.entities.Player.list();
        const userPlayers = allPlayers.filter(p => 
          p.email_padre === currentUser.email || 
          p.email_tutor_2 === currentUser.email ||
          (p.acceso_menor_email === currentUser.email && p.acceso_menor_autorizado === true)
        );
        setMyPlayers(userPlayers);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { activeSeason: activeSeasonStr } = useActiveSeason();
  const { data: callups, isLoading } = useQuery({
    queryKey: ['convocatorias'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    initialData: [],
    refetchInterval: 30000,
  });

  const updateCallupMutation = useMutation({
    mutationFn: ({ id, callupData }) => base44.entities.Convocatoria.update(id, callupData),
    onSuccess: () => {
      // Invalidar TODAS las queries de convocatorias para actualización inmediata en AlertCenter y dashboards
      queryClient.invalidateQueries({ queryKey: ['convocatorias'] });
      queryClient.invalidateQueries({ queryKey: ['callups'] });
      queryClient.invalidateQueries({ queryKey: ['playerCallups'] });
      queryClient.invalidateQueries({ queryKey: ['announcementsAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['eventsAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['surveysAlerts'] });
      setShowConfirmDialog(false);
      setShowSuccess(true);
      setSelectedCallup(null);
      setSelectedPlayer(null);
      setConfirmationData({ confirmacion: "asistire", comentario: "" });
    },
  });

  const handleOpenConfirm = (callup, player) => {
    setSelectedCallup(callup);
    setSelectedPlayer(player);
    
    const existingConfirmation = callup.jugadores_convocados.find(j => j.jugador_id === player.id);
    if (existingConfirmation) {
      setConfirmationData({
        confirmacion: existingConfirmation.confirmacion,
        comentario: existingConfirmation.comentario || ""
      });
    } else {
      setConfirmationData({ confirmacion: "", comentario: "" });
    }
    
    setShowConfirmDialog(true);
  };

  const handleSubmitConfirmation = () => {
    if (!selectedCallup || !selectedPlayer) return;

    const updatedJugadores = selectedCallup.jugadores_convocados.map(j => {
      if (j.jugador_id === selectedPlayer.id) {
        return {
          ...j,
          confirmacion: confirmationData.confirmacion,
          comentario: confirmationData.comentario,
          fecha_confirmacion: new Date().toISOString()
        };
      }
      return j;
    });

    updateCallupMutation.mutate({
      id: selectedCallup.id,
      callupData: {
        ...selectedCallup,
        jugadores_convocados: updatedJugadores
      }
    });
  };

  const getSeasonRange = (s) => {
    if (!s || !s.includes('/')) return { start: new Date(2000,0,1), end: new Date(2999,11,31) };
    const [y1,y2] = s.split('/').map(n=>parseInt(n,10));
    return { start: new Date(y1, 8, 1), end: new Date(y2, 7, 31) };
  };
  const { start: seasonStart, end: seasonEnd } = getSeasonRange(activeSeasonStr);
  const seasonCallups = callups.filter(c => {
    const d = new Date(c.fecha_partido);
    return !isNaN(d) && d >= seasonStart && d <= seasonEnd;
  });

  const relevantCallups = seasonCallups.filter(c => {
    if (!c.publicada) return false;
    
    const hasMyPlayer = c.jugadores_convocados?.some(j => 
      myPlayers.some(p => p.id === j.jugador_id)
    );
    
    return hasMyPlayer;
  });

  const today = new Date().toISOString().split('T')[0];
  const upcomingCallups = relevantCallups.filter(c => 
    (c.fecha_partido >= today && !c.cerrada) || 
    (c.estado_convocatoria === "cancelada" && c.fecha_partido >= today) ||
    (c.estado_convocatoria === "reprogramada" && c.fecha_partido >= today)
  );

  const getCallupPlayers = (callup) => {
    return callup.jugadores_convocados
      .filter(j => myPlayers.some(p => p.id === j.jugador_id))
      .map(j => {
        const player = myPlayers.find(p => p.id === j.jugador_id);
        return { ...j, playerData: player };
      });
  };

  const confirmationConfig = {
    asistire: { icon: CheckCircle2, color: "text-green-600", label: "✅ Asistiré" },
    no_asistire: { icon: XCircle, color: "text-red-600", label: "❌ No asistiré" },
    duda: { icon: HelpCircle, color: "text-yellow-600", label: "❓ Tengo dudas" },
    pendiente: { icon: Clock, color: "text-slate-500", label: "⏳ Pendiente" }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <CombinedSuccessAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message="¡Confirmación Enviada!"
        withConfetti={true}
      />

      <div className="bg-page-bridge min-h-screen">
      <div className="p-4 lg:p-8 space-y-6">
        {/* Header con gradiente */}
        <div className="bg-gradient-to-r from-orange-600 via-orange-700 to-amber-700 rounded-2xl p-6 shadow-xl">
          <div className="flex items-center gap-3 text-white">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold">Convocatorias</h1>
              <p className="text-orange-100 text-sm">Confirma la asistencia de tus jugadores</p>
            </div>
          </div>
          {upcomingCallups.length > 0 && (
            <div className="flex gap-3 mt-4">
              <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
                <div className="text-xl font-bold text-white">{upcomingCallups.length}</div>
                <p className="text-[10px] text-orange-100 uppercase">Pendientes</p>
              </div>
              <div className="bg-white/15 rounded-xl px-4 py-2 text-center">
                <div className="text-xl font-bold text-white">
                  {upcomingCallups.reduce((acc, c) => acc + (c.jugadores_convocados?.filter(j => myPlayers.some(p => p.id === j.jugador_id) && j.confirmacion === "pendiente").length || 0), 0)}
                </div>
                <p className="text-[10px] text-orange-100 uppercase">Sin confirmar</p>
              </div>
            </div>
          )}
        </div>

      {upcomingCallups.length > 0 ? (
        <div className="space-y-6">
          {upcomingCallups.map((callup) => {
            const myCallupPlayers = getCallupPlayers(callup);
            const hasPending = myCallupPlayers.some(p => p.confirmacion === "pendiente");

            return (
              <Card key={callup.id} className={`border-2 shadow-lg overflow-hidden ${
                hasPending ? 'border-orange-300 ring-2 ring-orange-200' : 'border-slate-200'
              }`}>
                <CardHeader className={`text-white pb-4 ${
                  hasPending 
                    ? 'bg-gradient-to-r from-orange-600 via-orange-700 to-red-600' 
                    : 'bg-gradient-to-r from-green-600 to-green-700'
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
                        {callup.local_visitante && (
                          <Badge className="bg-white/20 text-white text-xs">
                            {callup.local_visitante === "Local" ? "🏠 Local" : "✈️ Visitante"}
                          </Badge>
                        )}
                        {hasPending && (
                          <Badge className="bg-red-500 text-white text-xs animate-pulse shadow-lg">
                            ⚠️ Confirmar Asistencia
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl">{callup.titulo}</CardTitle>
                      {callup.rival && (
                        <div className="flex items-center gap-2 mt-1.5">
                          <Shield className="w-4 h-4 text-white/70" />
                          <p className="text-white/90 text-sm font-medium">vs {callup.rival}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
                  {/* Status banner (cancelled/rescheduled) */}
                  <CallupStatusBanner callup={callup} />

                  {/* Countdown Timer */}
                  <CallupCountdown 
                    targetDate={callup.fecha_partido} 
                    targetTime={callup.hora_concentracion || callup.hora_partido}
                    label="⏱️ Comienza en"
                  />

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

                    {callup.entrenador_telefono && (
                      <div className="flex items-center gap-2 text-slate-700">
                        <Phone className="w-4 h-4 text-green-600" />
                        <span className="text-sm">
                          Entrenador: <a href={`tel:${callup.entrenador_telefono}`} className="text-green-600 hover:text-green-700 font-medium">{callup.entrenador_telefono}</a>
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Interactive Map */}
                  <CallupMap 
                    ubicacion={callup.ubicacion}
                    enlaceUbicacion={callup.enlace_ubicacion}
                    localVisitante={callup.local_visitante}
                  />

                  {/* Weather Widget */}
                  <WeatherWidget location={callup.ubicacion} date={callup.fecha_partido} />

                  {callup.descripcion && (
                    <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-orange-600">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{callup.descripcion}</p>
                    </div>
                  )}

                  <div className="border-t pt-4">
                    {/* Resumen de confirmaciones del equipo - barra visual */}
                    {(() => {
                      const total = callup.jugadores_convocados?.length || 0;
                      const confirmados = callup.jugadores_convocados?.filter(j => j.confirmacion === "asistire").length || 0;
                      const noAsisten = callup.jugadores_convocados?.filter(j => j.confirmacion === "no_asistire").length || 0;
                      const pendientes = total - confirmados - noAsisten;
                      const pct = total > 0 ? Math.round((confirmados / total) * 100) : 0;
                      return (
                        <div className="mb-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5" /> Estado del equipo
                            </span>
                            <span className="text-xs font-bold text-slate-900">{confirmados}/{total} ({pct}%)</span>
                          </div>
                          <div className="w-full h-2.5 bg-slate-200 rounded-full overflow-hidden flex">
                            {confirmados > 0 && <div className="bg-green-500 h-full transition-all" style={{ width: `${(confirmados/total)*100}%` }} />}
                            {noAsisten > 0 && <div className="bg-red-400 h-full transition-all" style={{ width: `${(noAsisten/total)*100}%` }} />}
                            {pendientes > 0 && <div className="bg-amber-300 h-full transition-all" style={{ width: `${(pendientes/total)*100}%` }} />}
                          </div>
                          <div className="flex gap-3 mt-1.5">
                            <span className="text-[10px] text-green-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500"></span>{confirmados} sí</span>
                            {noAsisten > 0 && <span className="text-[10px] text-red-500 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-400"></span>{noAsisten} no</span>}
                            {pendientes > 0 && <span className="text-[10px] text-amber-600 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300"></span>{pendientes} pend.</span>}
                          </div>
                        </div>
                      );
                    })()}

                    <div className="flex items-center gap-2 mb-3">
                      <Users className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-slate-900">Mis Jugadores Convocados:</span>
                    </div>
                    
                    <div className="space-y-2">
                      {myCallupPlayers.map((player) => {
                        const config = confirmationConfig[player.confirmacion];
                        const Icon = config.icon;
                        const isPending = player.confirmacion === "pendiente";
                        
                        return (
                          <div key={player.jugador_id} className={`flex items-center justify-between p-3.5 rounded-xl border-2 transition-all ${
                            isPending 
                              ? 'bg-orange-50 border-orange-200 shadow-sm' 
                              : player.confirmacion === "asistire" 
                                ? 'bg-green-50 border-green-200' 
                                : player.confirmacion === "no_asistire"
                                  ? 'bg-red-50 border-red-200'
                                  : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className="flex-1">
                              <p className="font-semibold text-slate-900">{player.jugador_nombre}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Icon className={`w-4 h-4 ${config.color}`} />
                                <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                              </div>
                              {player.comentario && (
                                <p className="text-xs text-slate-600 mt-1 italic">
                                  "{player.comentario}"
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() => handleOpenConfirm(callup, player.playerData)}
                              size="sm"
                              className={isPending 
                                ? "bg-orange-600 hover:bg-orange-700 text-white shadow-md animate-pulse" 
                                : "bg-slate-100 hover:bg-slate-200 text-slate-700 border"
                              }
                            >
                              {isPending ? "✅ Confirmar" : "✏️ Modificar"}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-4 bg-gradient-to-br from-orange-100 to-amber-100 rounded-full flex items-center justify-center">
              <Trophy className="w-10 h-10 text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay convocatorias próximas</h3>
            <p className="text-slate-500 text-sm">
              Cuando tus jugadores sean convocados, aparecerán aquí automáticamente
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl">Confirmar Asistencia</DialogTitle>
            <DialogDescription className="text-sm">
              <strong>{selectedPlayer?.nombre}</strong> — {selectedCallup?.titulo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Botones grandes de confirmación en vez de dropdown */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold">¿Asistirá al evento?</Label>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { value: "asistire", label: "Sí, asistiré", emoji: "✅", color: "border-green-300 bg-green-50 hover:bg-green-100 text-green-800", active: "ring-2 ring-green-500 bg-green-100 border-green-400" },
                  { value: "no_asistire", label: "No asistiré", emoji: "❌", color: "border-red-200 bg-red-50 hover:bg-red-100 text-red-800", active: "ring-2 ring-red-500 bg-red-100 border-red-400" },
                  { value: "duda", label: "Tengo dudas", emoji: "❓", color: "border-yellow-200 bg-yellow-50 hover:bg-yellow-100 text-yellow-800", active: "ring-2 ring-yellow-500 bg-yellow-100 border-yellow-400" },
                ].map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setConfirmationData({...confirmationData, confirmacion: opt.value})}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 transition-all font-medium text-left ${
                      confirmationData.confirmacion === opt.value ? opt.active : opt.color
                    }`}
                  >
                    <span className="text-xl">{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation-comment" className="text-sm">Comentario (opcional)</Label>
              <Textarea
                id="confirmation-comment"
                placeholder="Ej: Llegaré 10 min tarde..."
                value={confirmationData.comentario}
                onChange={(e) => setConfirmationData({...confirmationData, comentario: e.target.value})}
                rows={2}
                className="text-sm"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              size="sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitConfirmation}
              disabled={updateCallupMutation.isPending || !['asistire','no_asistire','duda'].includes(confirmationData.confirmacion)}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {updateCallupMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Enviar Confirmación"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
      </div>
    </>
  );
}