import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { 
  Euro, Bus, Ticket, Trophy, Package, Calendar, CheckCircle2, 
  Clock, AlertCircle, Upload, Loader2, FileText
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import ContactCard from "../components/ContactCard";

const tipoEmojis = {
  "Autobús": "🚌",
  "Excursión": "🏕️",
  "Entrada": "🎫",
  "Torneo": "🏆",
  "Material": "📦",
  "Equipación Extra": "👕",
  "Otro": "📋"
};

export default function ParentExtraPayments() {
  const [user, setUser] = useState(null);
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [uploadingFor, setUploadingFor] = useState(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
    };
    fetchUser();
  }, []);

  const { data: extraPayments = [], isLoading } = useQuery({
    queryKey: ['extraPayments'],
    queryFn: () => base44.entities.ExtraPayment.list('-created_date'),
  });

  const { data: players = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ExtraPayment.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['extraPayments'] });
      setSelectedPayment(null);
      toast.success("Justificante subido correctamente");
    },
  });

  // Mis jugadores activos
  const myPlayers = user ? players.filter(p => 
    (p.email_padre === user.email || p.email_tutor_2 === user.email) && p.activo
  ) : [];

  const myPlayerIds = myPlayers.map(p => p.id);

  // Pagos extras que aplican a mis jugadores
  const myExtraPayments = extraPayments.filter(ep => {
    if (!ep.activo) return false;
    // Verificar si tengo algún jugador en los pagos recibidos
    return (ep.pagos_recibidos || []).some(pago => myPlayerIds.includes(pago.jugador_id));
  });

  // Obtener mis pagos dentro de un pago extra
  const getMyPaymentsInExtra = (extraPayment) => {
    return (extraPayment.pagos_recibidos || []).filter(pago => 
      myPlayerIds.includes(pago.jugador_id)
    );
  };

  // Subir justificante
  const handleUploadJustificante = async (extraPaymentId, jugadorId, file) => {
    setUploadingFor(`${extraPaymentId}-${jugadorId}`);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const extraPayment = extraPayments.find(ep => ep.id === extraPaymentId);
      if (!extraPayment) return;

      const updatedPagos = extraPayment.pagos_recibidos.map(pago => {
        if (pago.jugador_id === jugadorId) {
          return {
            ...pago,
            estado: "En revisión",
            justificante_url: file_url,
            fecha_pago: new Date().toISOString().split('T')[0]
          };
        }
        return pago;
      });

      await updateMutation.mutateAsync({
        id: extraPaymentId,
        data: { ...extraPayment, pagos_recibidos: updatedPagos }
      });

      // Notificar al admin
      try {
        const jugador = myPlayers.find(p => p.id === jugadorId);
        await base44.integrations.Core.SendEmail({
          to: "cdbustarviejo@gmail.com",
          subject: `💰 Justificante Pago Extra - ${extraPayment.titulo}`,
          body: `
            <h2>Nuevo justificante de pago extra</h2>
            <p><strong>Concepto:</strong> ${extraPayment.titulo}</p>
            <p><strong>Jugador:</strong> ${jugador?.nombre || "Desconocido"}</p>
            <p><strong>Importe:</strong> ${extraPayment.importe}€</p>
            <p><strong>Justificante:</strong> <a href="${file_url}">Ver justificante</a></p>
          `
        });
      } catch (e) {
        console.error("Error sending email:", e);
      }
    } catch (error) {
      toast.error("Error al subir el justificante");
    } finally {
      setUploadingFor(null);
    }
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
      {/* Header */}
      <div>
        <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 flex items-center gap-2">
          <Euro className="w-8 h-8 text-green-600" />
          Pagos Extras
        </h1>
        <p className="text-slate-600 mt-1">Autobuses, excursiones, entradas y otros pagos especiales</p>
      </div>

      {myExtraPayments.length === 0 ? (
        <Card className="border-dashed border-2">
          <CardContent className="py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No hay pagos extras pendientes</h3>
            <p className="text-slate-500">Cuando haya pagos especiales (autobuses, torneos, etc.) aparecerán aquí</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {myExtraPayments.map(extraPayment => {
            const myPayments = getMyPaymentsInExtra(extraPayment);
            const isExpired = extraPayment.fecha_limite && new Date(extraPayment.fecha_limite) < new Date();
            
            return (
              <Card key={extraPayment.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-2xl">{tipoEmojis[extraPayment.tipo] || "📋"}</span>
                        <CardTitle className="text-lg">{extraPayment.titulo}</CardTitle>
                        <Badge className="bg-green-600">{extraPayment.importe}€</Badge>
                      </div>
                      {extraPayment.descripcion && (
                        <p className="text-sm text-slate-600">{extraPayment.descripcion}</p>
                      )}
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-slate-500">
                        {extraPayment.fecha_evento && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            Evento: {format(new Date(extraPayment.fecha_evento), "d MMM yyyy", { locale: es })}
                          </span>
                        )}
                        {extraPayment.fecha_limite && (
                          <span className={`flex items-center gap-1 ${isExpired ? 'text-red-600 font-medium' : ''}`}>
                            <Clock className="w-3 h-3" />
                            Límite: {format(new Date(extraPayment.fecha_limite), "d MMM yyyy", { locale: es })}
                            {isExpired && " (Vencido)"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {myPayments.map((pago, idx) => {
                      const player = myPlayers.find(p => p.id === pago.jugador_id);
                      const isUploading = uploadingFor === `${extraPayment.id}-${pago.jugador_id}`;
                      
                      return (
                        <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            {player?.foto_url ? (
                              <img src={player.foto_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                                {player?.nombre?.charAt(0) || "?"}
                              </div>
                            )}
                            <div>
                              <p className="font-medium text-slate-900">{pago.jugador_nombre}</p>
                              <p className="text-xs text-slate-500">{player?.deporte}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Badge className={
                              pago.estado === "Pagado" ? "bg-green-600" :
                              pago.estado === "En revisión" ? "bg-yellow-600" :
                              "bg-red-600"
                            }>
                              {pago.estado === "Pagado" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                              {pago.estado === "En revisión" && <Clock className="w-3 h-3 mr-1" />}
                              {pago.estado === "Pendiente" && <AlertCircle className="w-3 h-3 mr-1" />}
                              {pago.estado}
                            </Badge>

                            {pago.estado === "Pendiente" && (
                              <label className="cursor-pointer">
                                <input
                                  type="file"
                                  accept="image/*,.pdf"
                                  className="hidden"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) handleUploadJustificante(extraPayment.id, pago.jugador_id, file);
                                  }}
                                />
                                <Button variant="outline" size="sm" className="pointer-events-none" disabled={isUploading}>
                                  {isUploading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <>
                                      <Upload className="w-4 h-4 mr-1" />
                                      Subir Justificante
                                    </>
                                  )}
                                </Button>
                              </label>
                            )}

                            {pago.justificante_url && (
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => window.open(pago.justificante_url, '_blank')}
                              >
                                <FileText className="w-4 h-4 text-blue-600" />
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

      {/* Instrucciones */}
      <Card className="bg-blue-50 border-blue-200">
        <CardContent className="pt-6">
          <h3 className="font-bold text-blue-900 mb-2">ℹ️ ¿Cómo funciona?</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Los pagos extras son para eventos especiales: autobuses, excursiones, torneos, etc.</li>
            <li>• Realiza la transferencia o Bizum al club con el concepto indicado</li>
            <li>• Sube el justificante de pago pulsando en "Subir Justificante"</li>
            <li>• El club verificará el pago y lo marcará como "Pagado"</li>
          </ul>
        </CardContent>
      </Card>

      <ContactCard />
    </div>
  );
}