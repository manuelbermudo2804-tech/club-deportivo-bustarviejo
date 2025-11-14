import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, MapPin, Clock, Users, ExternalLink, CheckCircle2, XCircle, HelpCircle, Loader2, AlertCircle } from "lucide-react";
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

export default function PlayerCallups() {
  const [user, setUser] = useState(null);
  const [myPlayer, setMyPlayer] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCallup, setSelectedCallup] = useState(null);
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

        const allPlayers = await base44.entities.Player.list();
        const player = allPlayers.find(p => p.email_jugador === currentUser.email);
        setMyPlayer(player);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: callups, isLoading } = useQuery({
    queryKey: ['convocatorias'],
    queryFn: () => base44.entities.Convocatoria.list('-fecha_partido'),
    initialData: [],
    refetchInterval: 30000,
  });

  const updateCallupMutation = useMutation({
    mutationFn: ({ id, callupData }) => base44.entities.Convocatoria.update(id, callupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['convocatorias'] });
      setShowConfirmDialog(false);
      setSelectedCallup(null);
      setConfirmationData({ confirmacion: "asistire", comentario: "" });
    },
  });

  const handleOpenConfirm = (callup) => {
    setSelectedCallup(callup);
    
    const myConfirmation = callup.jugadores_convocados.find(j => j.jugador_id === myPlayer.id);
    if (myConfirmation) {
      setConfirmationData({
        confirmacion: myConfirmation.confirmacion,
        comentario: myConfirmation.comentario || ""
      });
    } else {
      setConfirmationData({ confirmacion: "asistire", comentario: "" });
    }
    
    setShowConfirmDialog(true);
  };

  const handleSubmitConfirmation = () => {
    if (!selectedCallup || !myPlayer) return;

    const updatedJugadores = selectedCallup.jugadores_convocados.map(j => {
      if (j.jugador_id === myPlayer.id) {
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

  // Filter callups where I'm invited
  const myCallups = callups.filter(c => {
    if (!c.publicada || !myPlayer) return false;
    return c.jugadores_convocados.some(j => j.jugador_id === myPlayer.id);
  });

  // Separate upcoming ONLY - past callups are hidden
  const today = new Date().toISOString().split('T')[0];
  const upcomingCallups = myCallups.filter(c => c.fecha_partido >= today && !c.cerrada);

  const confirmationConfig = {
    asistire: { icon: CheckCircle2, color: "text-green-600", label: "✅ Asistiré" },
    no_asistire: { icon: XCircle, color: "text-red-600", label: "❌ No asistiré" },
    duda: { icon: HelpCircle, color: "text-yellow-600", label: "❓ Tengo dudas" },
    pendiente: { icon: Clock, color: "text-slate-500", label: "⏳ Pendiente" }
  };

  if (!myPlayer) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-red-900 mb-2">No se encontró tu perfil de jugador</h2>
            <p className="text-red-700">Contacta con el administrador del club</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">🏆 Mis Convocatorias</h1>
        <p className="text-slate-600 mt-1">Confirma tu asistencia a los partidos y entrenamientos</p>
      </div>

      {upcomingCallups.length > 0 ? (
        <div className="space-y-6">
          {upcomingCallups.map((callup) => {
            const myConfirmation = callup.jugadores_convocados.find(j => j.jugador_id === myPlayer.id);
            const config = myConfirmation ? confirmationConfig[myConfirmation.confirmacion] : confirmationConfig.pendiente;
            const Icon = config.icon;
            const isPending = myConfirmation?.confirmacion === "pendiente";

            return (
              <Card key={callup.id} className={`border-2 shadow-lg ${
                isPending ? 'border-orange-300 bg-orange-50/30' : 'border-slate-200'
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
                        {isPending && (
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

                  {callup.descripcion && (
                    <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-orange-600">
                      <p className="text-sm text-slate-700 whitespace-pre-wrap">{callup.descripcion}</p>
                    </div>
                  )}

                  <div className="bg-slate-50 rounded-lg p-4 border-t-2 border-slate-200">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-5 h-5 ${config.color}`} />
                        <span className={`font-semibold ${config.color}`}>{config.label}</span>
                      </div>
                      <Button
                        onClick={() => handleOpenConfirm(callup)}
                        variant={isPending ? "default" : "outline"}
                        size="sm"
                        className={isPending ? "bg-orange-600 hover:bg-orange-700" : ""}
                      >
                        {isPending ? "Confirmar Ahora" : "Cambiar Confirmación"}
                      </Button>
                    </div>
                    
                    {myConfirmation?.comentario && (
                      <div className="mt-2 text-sm text-slate-600 italic border-l-2 border-slate-300 pl-3">
                        "{myConfirmation.comentario}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Users className="w-4 h-4" />
                    <span>
                      {callup.jugadores_convocados.length} jugadores convocados •{" "}
                      <strong className="text-green-600">
                        {callup.jugadores_convocados.filter(j => j.confirmacion === "asistire").length} confirmados
                      </strong>
                    </span>
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
              Cuando seas convocado a un partido o entrenamiento, aparecerá aquí
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">Confirmar Mi Asistencia</DialogTitle>
            <DialogDescription>
              {selectedCallup?.titulo}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="player-confirmation-status">¿Asistirás al evento?</Label>
              <Select 
                value={confirmationData.confirmacion} 
                onValueChange={(value) => setConfirmationData({...confirmationData, confirmacion: value})}
              >
                <SelectTrigger id="player-confirmation-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asistire">✅ Sí, asistiré</SelectItem>
                  <SelectItem value="no_asistire">❌ No asistiré</SelectItem>
                  <SelectItem value="duda">❓ Tengo dudas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="player-confirmation-comment">Comentario (opcional)</Label>
              <Textarea
                id="player-confirmation-comment"
                placeholder="Ej: Llegaré un poco tarde, No puedo por motivos personales, etc."
                value={confirmationData.comentario}
                onChange={(e) => setConfirmationData({...confirmationData, comentario: e.target.value})}
                rows={3}
              />
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                <strong>Importante:</strong> Confirma lo antes posible para ayudar al entrenador a organizar el equipo.
              </AlertDescription>
            </Alert>
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
              disabled={updateCallupMutation.isPending}
              className="bg-orange-600 hover:bg-orange-700"
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
  );
}