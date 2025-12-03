import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  Euro, Calendar, Clock, Users, CheckCircle2, AlertCircle, 
  Upload, Loader2, Bus, MapPin, Ticket, Package, Trophy, HelpCircle
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const TIPO_ICONS = {
  "Autobús": Bus,
  "Excursión": MapPin,
  "Entrada": Ticket,
  "Material": Package,
  "Torneo": Trophy,
  "Equipación Extra": Package,
  "Otro": HelpCircle
};

export default function ParentExtraPayments() {
  const [user, setUser] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [showPayDialog, setShowPayDialog] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState(null);
  const [justificante, setJustificante] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [notas, setNotas] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!user,
  });

  const { data: extraPayments = [], isLoading } = useQuery({
    queryKey: ['extraPayments'],
    queryFn: () => base44.entities.ExtraPayment.list('-created_date'),
    enabled: !!user,
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  const myPlayers = user ? players.filter(p => 
    (p.email_padre === user.email || p.email_tutor_2 === user.email) && p.activo === true
  ) : [];

  // Pagos extras activos que aplican a mis jugadores
  const myActiveExtraPayments = extraPayments.filter(ep => {
    if (!ep.activo) return false;
    
    // Si tiene jugadores específicos, verificar si alguno de mis jugadores está incluido
    if (ep.jugadores_especificos && ep.jugadores_especificos.length > 0) {
      return myPlayers.some(p => 
        ep.jugadores_especificos.some(je => je.jugador_id === p.id)
      );
    }
    
    // Si no tiene categorías específicas, aplica a todos
    if (!ep.categorias_destino || ep.categorias_destino.length === 0) {
      return myPlayers.length > 0;
    }
    
    // Verificar si alguno de mis jugadores está en las categorías destino
    return myPlayers.some(p => ep.categorias_destino.includes(p.deporte));
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ extraPaymentId, jugadorId, jugadorNombre, estado, justificanteUrl, notas }) => {
      const ep = extraPayments.find(e => e.id === extraPaymentId);
      if (!ep) throw new Error("Pago extra no encontrado");

      const pagosRecibidos = ep.pagos_recibidos || [];
      const existingIndex = pagosRecibidos.findIndex(p => p.jugador_id === jugadorId);

      const nuevoPago = {
        jugador_id: jugadorId,
        jugador_nombre: jugadorNombre,
        email_padre: user.email,
        estado: estado,
        justificante_url: justificanteUrl,
        fecha_pago: new Date().toISOString().split('T')[0],
        notas: notas
      };

      if (existingIndex >= 0) {
        pagosRecibidos[existingIndex] = { ...pagosRecibidos[existingIndex], ...nuevoPago };
      } else {
        pagosRecibidos.push(nuevoPago);
      }

      return await base44.entities.ExtraPayment.update(extraPaymentId, {
        pagos_recibidos: pagosRecibidos
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraPayments'] });
      toast.success("✅ Justificante enviado correctamente");
      setShowPayDialog(false);
      setSelectedPayment(null);
      setSelectedPlayer(null);
      setJustificante(null);
      setNotas("");
    },
    onError: (error) => {
      toast.error("Error: " + error.message);
    }
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setJustificante(file_url);
      toast.success("Archivo subido correctamente");
    } catch (error) {
      toast.error("Error al subir archivo");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmitPayment = () => {
    if (!selectedPayment || !selectedPlayer) return;

    updatePaymentMutation.mutate({
      extraPaymentId: selectedPayment.id,
      jugadorId: selectedPlayer.id,
      jugadorNombre: selectedPlayer.nombre,
      estado: "En revisión",
      justificanteUrl: justificante,
      notas: notas
    });
  };

  const openPayDialog = (extraPayment, player) => {
    setSelectedPayment(extraPayment);
    setSelectedPlayer(player);
    setShowPayDialog(true);
  };

  const getPlayerPaymentStatus = (extraPayment, playerId) => {
    const pago = extraPayment.pagos_recibidos?.find(p => p.jugador_id === playerId);
    return pago?.estado || "Pendiente";
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "Pagado":
        return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" /> Pagado</Badge>;
      case "En revisión":
        return <Badge className="bg-yellow-600"><Clock className="w-3 h-3 mr-1" /> En revisión</Badge>;
      default:
        return <Badge className="bg-red-600"><AlertCircle className="w-3 h-3 mr-1" /> Pendiente</Badge>;
    }
  };

  const getPlayersForExtraPayment = (ep) => {
    // Si tiene jugadores específicos, filtrar solo esos
    if (ep.jugadores_especificos && ep.jugadores_especificos.length > 0) {
      return myPlayers.filter(p => 
        ep.jugadores_especificos.some(je => je.jugador_id === p.id)
      );
    }
    
    // Si no, filtrar por categorías
    if (ep.categorias_destino && ep.categorias_destino.length > 0) {
      return myPlayers.filter(p => ep.categorias_destino.includes(p.deporte));
    }
    
    // Si no hay filtros, todos mis jugadores
    return myPlayers;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 space-y-6">
      {/* Dialog de pago */}
      <Dialog open={showPayDialog} onOpenChange={setShowPayDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Subir Justificante de Pago</DialogTitle>
            <DialogDescription>
              {selectedPayment?.titulo} - {selectedPlayer?.nombre}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-4">
              <p className="text-lg font-bold text-slate-900">
                Importe: {selectedPayment?.importe}€
              </p>
              {seasonConfig?.bizum_telefono && (
                <p className="text-sm text-slate-600 mt-2">
                  📱 Bizum: <strong>{seasonConfig.bizum_telefono}</strong>
                </p>
              )}
              <p className="text-xs text-slate-500 mt-2">
                Concepto: {selectedPayment?.titulo} - {selectedPlayer?.nombre}
              </p>
            </div>

            <div className="space-y-2">
              <Label>Justificante de pago *</Label>
              <Input
                type="file"
                accept="image/*,.pdf"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && (
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Subiendo...
                </div>
              )}
              {justificante && (
                <p className="text-sm text-green-600">✅ Archivo subido correctamente</p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                placeholder="Cualquier observación..."
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPayDialog(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitPayment}
              disabled={!justificante || updatePaymentMutation.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {updatePaymentMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enviando...</>
              ) : (
                "Enviar Justificante"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Euro className="w-8 h-8 text-emerald-600" />
          Pagos Extras
        </h1>
        <p className="text-slate-600 mt-1">Pagos especiales: autobuses, excursiones, torneos, etc.</p>
      </div>

      {/* Lista de pagos extras */}
      {myActiveExtraPayments.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <Euro className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p className="text-slate-500">No hay pagos extras pendientes para tus jugadores</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myActiveExtraPayments.map(ep => {
            const Icon = TIPO_ICONS[ep.tipo] || HelpCircle;
            const playersForThis = getPlayersForExtraPayment(ep);

            return (
              <Card key={ep.id} className="overflow-hidden">
                <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center">
                        <Icon className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{ep.titulo}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="outline">{ep.tipo}</Badge>
                          <span className="text-lg font-bold text-emerald-700">{ep.importe}€</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 space-y-4">
                  {ep.descripcion && (
                    <p className="text-sm text-slate-600">{ep.descripcion}</p>
                  )}

                  <div className="flex flex-wrap gap-4 text-sm">
                    {ep.fecha_evento && (
                      <div className="flex items-center gap-1 text-slate-700">
                        <Calendar className="w-4 h-4 text-emerald-600" />
                        Evento: {format(new Date(ep.fecha_evento), "d MMM yyyy", { locale: es })}
                      </div>
                    )}
                    {ep.fecha_limite && (
                      <div className="flex items-center gap-1 text-slate-700">
                        <Clock className="w-4 h-4 text-orange-600" />
                        Límite: {format(new Date(ep.fecha_limite), "d MMM yyyy", { locale: es })}
                      </div>
                    )}
                  </div>

                  {/* Estado por jugador */}
                  <div className="border-t pt-4 space-y-3">
                    <p className="font-medium text-slate-700 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Tus jugadores:
                    </p>
                    {playersForThis.map(player => {
                      const status = getPlayerPaymentStatus(ep, player.id);
                      const pago = ep.pagos_recibidos?.find(p => p.jugador_id === player.id);

                      return (
                        <div 
                          key={player.id} 
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg"
                        >
                          <div>
                            <p className="font-medium text-slate-900">{player.nombre}</p>
                            <p className="text-xs text-slate-500">{player.deporte}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {getStatusBadge(status)}
                            {status === "Pendiente" && (
                              <Button
                                size="sm"
                                onClick={() => openPayDialog(ep, player)}
                                className="bg-emerald-600 hover:bg-emerald-700"
                              >
                                <Upload className="w-4 h-4 mr-1" /> Pagar
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}