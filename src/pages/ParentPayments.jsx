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

  const pendingCount = payments.filter(p => p.estado === "Pendiente").length;
  const inReviewCount = payments.filter(p => p.estado === "En revisión").length;
  const paidCount = payments.filter(p => p.estado === "Pagado").length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mis Pagos</h1>
          <p className="text-slate-600 mt-1">Gestiona tus cuotas y justificantes</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Pago
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600 mb-1">Pagados</p>
                <p className="text-3xl font-bold text-green-600">{paidCount}</p>
              </div>
              <span className="text-4xl">🟢</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Payment Form */}
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
              const pendingPayments = playerPayments.filter(p => p.estado === "Pendiente");
              const reviewPayments = playerPayments.filter(p => p.estado === "En revisión");
              const paidPayments = playerPayments.filter(p => p.estado === "Pagado");

              return (
                <Card key={player.id} className="border-none shadow-lg bg-white overflow-hidden">
                  <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b border-orange-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {player.foto_url ? (
                          <img src={player.foto_url} className="w-12 h-12 rounded-full object-cover border-2 border-orange-300" alt="" />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-bold text-lg">
                            {player.nombre.charAt(0)}
                          </div>
                        )}
                        <div>
                          <CardTitle className="text-xl text-slate-900">{player.nombre}</CardTitle>
                          <p className="text-sm text-slate-600">{player.deporte}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {pendingPayments.length > 0 && (
                          <Badge className="bg-red-500 text-white">
                            {pendingPayments.length} Pendiente{pendingPayments.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                        {reviewPayments.length > 0 && (
                          <Badge className="bg-orange-500 text-white">
                            {reviewPayments.length} En Revisión
                          </Badge>
                        )}
                        {paidPayments.length > 0 && (
                          <Badge className="bg-green-500 text-white">
                            {paidPayments.length} Pagado{paidPayments.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {playerPayments.length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <p>No hay pagos registrados para este jugador</p>
                        <Button
                          onClick={() => {
                            setShowForm(true);
                            setTimeout(() => {
                              const form = document.querySelector('form');
                              if (form) form.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                          }}
                          variant="outline"
                          className="mt-4"
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Registrar Primer Pago
                        </Button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {playerPayments.map((payment) => (
                          <div key={payment.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                              <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                  <Badge className={
                                    payment.estado === "Pagado"
                                      ? "bg-green-100 text-green-700"
                                      : payment.estado === "En revisión"
                                      ? "bg-orange-100 text-orange-700"
                                      : "bg-red-100 text-red-700"
                                  }>
                                    <span className="mr-1">{statusEmojis[payment.estado]}</span>
                                    {payment.estado}
                                  </Badge>
                                  <span className="font-semibold text-slate-900">{payment.mes} - {payment.temporada}</span>
                                  <Badge variant="outline">{payment.tipo_pago}</Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-slate-600">
                                  <span className="font-bold text-lg text-slate-900">{payment.cantidad}€</span>
                                  <span>• Vencimiento: 30 de {payment.mes}</span>
                                  {payment.fecha_pago && (
                                    <span>• Pagado: {new Date(payment.fecha_pago).toLocaleDateString('es-ES')}</span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                {payment.justificante_url ? (
                                  <a
                                    href={payment.justificante_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-50 text-orange-700 hover:bg-orange-100 transition-colors"
                                  >
                                    <FileText className="w-4 h-4" />
                                    <span className="text-sm font-medium">Ver Justificante</span>
                                  </a>
                                ) : payment.estado === "Pagado" ? (
                                  <span className="text-xs text-slate-400">Sin justificante</span>
                                ) : (
                                  <>
                                    <input
                                      type="file"
                                      accept="image/*,.pdf"
                                      onChange={(e) => handleFileUpload(payment.id, e)}
                                      className="hidden"
                                      id={`upload-${payment.id}`}
                                      disabled={uploadingPaymentId === payment.id}
                                    />
                                    <Button
                                       variant="outline"
                                       size="sm"
                                       disabled={uploadingPaymentId === payment.id}
                                       onClick={(e) => {
                                         e.preventDefault();
                                         document.getElementById(`upload-${payment.id}`).click();
                                       }}
                                       asChild
                                     >
                                        {uploadingPaymentId === payment.id ? (
                                          <>
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Subiendo...
                                          </>
                                        ) : (
                                          <>
                                            <Upload className="w-4 h-4 mr-2" />
                                            Subir Justificante
                                          </>
                                        )}
                                      </Button>
                                    </label>
                                  </>
                                )}
                              </div>
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

      {/* Instrucciones */}
      <Card className="border-none shadow-lg bg-orange-50 border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg text-orange-900">ℹ️ Instrucciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>• <strong>Registrar un pago:</strong> Haz clic en el botón "Registrar Pago", selecciona el jugador, tipo de pago y sube el justificante</p>
          <p>• <strong>Pagos Pendientes (🔴):</strong> Sube el justificante de pago (Bizum o transferencia) haciendo clic en "Subir"</p>
          <p>• <strong>En Revisión (🟠):</strong> El administrador está verificando tu pago</p>
          <p>• <strong>Pagado (🟢):</strong> El pago ha sido confirmado por el administrador</p>
          <p className="pt-2 border-t border-orange-200">
            <strong>Importante:</strong> Sube el justificante junto con el registro del pago para que pueda ser verificado más rápidamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}