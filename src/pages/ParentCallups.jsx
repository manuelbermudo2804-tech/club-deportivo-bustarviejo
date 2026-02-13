import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Clock, Users, ExternalLink, CheckCircle2, XCircle, HelpCircle, Loader2, Phone, Bell } from "lucide-react";
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
          p.email_tutor_2 === currentUser.email
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
  const upcomingCallups = relevantCallups.filter(c => c.fecha_partido >= today && !c.cerrada);

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

      <div className="p-6 lg:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">🏆 Convocatorias</h1>
          <p className="text-slate-600 mt-1">Confirma la asistencia de tus jugadores</p>
        </div>

      {upcomingCallups.length > 0 ? (
        <div className="space-y-6">
          {upcomingCallups.map((callup) => {
            const myCallupPlayers = getCallupPlayers(callup);
            const hasPending = myCallupPlayers.some(p => p.confirmacion === "pendiente");

            return (
              <Card key={callup.id} className={`border-2 shadow-lg ${
                hasPending ? 'border-orange-300 bg-orange-50/30' : 'border-slate-200'
              }`}>
                <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <Badge className="bg-white/20 text-white text-xs">
                          {callup.tipo}
                        </Badge>
                        <Badge className="bg-white/30 text-white text-xs font-semibold">
                          {callup.categoria}
                        </Badge>
                        {hasPending && (
                          <Badge className="bg-red-500 text-white text-xs animate-pulse">
                            ⚠️ Confirmar Asistencia
                          </Badge>
                        )}
                      </div>
                      <CardTitle className="text-xl">{callup.titulo}</CardTitle>
                      {callup.rival && (
                        <p className="text-orange-100 text-sm mt-1">vs {callup.rival}</p>
                      )}
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-4">
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
                    {/* Resumen de confirmaciones del equipo */}
                    {(() => {
                      const total = callup.jugadores_convocados?.length || 0;
                      const confirmados = callup.jugadores_convocados?.filter(j => j.confirmacion === "asistire").length || 0;
                      const noAsisten = callup.jugadores_convocados?.filter(j => j.confirmacion === "no_asistire").length || 0;
                      const pendientes = total - confirmados - noAsisten;
                      const pct = total > 0 ? Math.round((confirmados / total) * 100) : 0;
                      return (
                        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-100 rounded-lg flex-wrap">
                          <Users className="w-5 h-5 text-slate-600" />
                          <span className="text-sm font-medium text-slate-700">Equipo:</span>
                          <Badge className="bg-green-100 text-green-700 text-xs">✅ {confirmados} confirmados</Badge>
                          {noAsisten > 0 && <Badge className="bg-red-100 text-red-700 text-xs">❌ {noAsisten}</Badge>}
                          {pendientes > 0 && <Badge className="bg-yellow-100 text-yellow-700 text-xs">⏳ {pendientes} pendientes</Badge>}
                          <span className="text-xs text-slate-500 ml-auto">{confirmados}/{total} ({pct}%)</span>
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
                        
                        return (
                          <div key={player.jugador_id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex-1">
                              <p className="font-medium text-slate-900">{player.jugador_nombre}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Icon className={`w-4 h-4 ${config.color}`} />
                                <span className={`text-sm ${config.color}`}>{config.label}</span>
                              </div>
                              {player.comentario && (
                                <p className="text-xs text-slate-600 mt-1 italic">
                                  "{player.comentario}"
                                </p>
                              )}
                            </div>
                            <Button
                              onClick={() => handleOpenConfirm(callup, player.playerData)}
                              variant="outline"
                              size="sm"
                            >
                              {player.confirmacion === "pendiente" ? "✅ Confirmar Asistencia" : "✏️ Modificar"}
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
        <Card className="border-none shadow-lg">
          <CardContent className="p-12 text-center">
            <div className="text-6xl mb-4">🏆</div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No hay convocatorias próximas</h3>
            <p className="text-slate-600">
              Cuando tus jugadores sean convocados, aparecerán aquí
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Confirmar Asistencia</DialogTitle>
            <DialogDescription>
              {selectedCallup?.titulo} - {selectedPlayer?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="confirmation-status">¿Asistirá al evento?</Label>
              <Select 
                value={confirmationData.confirmacion} 
                onValueChange={(value) => setConfirmationData({...confirmationData, confirmacion: value})}
              >
                <SelectTrigger id="confirmation-status">
                  <SelectValue placeholder="Selecciona una opción..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asistire">✅ Sí, asistiré</SelectItem>
                  <SelectItem value="no_asistire">❌ No asistiré</SelectItem>
                  <SelectItem value="duda">❓ Tengo dudas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmation-comment">Comentario (opcional)</Label>
              <Textarea
                id="confirmation-comment"
                placeholder="Ej: Llegaré 10 minutos tarde, No puedo por motivos personales, etc."
                value={confirmationData.comentario}
                onChange={(e) => setConfirmationData({...confirmationData, comentario: e.target.value})}
                rows={3}
              />
            </div>

            {selectedCallup && (
              <Alert className="bg-blue-50 border-blue-200">
                <AlertDescription className="text-sm text-blue-800">
                  <strong>Recordatorio:</strong> Es importante confirmar lo antes posible para que el entrenador pueda organizar el equipo.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
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
                "Confirmar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}