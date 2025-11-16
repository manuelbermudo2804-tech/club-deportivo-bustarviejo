import React, { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, Loader2, Search, Plus, X, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import ContactCard from "../components/ContactCard";
import ParentPaymentForm from "../components/payments/ParentPaymentForm";
import BankReconciliation from "../components/payments/BankReconciliation";
import ExportButton from "../components/ExportButton";

export default function Payments() {
  const location = useLocation();
  const urlParams = new URLSearchParams(location.search);
  const jugadorIdFromUrl = urlParams.get('jugador_id');
  const autoRegister = urlParams.get('register') === 'true';

  const [uploadingPaymentId, setUploadingPaymentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isCoach, setIsCoach] = useState(false);
  const [myPlayers, setMyPlayers] = useState([]);
  const [activeTab, setActiveTab] = useState("pagos");
  const [playerFilter, setPlayerFilter] = useState(jugadorIdFromUrl || "all");

  const formRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    const checkUserRoleAndPlayers = async () => {
      try {
        const currentUser = await base44.auth.me();
        const adminCheck = currentUser.role === "admin";
        const coachCheck = currentUser.es_entrenador === true && !adminCheck;

        setIsAdmin(adminCheck);
        setIsCoach(coachCheck);

        if (adminCheck) {
          const allPlayers = await base44.entities.Player.list();
          setMyPlayers(allPlayers);
        } else if (coachCheck) {
          const allPlayers = await base44.entities.Player.list();
          const userPlayers = allPlayers.filter(p =>
            p.email_padre === currentUser.email ||
            p.email_tutor_2 === currentUser.email
          );
          setMyPlayers(userPlayers);
        }
      } catch (error) {
        console.error("Error checking user role and fetching players:", error);
        setIsAdmin(false);
        setIsCoach(false);
        setMyPlayers([]);
      }
    };
    checkUserRoleAndPlayers();
  }, []);

  useEffect(() => {
    if (autoRegister && (isAdmin || (isCoach && myPlayers.length > 0))) {
      setShowForm(true);
      window.history.replaceState({}, '', window.location.pathname);
      setTimeout(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    }
  }, [autoRegister, isAdmin, isCoach, myPlayers.length]);

  const { data: players } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      if (isAdmin) {
        return await base44.entities.Player.list();
      } else if (isCoach) {
        const allPlayers = await base44.entities.Player.list();
        return allPlayers.filter(p =>
          p.email_padre === user?.email || p.email_tutor_2 === user?.email
        );
      }
      return [];
    },
    enabled: !!user?.email && (isAdmin || isCoach),
    initialData: [],
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ['myPayments'],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list('-created_date');
      if (isAdmin) {
        return allPayments;
      } else if (isCoach) {
        const playerIds = players.map(p => p.id);
        return allPayments.filter(payment => playerIds.includes(payment.jugador_id));
      }
      return [];
    },
    enabled: players.length > 0,
    initialData: [],
  });

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

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, paymentData }) => base44.entities.Payment.update(id, paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
    },
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

  const handleStatusChange = (payment, newStatus) => {
    if (!isAdmin) {
      console.warn("Only administrators can change payment status.");
      return;
    }
    const updatedData = { ...payment, estado: newStatus };
    if (newStatus === "Pagado" && !payment.fecha_pago) {
      updatedData.fecha_pago = new Date().toISOString().split('T')[0];
    }
    updatePaymentMutation.mutate({ id: payment.id, paymentData: updatedData });
  };

  const handleFileUpload = async (paymentId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPaymentId(paymentId);
    uploadJustificanteMutation.mutate({ paymentId, file });
  };

  const handleSubmitPayment = async (paymentData) => {
    createPaymentMutation.mutate(paymentData);
  };

  const handleReconcile = () => {
    queryClient.invalidateQueries({ queryKey: ['myPayments'] });
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.mes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlayer = playerFilter === "all" || payment.jugador_id === playerFilter;
    return matchesSearch && matchesPlayer;
  });

  const filteredPlayer = (playerFilter && playerFilter !== "all")
    ? players.find(p => p.id === playerFilter)
    : null;

  const statusEmojis = {
    "Pagado": "🟢",
    "En revisión": "🟠",
    "Pendiente": "🔴"
  };

  const pendingCount = payments.filter(p => p.estado === "Pendiente").length;
  const inReviewCount = payments.filter(p => p.estado === "En revisión").length;
  const paidCount = payments.filter(p => p.estado === "Pagado").length;

  const prepareExportData = () => {
    return filteredPayments.map(p => ({
      Jugador: p.jugador_nombre,
      Tipo: p.tipo_pago,
      Mes: p.mes,
      Temporada: p.temporada,
      Cantidad: `${p.cantidad}€`,
      Estado: p.estado,
      Metodo: p.metodo_pago,
      'Fecha Pago': p.fecha_pago || '-',
      'Tiene Justificante': p.justificante_url ? 'Sí' : 'No',
      'Reconciliado': p.reconciliado_banco ? 'Sí' : 'No'
    }));
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isAdmin ? "Gestión de Pagos" : isCoach ? "Mis Pagos" : "Pagos"}
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? "Gestiona las cuotas y justificantes de todos los jugadores" : "Gestiona tus cuotas y justificantes"}
          </p>
          {filteredPlayer && (
            <div className="flex items-center gap-2 mt-3">
              <Badge className="bg-orange-100 text-orange-700 text-sm py-1">
                Filtrando por: {filteredPlayer.nombre}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setPlayerFilter("all");
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="h-7 px-2 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
        <div className="flex gap-2">
          {filteredPayments.length > 0 && (
            <ExportButton
              data={prepareExportData()}
              filename="pagos_club"
            />
          )}
          <Button
            onClick={() => {
              setShowForm(!showForm);
              if (!showForm) {
                setTimeout(() => {
                  formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 100);
              }
            }}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Registrar Pago
          </Button>
        </div>
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

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full">
          <TabsTrigger value="pagos" className="flex-1">Gestión de Pagos</TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="reconciliacion" className="flex-1">
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Reconciliación Bancaria
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="pagos" className="space-y-6">
          {/* Payment Form */}
          <div ref={formRef}>
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
          </div>

          {/* Payments Table */}
          <Card className="border-none shadow-lg bg-white">
            <CardHeader className="border-b border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-xl">Detalle de Pagos</CardTitle>
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
                  <p className="text-sm text-slate-400 mt-2">Haz clic en "Registrar Pago" para añadir uno nuevo</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Jugador</TableHead>
                        <TableHead>Período</TableHead>
                        <TableHead>Temporada</TableHead>
                        <TableHead>Cantidad</TableHead>
                        <TableHead>Vencimiento</TableHead>
                        <TableHead>Justificante</TableHead>
                        <TableHead>Estado</TableHead>
                        {isAdmin && <TableHead>Acciones</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((payment) => (
                        <TableRow key={payment.id} className="hover:bg-slate-50">
                          <TableCell className="font-medium">{payment.jugador_nombre}</TableCell>
                          <TableCell>{payment.mes}</TableCell>
                          <TableCell className="font-medium text-slate-700">
                            {payment.temporada}
                          </TableCell>
                          <TableCell className="font-bold text-slate-900">
                            {payment.cantidad}€
                          </TableCell>
                          <TableCell className="text-sm text-slate-600">
                            Día 30 de {payment.mes}
                          </TableCell>
                          <TableCell>
                            {payment.justificante_url ? (
                              <div className="flex items-center gap-2">
                                <a
                                  href={payment.justificante_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1 text-orange-600 hover:text-orange-700"
                                >
                                  <FileText className="w-4 h-4" />
                                  <span className="text-xs">Ver</span>
                                </a>
                              </div>
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
                          {isAdmin && (
                            <TableCell>
                              <div className="flex gap-2">
                                {payment.estado !== "Pagado" && (
                                  <Button
                                    size="sm"
                                    onClick={() => handleStatusChange(payment, "Pagado")}
                                    className="bg-green-600 hover:bg-green-700 text-xs"
                                  >
                                    Marcar Pagado
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          )}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="reconciliacion">
            <BankReconciliation
              payments={payments}
              players={players}
              onReconcile={handleReconcile}
            />
          </TabsContent>
        )}
      </Tabs>

      <ContactCard />

      {/* Instrucciones */}
      <Card className="border-none shadow-lg bg-orange-50 border-orange-200">
        <CardHeader>
          <CardTitle className="text-lg text-orange-900">ℹ️ Instrucciones</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-700">
          <p>• <strong>Registrar un pago:</strong> Haz clic en el botón "Registrar Pago", selecciona el jugador, tipo de pago y sube el justificante</p>
          <p>• <strong>Pagos Pendientes (🔴):</strong> Sube el justificante de pago (transferencia) haciendo clic en "Subir"</p>
          <p>• <strong>En Revisión (🟠):</strong> {isAdmin ? "Verifica el justificante y marca como pagado" : "El administrador está verificando tu pago"}</p>
          <p>• <strong>Pagado (🟢):</strong> El pago ha sido confirmado</p>
          <p className="pt-2 border-t border-orange-200">
            <strong>Importante:</strong> Sube el justificante junto con el registro del pago para que pueda ser verificado más rápidamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}