import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, Loader2, Search, Plus, X } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";

import ContactCard from "../components/ContactCard";
import ParentPaymentForm from "../components/payments/ParentPaymentForm";

export default function ParentPayments() {
  const [uploadingPaymentId, setUploadingPaymentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: players } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      return allPlayers.filter(p =>
        p.email_padre === user?.email || p.email_tutor_2 === user?.email
      );
    },
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ['myPayments'],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date');
      const playerIds = players.map(p => p.id);
      return allPayments.filter(payment => playerIds.includes(payment.jugador_id));
    },
    enabled: players.length > 0,
    initialData: [],
  });

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const jugadorId = urlParams.get('jugador_id');
    if (jugadorId) {
      setShowForm(true);
    }
  }, []);

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      const payment = await base44.entities.Payment.create(paymentData);
      
      // Send email to club
      const player = players.find(p => p.id === paymentData.jugador_id);
      try {
        console.log('📧 [ParentPayments] Enviando notificación de pago a admin');
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo - Sistema de Pagos",
          to: "cdbustarviejo@gmail.com",
          subject: `Nuevo Pago Registrado - ${paymentData.jugador_nombre}`,
          body: `
            <h2>Nuevo Pago Registrado</h2>
            <p><strong>Jugador:</strong> ${paymentData.jugador_nombre}</p>
            <p><strong>Email Padre:</strong> ${player?.email_padre || 'N/A'}</p>
            <p><strong>Tipo de Pago:</strong> ${paymentData.tipo_pago}</p>
            <p><strong>Mes:</strong> ${paymentData.mes}</p>
            <p><strong>Temporada:</strong> ${paymentData.temporada}</p>
            <p><strong>Cantidad:</strong> ${paymentData.cantidad}€</p>
            <p><strong>Método de Pago:</strong> ${paymentData.metodo_pago}</p>
            ${paymentData.fecha_pago ? `<p><strong>Fecha de Pago:</strong> ${new Date(paymentData.fecha_pago).toLocaleDateString('es-ES')}</p>` : ''}
            <hr>
            <p><strong>Estado:</strong> ${paymentData.justificante_url ? 'En revisión 🟠' : 'Pendiente 🔴'}</p>
            ${paymentData.justificante_url ? `<p><strong>Justificante:</strong> <a href="${paymentData.justificante_url}">Ver justificante</a></p>` : ''}
            ${paymentData.notas ? `<p><strong>Notas:</strong> ${paymentData.notas}</p>` : ''}
            <hr>
            <p style="font-size: 12px; color: #666;">Registrado el ${new Date().toLocaleString('es-ES')}</p>
          `
        });
        
        // Send confirmation to parents
        const confirmBody = `Estimados padres/tutores,

Confirmamos que hemos recibido el registro de pago para ${paymentData.jugador_nombre}.

DETALLES DEL PAGO
Periodo: ${paymentData.mes}
Temporada: ${paymentData.temporada}
Cantidad: ${paymentData.cantidad} euros
Estado: ${paymentData.justificante_url ? 'En revision' : 'Pendiente de justificante'}

${paymentData.justificante_url ? 'Estamos revisando tu justificante y actualizaremos el estado pronto.' : 'Recuerda subir el justificante de pago para que podamos verificarlo.'}

Atentamente,

CD Bustarviejo

Datos de contacto:
Email: cdbustarviejo@gmail.com
        `;
        
        console.log('📧 [ParentPayments] Enviando confirmación a padres:', { padre: player?.email_padre, tutor2: player?.email_tutor_2 });
        
        if (player?.email_padre) {
          console.log('📤 [ParentPayments] Enviando a padre:', player.email_padre);
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: player.email_padre,
            subject: "Pago Registrado - CD Bustarviejo",
            body: confirmBody
          });
          console.log('✅ [ParentPayments] Email enviado a padre');
        }
        
        if (player?.email_tutor_2) {
          console.log('📤 [ParentPayments] Enviando a tutor 2:', player.email_tutor_2);
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: player.email_tutor_2,
            subject: "Pago Registrado - CD Bustarviejo",
            body: confirmBody
          });
          console.log('✅ [ParentPayments] Email enviado a tutor 2');
        }
      } catch (error) {
        console.error("Error sending email notifications:", error);
      }
      
      return payment;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      setShowForm(false);
      toast.success("Pago registrado correctamente");
    },
    onError: () => {
      toast.error("Error al registrar el pago");
    }
  });

  const uploadJustificanteMutation = useMutation({
    mutationFn: async ({ paymentId, file }) => {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const payment = payments.find(p => p.id === paymentId);
      await base44.entities.Payment.update(paymentId, {
        ...payment,
        justificante_url: file_url,
        estado: "En revisión"
      });

      const player = players.find(p => p.id === payment.jugador_id);
      
      try {
        console.log('📧 [ParentPayments] Enviando notificación de justificante a admin');
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo - Sistema de Pagos",
          to: "cdbustarviejo@gmail.com",
          subject: `Justificante de Pago Recibido - ${payment.jugador_nombre}`,
          body: `
            <h2>Nuevo Justificante de Pago Subido</h2>
            <p><strong>Jugador:</strong> ${payment.jugador_nombre}</p>
            <p><strong>Tipo de Pago:</strong> ${payment.tipo_pago}</p>
            <p><strong>Mes:</strong> ${payment.mes}</p>
            <p><strong>Temporada:</strong> ${payment.temporada}</p>
            <p><strong>Cantidad:</strong> ${payment.cantidad}€</p>
            <p><strong>Método de Pago:</strong> ${payment.metodo_pago}</p>
            ${payment.fecha_pago ? `<p><strong>Fecha de Pago:</strong> ${new Date(payment.fecha_pago).toLocaleDateString('es-ES')}</p>` : ''}
            <hr>
            <p><strong>Estado:</strong> En revisión 🟠</p>
            <p><strong>Justificante:</strong> <a href="${file_url}" target="_blank" rel="noopener noreferrer">Ver justificante</a></p>
            ${payment.notas ? `<p><strong>Notas:</strong> ${payment.notas}</p>` : ''}
            <hr>
            <p style="font-size: 12px; color: #666;">Justificante subido el ${new Date().toLocaleString('es-ES')}</p>
          `
        });
        
        // Send confirmation to parents
        const confirmBody = `Estimados padres/tutores,

Hemos recibido el justificante de pago para ${payment.jugador_nombre}.

DETALLES DEL PAGO
Periodo: ${payment.mes}
Temporada: ${payment.temporada}
Cantidad: ${payment.cantidad} euros
Estado: En revision

Estamos verificando tu justificante y actualizaremos el estado pronto.

Atentamente,

CD Bustarviejo

Datos de contacto:
Email: cdbustarviejo@gmail.com
        `;
        
        console.log('📧 [ParentPayments] Enviando confirmación de justificante a padres:', { padre: player?.email_padre, tutor2: player?.email_tutor_2 });
        
        if (player?.email_padre) {
          console.log('📤 [ParentPayments] Enviando a padre:', player.email_padre);
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: player.email_padre,
            subject: "Justificante Recibido - CD Bustarviejo",
            body: confirmBody
          });
          console.log('✅ [ParentPayments] Email enviado a padre');
        }
        
        if (player?.email_tutor_2) {
          console.log('📤 [ParentPayments] Enviando a tutor 2:', player.email_tutor_2);
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: player.email_tutor_2,
            subject: "Justificante Recibido - CD Bustarviejo",
            body: confirmBody
          });
          console.log('✅ [ParentPayments] Email enviado a tutor 2');
        }
      } catch (error) {
        console.error("Error sending email notification:", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      toast.success("Justificante subido correctamente. El pago está en revisión.");
      setUploadingPaymentId(null);
    },
    onError: () => {
      toast.error("Error al subir el justificante");
      setUploadingPaymentId(null);
    }
  });

  const handleFileUpload = async (paymentId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPaymentId(paymentId);
    uploadJustificanteMutation.mutate({ paymentId, file });
  };

  const handleSubmitPayment = async (paymentData) => {
    createPaymentMutation.mutate(paymentData);
  };

  const filteredPayments = payments.filter(payment =>
    payment.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    payment.mes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const statusEmojis = {
    "Pagado": "🟢",
    "En revisión": "🟠",
    "Pendiente": "🔴"
  };

  const getCurrentSeason = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };
  
  const currentSeason = getCurrentSeason();
  const pendingCount = payments.filter(p => p.estado === "Pendiente" && p.temporada === currentSeason).length;
  const inReviewCount = payments.filter(p => p.estado === "En revisión" && p.temporada === currentSeason).length;
  const paidCount = payments.filter(p => p.estado === "Pagado" && p.temporada === currentSeason).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mis Pagos</h1>
          <p className="text-slate-600 mt-1">Gestiona tus cuotas y justificantes</p>
        </div>
        <Button
          onClick={() => {
            setShowForm(!showForm);
            if (!showForm) {
              setTimeout(() => {
                const formElement = document.querySelector('[data-payment-form]');
                if (formElement) {
                  formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }, 100);
            }
          }}
          type="button"
          className="bg-orange-600 hover:bg-orange-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Pago
        </Button>
      </div>

      {/* Stats - Simplified */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pendientes</p>
                <p className="text-3xl font-bold text-red-600">{pendingCount}</p>
              </div>
              <span className="text-4xl">🔴</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">En Revisión</p>
                <p className="text-3xl font-bold text-orange-600">{inReviewCount}</p>
              </div>
              <span className="text-4xl">🟠</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form */}
      <div data-payment-form>
        <AnimatePresence>
          {showForm && (
            <ParentPaymentForm
              players={players}
              payments={payments}
              onSubmit={handleSubmitPayment}
              onCancel={() => setShowForm(false)}
              isSubmitting={createPaymentMutation.isPending}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Payments by Player */}
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-48 w-full" />
            ))}
          </div>
        ) : players.length === 0 ? (
          <Card className="border-none shadow-lg bg-white">
            <CardContent className="py-12 text-center">
              <p className="text-slate-500">No tienes jugadores registrados</p>
            </CardContent>
          </Card>
        ) : (
          players
            .filter(player => 
              !searchTerm || 
              player.nombre.toLowerCase().includes(searchTerm.toLowerCase())
            )
            .map((player) => {
              const playerPayments = payments.filter(p => p.jugador_id === player.id);
              
              // Si tiene pago único pagado o en revisión, solo mostrar Junio
              const hasPagoUnico = playerPayments.some(p => 
                (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
                (p.estado === "Pagado" || p.estado === "En revisión")
              );
              
              const relevantPayments = hasPagoUnico 
                ? playerPayments.filter(p => p.mes === "Junio")
                : playerPayments;
              
              const pendingPayments = relevantPayments.filter(p => p.estado === "Pendiente");
              const reviewPayments = relevantPayments.filter(p => p.estado === "En revisión");
              const paidPayments = relevantPayments.filter(p => p.estado === "Pagado");

              return (
                <Card key={player.id} className="border-none shadow-lg bg-white overflow-hidden">
                  <CardHeader className="bg-slate-50 border-b">
                    <div className="flex items-center gap-3">
                      {player.foto_url ? (
                        <img src={player.foto_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-lg">
                          {player.nombre.charAt(0)}
                        </div>
                      )}
                      <div>
                        <CardTitle className="text-xl text-slate-900">{player.nombre}</CardTitle>
                        <p className="text-sm text-slate-600">{player.deporte}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {relevantPayments.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <p>No hay pagos registrados para este jugador</p>
                        <Button
                          onClick={() => {
                            setShowForm(true);
                            setTimeout(() => {
                              const formElement = document.querySelector('[data-payment-form]');
                              if (formElement) {
                                formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                              }
                            }, 100);
                          }}
                          type="button"
                          variant="outline"
                          className="mt-4"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Registrar Primer Pago
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {relevantPayments.map((payment) => (
                          <div key={payment.id} className={`border-l-4 p-3 rounded ${
                            payment.estado === "Pagado" ? "border-green-500 bg-green-50" :
                            payment.estado === "En revisión" ? "border-orange-500 bg-orange-50" :
                            "border-red-500 bg-red-50"
                          }`}>
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-bold text-slate-900">{payment.mes}</span>
                                  <span className="text-2xl">{statusEmojis[payment.estado]}</span>
                                  <span className="text-lg font-bold">{payment.cantidad}€</span>
                                </div>
                                <p className="text-xs text-slate-600">{payment.estado}</p>
                              </div>
                              {payment.justificante_url && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => window.open(payment.justificante_url, '_blank')}
                                  className={payment.estado === "Pagado" ? "text-green-600 hover:text-green-700" : "text-orange-600 hover:text-orange-700"}
                                >
                                  <FileText className="w-4 h-4 mr-1" />
                                  Ver
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })
        )}
      </div>

      <ContactCard />

      {/* Instrucciones simplificadas */}
      <Card className="border-orange-200 bg-orange-50">
        <CardContent className="p-4">
          <p className="text-sm text-slate-700">
            <strong>🔴 Pendiente:</strong> Sube justificante • 
            <strong className="ml-2">🟠 En Revisión:</strong> Verificando • 
            <strong className="ml-2">🟢 Pagado:</strong> Confirmado
          </p>
        </CardContent>
      </Card>
    </div>
  );
}