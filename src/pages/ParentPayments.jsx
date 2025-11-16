import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, Loader2, Search, Plus, CreditCard, Info, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";

import ContactCard from "../components/ContactCard";
import ParentPaymentForm from "../components/payments/ParentPaymentForm";

const CLUB_IBAN = "ES82 0049 4447 38 2010604048";

export default function ParentPayments() {
  const [uploadingPaymentId, setUploadingPaymentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [copiedIban, setCopiedIban] = useState(false);
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

  const copyIban = async () => {
    try {
      await navigator.clipboard.writeText(CLUB_IBAN);
      setCopiedIban(true);
      toast.success("IBAN copiado");
      setTimeout(() => setCopiedIban(false), 2000);
    } catch (error) {
      toast.error("Error al copiar");
    }
  };

  const createPaymentMutation = useMutation({
    mutationFn: (paymentData) => base44.entities.Payment.create(paymentData),
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

      try {
        await base44.integrations.Core.SendEmail({
          to: "CDBUSTARVIEJO@GMAIL.COM",
          subject: `Justificante de Pago - ${payment.jugador_nombre}`,
          body: `
            <h2>Nuevo Justificante de Pago</h2>
            <p><strong>Jugador:</strong> ${payment.jugador_nombre}</p>
            <p><strong>Mes:</strong> ${payment.mes} (${payment.tipo_pago})</p>
            <p><strong>Temporada:</strong> ${payment.temporada}</p>
            <p><strong>Cantidad:</strong> ${payment.cantidad}€</p>
            <hr>
            <p><strong>Justificante:</strong> <a href="${file_url}">Ver justificante</a></p>
          `
        });
      } catch (error) {
        console.error("Error sending email:", error);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      toast.success("Justificante subido. El pago está en revisión.");
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
    <div className="p-4 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mis Pagos</h1>
          <p className="text-slate-600 mt-1">Gestiona tus cuotas</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Registrar Pago
        </Button>
      </div>

      {/* Datos Bancarios SIEMPRE VISIBLES */}
      <Card className="border-2 border-orange-400 shadow-xl bg-gradient-to-br from-orange-50 to-white">
        <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white pb-4">
          <CardTitle className="flex items-center gap-2 text-xl">
            <CreditCard className="w-6 h-6" />
            Datos Bancarios del Club
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="bg-white rounded-xl p-4 border-2 border-slate-200">
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex-1">
                <p className="text-xs text-slate-600 font-medium mb-1">IBAN</p>
                <p className="font-mono font-bold text-lg text-slate-900">{CLUB_IBAN}</p>
                <p className="text-sm text-slate-600 mt-1">Banco Santander - CD Bustarviejo</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={copyIban}
                className="ml-4"
              >
                {copiedIban ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          
          <Alert className="mt-4 bg-blue-50 border-blue-300">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              <strong>📝 Importante:</strong> Al hacer la transferencia, indica en el <strong>concepto</strong> el formato: 
              <span className="font-mono bg-white px-2 py-1 rounded ml-1">CATEGORÍA-NOMBRE_APELLIDOS</span>
              <br/>
              <span className="text-xs mt-1 block">Ejemplo: <span className="font-mono bg-white px-1">BENJAMÍN-JUAN_GARCÍA</span></span>
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            onSubmit={handleSubmitPayment}
            onCancel={() => setShowForm(false)}
            isSubmitting={createPaymentMutation.isPending}
          />
        )}
      </AnimatePresence>

      {/* Payments Table */}
      <Card className="border-none shadow-lg bg-white">
        <CardHeader className="border-b border-slate-100">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-xl">Mis Pagos Registrados</CardTitle>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filteredPayments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500">No hay pagos registrados</p>
              <p className="text-sm text-slate-400 mt-2">Haz clic en "Registrar Pago" para añadir uno</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Cantidad</TableHead>
                    <TableHead>Justificante</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredPayments.map((payment) => (
                    <TableRow key={payment.id} className="hover:bg-slate-50">
                      <TableCell className="font-medium">{payment.jugador_nombre}</TableCell>
                      <TableCell>
                        {payment.mes}
                        <span className="text-xs text-slate-500 block">{payment.temporada}</span>
                      </TableCell>
                      <TableCell className="font-bold text-slate-900">
                        {payment.cantidad}€
                      </TableCell>
                      <TableCell>
                        {payment.justificante_url ? (
                          <a
                            href={payment.justificante_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700"
                          >
                            <FileText className="w-4 h-4" />
                            <span className="text-xs">Ver</span>
                          </a>
                        ) : payment.estado === "Pagado" ? (
                          <span className="text-xs text-slate-400">-</span>
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
                            <label htmlFor={`upload-${payment.id}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={uploadingPaymentId === payment.id}
                                onClick={() => document.getElementById(`upload-${payment.id}`).click()}
                                className="text-xs"
                              >
                                {uploadingPaymentId === payment.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Subiendo...
                                  </>
                                ) : (
                                  <>
                                    <Upload className="w-3 h-3 mr-1" />
                                    Subir
                                  </>
                                )}
                              </Button>
                            </label>
                          </>
                        )}
                      </TableCell>
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instrucciones simplificadas */}
      <Card className="border-none shadow-lg bg-blue-50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-lg text-blue-900">📋 Cómo Funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">1</span>
            <p><strong>Haz la transferencia</strong> con el IBAN de arriba (indica tu concepto: CATEGORÍA-NOMBRE)</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">2</span>
            <p><strong>Haz una captura</strong> del justificante de tu banco</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-orange-600 text-white rounded-full flex items-center justify-center text-xs font-bold">3</span>
            <p><strong>Registra el pago aquí</strong> y sube la captura (botón "Registrar Pago")</p>
          </div>
          <div className="flex items-start gap-3">
            <span className="flex-shrink-0 w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs font-bold">✓</span>
            <p><strong>Listo!</strong> El administrador lo revisará y confirmará</p>
          </div>
        </CardContent>
      </Card>

      <ContactCard />
    </div>
  );
}