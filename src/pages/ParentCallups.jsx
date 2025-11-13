import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, HelpCircle, Clock, MapPin, Calendar, AlertCircle, Trophy, ExternalLink } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ParentCallups() {
  const [user, setUser] = useState(null);
  const [myPlayers, setMyPlayers] = useState([]);
  const [selectedCallup, setSelectedCallup] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmationData, setConfirmationData] = useState({
    confirmacion: "asistire",
    comentario: ""
  });
  
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        // Get my players
        const allPlayers = await base44.entities.Player.list();
        const players = allPlayers.filter(p => 
          p.email_padre === currentUser.email || 
          p.email_tutor_2 === currentUser.email
        );
        setMyPlayers(players);
        
        console.log("Current user email:", currentUser.email);
        console.log("My players found:", players.length, players);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: allCallups, isLoading } = useQuery({
    queryKey: ['convocatorias'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    initialData: [],
    refetchInterval: 10000,
  });

  const updateCallupMutation = useMutation({
    mutationFn: async ({ callupId, callupData }) => {
      return await base44.entities.Convocatoria.update(callupId, callupData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convocatorias'] });
      setShowConfirmDialog(false);
      setSelectedCallup(null);
      setSelectedPlayer(null);
      setConfirmationData({ confirmacion: "asistire", comentario: "" });
      toast.success("Confirmación registrada correctamente");
    },
  });

  const handleConfirm = (callup, player) => {
    console.log("Opening confirmation for:", callup.titulo, player.nombre);
    setSelectedCallup(callup);
    setSelectedPlayer(player);
    
    // Get existing confirmation
    const existingPlayer = callup.jugadores_convocados.find(j => j.jugador_id === player.id);
    setConfirmationData({
      confirmacion: existingPlayer?.confirmacion || "asistire",
      comentario: existingPlayer?.comentario || ""
    });
    
    setShowConfirmDialog(true);
  };

  const handleSubmitConfirmation = () => {
    if (!selectedCallup || !selectedPlayer) return;

    const updatedPlayers = selectedCallup.jugadores_convocados.map(j => {
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
      callupId: selectedCallup.id,
      callupData: {
        ...selectedCallup,
        jugadores_convocados: updatedPlayers
      }
    });
  };

  // Filter callups for my players
  const myPlayerIds = myPlayers.map(p => p.id);
  console.log("My player IDs:", myPlayerIds);
  
  const relevantCallups = allCallups.filter(callup => {
    if (!callup.publicada) return false;
    
    // Check if any of my players are in this callup
    const hasMyPlayers = callup.jugadores_convocados.some(j => {
      const isMyPlayer = myPlayerIds.includes(j.jugador_id);
      return isMyPlayer;
    });
    
    return hasMyPlayers;
  });
  
  console.log("Relevant callups found:", relevantCallups.length, relevantCallups);

  // Separate upcoming and past
  const today = new Date().toISOString().split('T')[0];
  const upcomingCallups = relevantCallups.filter(c => c.fecha_partido >= today && !c.cerrada);
  const pastCallups = relevantCallups.filter(c => c.fecha_partido < today || c.cerrada);

  // Get my players in a specific callup
  const getMyPlayersInCallup = (callup) => {
    return callup.jugadores_convocados.filter(j => myPlayerIds.includes(j.jugador_id));
  };

  const confirmationConfig = {
    asistire: { icon: Check, color: "text-green-600", bg: "bg-green-50", border: "border-green-300", label: "Asistiré" },
    no_asistire: { icon: X, color: "text-red-600", bg: "bg-red-50", border: "border-red-300", label: "No asistiré" },
    duda: { icon: HelpCircle, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-300", label: "Tengo duda" },
    pendiente: { icon: Clock, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-300", label: "Sin confirmar" }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-orange-600 border-r-transparent mb-4"></div>
          <p className="text-slate-600">Cargando convocatorias...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Trophy className="w-8 h-8 text-orange-600" />
          Convocatorias
        </h1>
        <p className="text-slate-600 mt-1">Confirma la asistencia de tus jugadores</p>
      </div>

      {/* Debug info */}
      {myPlayers.length === 0 && (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-yellow-900 mb-1">No se encontraron jugadores</h3>
                <p className="text-sm text-yellow-800">
                  No hay jugadores registrados con tu email. Verifica que hayas registrado jugadores desde la sección "Jugadores".
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending confirmations alert */}
      {upcomingCallups.some(c => getMyPlayersInCallup(c).some(j => j.confirmacion === "pendiente")) && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-orange-900 mb-1">⚠️ Confirmaciones Pendientes</h3>
                <p className="text-sm text-orange-800">
                  Tienes convocatorias que requieren confirmación. Por favor, confirma la asistencia lo antes posible.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Callups */}
      {upcomingCallups.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">Próximas Convocatorias</h2>
          <div className="space-y-6">
            <AnimatePresence>
              {upcomingCallups.map((callup) => {
                const myPlayersInCallup = getMyPlayersInCallup(callup);
                
                return (
                  <motion.div
                    key={callup.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className="border-2 border-orange-200 shadow-lg">
                      <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge className="bg-white/20 text-white text-xs">
                                {callup.tipo}
                              </Badge>
                              {callup.categoria && (
                                <Badge className="bg-white/20 text-white text-xs">
                                  {callup.categoria}
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
                        {/* Event info */}
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

                        {/* Coach info */}
                        <div className="text-sm text-slate-600">
                          <strong>Entrenador:</strong> {callup.entrenador_nombre}
                        </div>

                        {/* My players in this callup */}
                        <div className="space-y-3 pt-3 border-t-2 border-slate-200">
                          <h4 className="font-semibold text-slate-900">Mis Jugadores Convocados:</h4>
                          {myPlayersInCallup.map((player) => {
                            const config = confirmationConfig[player.confirmacion] || confirmationConfig.pendiente;
                            const Icon = config.icon;
                            
                            return (
                              <div
                                key={player.jugador_id}
                                className={`p-4 rounded-lg border-2 ${config.border} ${config.bg}`}
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <p className="font-bold text-slate-900">{player.jugador_nombre}</p>
                                      <Badge className={`${config.color}`} variant="outline">
                                        <Icon className="w-3 h-3 mr-1" />
                                        {config.label}
                                      </Badge>
                                    </div>
                                    
                                    {player.comentario && (
                                      <p className="text-sm text-slate-600 mb-2">
                                        <strong>Comentario:</strong> {player.comentario}
                                      </p>
                                    )}
                                    
                                    {player.fecha_confirmacion && (
                                      <p className="text-xs text-slate-500">
                                        Confirmado: {format(new Date(player.fecha_confirmacion), "d 'de' MMM, HH:mm", { locale: es })}
                                      </p>
                                    )}
                                  </div>
                                  
                                  <Button
                                    onClick={() => handleConfirm(callup, myPlayers.find(p => p.id === player.jugador_id))}
                                    size="sm"
                                    className="bg-orange-600 hover:bg-orange-700"
                                  >
                                    {player.confirmacion === "pendiente" ? "Confirmar" : "Cambiar"}
                                  </Button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-xl shadow-lg">
          <div className="text-6xl mb-4">🏆</div>
          <p className="text-slate-500 text-lg">No hay convocatorias próximas</p>
          {myPlayers.length > 0 && (
            <p className="text-sm text-slate-400 mt-2">
              Cuando el entrenador publique una convocatoria, aparecerá aquí
            </p>
          )}
        </div>
      )}

      {/* Past Callups */}
      {pastCallups.length > 0 && (
        <div className="space-y-4 pt-8 border-t">
          <h2 className="text-2xl font-bold text-slate-500">Convocatorias Pasadas</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 opacity-60">
            {pastCallups.slice(0, 3).map((callup) => (
              <Card key={callup.id} className="border-slate-200">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg text-slate-700">{callup.titulo}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600">
                    {format(new Date(callup.fecha_partido), "d 'de' MMMM", { locale: es })} • {callup.hora_partido}
                  </p>
                  <div className="mt-2 text-xs text-slate-500">
                    {getMyPlayersInCallup(callup).map(j => j.jugador_nombre).join(", ")}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl flex items-center gap-2">
              <Trophy className="w-6 h-6 text-orange-600" />
              Confirmar Asistencia
            </DialogTitle>
            <DialogDescription>
              {selectedCallup?.titulo} - {selectedPlayer?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Event summary */}
            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Calendar className="w-4 h-4 text-orange-600" />
                <span>{selectedCallup && format(new Date(selectedCallup.fecha_partido), "EEEE, d 'de' MMMM", { locale: es })}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <Clock className="w-4 h-4 text-orange-600" />
                <span>Partido: {selectedCallup?.hora_partido}</span>
                {selectedCallup?.hora_concentracion && (
                  <span className="text-slate-500">• Concentración: {selectedCallup.hora_concentracion}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <MapPin className="w-4 h-4 text-orange-600" />
                <span>{selectedCallup?.ubicacion}</span>
              </div>
            </div>

            {/* Confirmation options */}
            <div className="space-y-2">
              <Label>Estado de Asistencia *</Label>
              <div className="grid grid-cols-2 gap-3">
                {Object.entries(confirmationConfig).filter(([key]) => key !== "pendiente").map(([key, config]) => {
                  const Icon = config.icon;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setConfirmationData({...confirmationData, confirmacion: key})}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        confirmationData.confirmacion === key
                          ? `${config.border} ${config.bg} ring-2 ring-offset-2 ring-orange-500`
                          : 'border-slate-200 hover:border-slate-300'
                      }`}
                    >
                      <Icon className={`w-6 h-6 mx-auto mb-2 ${confirmationData.confirmacion === key ? config.color : 'text-slate-400'}`} />
                      <p className={`text-sm font-medium ${confirmationData.confirmacion === key ? config.color : 'text-slate-600'}`}>
                        {config.label}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Comment */}
            <div className="space-y-2">
              <Label htmlFor="confirmation-comment">Comentario Adicional (opcional)</Label>
              <Textarea
                id="confirmation-comment"
                placeholder="Ej: Llegaré 10 minutos tarde, tengo revisión médica, etc."
                value={confirmationData.comentario}
                onChange={(e) => setConfirmationData({...confirmationData, comentario: e.target.value})}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>📱 Importante:</strong> El entrenador recibirá tu confirmación inmediatamente y podrá ver el estado actualizado.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setSelectedCallup(null);
                setSelectedPlayer(null);
                setConfirmationData({ confirmacion: "asistire", comentario: "" });
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitConfirmation}
              disabled={updateCallupMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {updateCallupMutation.isPending ? "Guardando..." : "Confirmar Asistencia"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}