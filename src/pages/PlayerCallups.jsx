import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Check, X, HelpCircle, Clock, MapPin, Calendar, AlertCircle, Trophy } from "lucide-react";
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

export default function PlayerCallups() {
  const [user, setUser] = useState(null);
  const [player, setPlayer] = useState(null);
  const [selectedCallup, setSelectedCallup] = useState(null);
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
        
        if (currentUser.jugador_id) {
          const allPlayers = await base44.entities.Player.list();
          const myPlayer = allPlayers.find(p => p.id === currentUser.jugador_id);
          setPlayer(myPlayer);
        }
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
      setConfirmationData({ confirmacion: "asistire", comentario: "" });
      toast.success("Confirmación registrada correctamente");
    },
  });

  const handleConfirm = (callup) => {
    setSelectedCallup(callup);
    
    // Get existing confirmation
    const myData = callup.jugadores_convocados.find(j => j.jugador_id === player.id);
    setConfirmationData({
      confirmacion: myData?.confirmacion || "asistire",
      comentario: myData?.comentario || ""
    });
    
    setShowConfirmDialog(true);
  };

  const handleSubmitConfirmation = () => {
    if (!selectedCallup || !player) return;

    const updatedPlayers = selectedCallup.jugadores_convocados.map(j => {
      if (j.jugador_id === player.id) {
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

  // Filter callups where I'm convocated
  const myCallups = allCallups.filter(callup => 
    callup.publicada && 
    callup.jugadores_convocados.some(j => j.jugador_id === player?.id)
  );

  // Separate upcoming and past
  const today = new Date().toISOString().split('T')[0];
  const upcomingCallups = myCallups.filter(c => c.fecha_partido >= today && !c.cerrada);
  const pastCallups = myCallups.filter(c => c.fecha_partido < today || c.cerrada);

  const confirmationConfig = {
    asistire: { icon: Check, color: "text-green-600", bg: "bg-green-50", border: "border-green-300", label: "Asistiré" },
    no_asistire: { icon: X, color: "text-red-600", bg: "bg-red-50", border: "border-red-300", label: "No asistiré" },
    duda: { icon: HelpCircle, color: "text-yellow-600", bg: "bg-yellow-50", border: "border-yellow-300", label: "Tengo duda" },
    pendiente: { icon: Clock, color: "text-slate-600", bg: "bg-slate-50", border: "border-slate-300", label: "Sin confirmar" }
  };

  if (!player) {
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
          Mis Convocatorias
        </h1>
        <p className="text-slate-600 mt-1">Confirma tu asistencia a partidos y entrenamientos</p>
      </div>

      {/* Pending confirmation alert */}
      {upcomingCallups.some(c => {
        const myData = c.jugadores_convocados.find(j => j.jugador_id === player.id);
        return myData?.confirmacion === "pendiente";
      }) && (
        <Card className="border-2 border-orange-300 bg-orange-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
              <div>
                <h3 className="font-bold text-orange-900 mb-1">⚠️ Confirmación Pendiente</h3>
                <p className="text-sm text-orange-800">
                  Tienes convocatorias que requieren confirmación. Por favor, confirma tu asistencia lo antes posible.
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
                const myData = callup.jugadores_convocados.find(j => j.jugador_id === player.id);
                const config = confirmationConfig[myData?.confirmacion] || confirmationConfig.pendiente;
                const Icon = config.icon;
                
                return (
                  <motion.div
                    key={callup.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                  >
                    <Card className={`border-2 ${config.border} shadow-lg`}>
                      <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge className="bg-white/20 text-white text-xs">
                                {callup.tipo}
                              </Badge>
                              <Badge className={`${config.bg} ${config.color} border-white/20`}>
                                <Icon className="w-3 h-3 mr-1" />
                                {config.label}
                              </Badge>
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
                              <span className="text-sm text-orange-600 font-semibold">
                                • ⚠️ Llega a las: {callup.hora_concentracion}
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
                          <div className="bg-orange-50 rounded-lg p-3 border-l-4 border-orange-600">
                            <p className="text-sm text-slate-700 whitespace-pre-wrap font-medium">{callup.descripcion}</p>
                          </div>
                        )}

                        {/* My confirmation */}
                        {myData?.comentario && (
                          <div className={`${config.bg} rounded-lg p-3 border-l-4 ${config.border}`}>
                            <p className="text-sm font-medium text-slate-700">
                              <strong>Tu comentario:</strong> {myData.comentario}
                            </p>
                          </div>
                        )}

                        {myData?.fecha_confirmacion && (
                          <p className="text-xs text-slate-500">
                            Confirmado: {format(new Date(myData.fecha_confirmacion), "d 'de' MMM, HH:mm", { locale: es })}
                          </p>
                        )}

                        {/* Coach info */}
                        <div className="text-sm text-slate-600 pt-2 border-t">
                          <strong>👨‍🏫 Entrenador:</strong> {callup.entrenador_nombre}
                        </div>

                        {/* Confirm button */}
                        <Button
                          onClick={() => handleConfirm(callup)}
                          className="w-full bg-orange-600 hover:bg-orange-700"
                          size="lg"
                        >
                          {myData?.confirmacion === "pendiente" ? "✅ Confirmar Asistencia" : "Cambiar Confirmación"}
                        </Button>
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
          <p className="text-slate-500 text-lg">No tienes convocatorias próximas</p>
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
              {selectedCallup?.titulo}
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
                  <span className="text-orange-600 font-semibold">• Concentración: {selectedCallup.hora_concentracion}</span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-700">
                <MapPin className="w-4 h-4 text-orange-600" />
                <span>{selectedCallup?.ubicacion}</span>
              </div>
            </div>

            {/* Confirmation options */}
            <div className="space-y-2">
              <Label>¿Podrás asistir? *</Label>
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
              <Label htmlFor="player-confirmation-comment">Comentario (opcional)</Label>
              <Textarea
                id="player-confirmation-comment"
                placeholder="Ej: Llegaré tarde, tengo revisión médica, etc."
                value={confirmationData.comentario}
                onChange={(e) => setConfirmationData({...confirmationData, comentario: e.target.value})}
                rows={3}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                <strong>📱 Importante:</strong> Tu entrenador verá tu respuesta al instante. Si no puedes asistir, avisa lo antes posible.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmDialog(false);
                setSelectedCallup(null);
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
              {updateCallupMutation.isPending ? "Guardando..." : "✅ Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}