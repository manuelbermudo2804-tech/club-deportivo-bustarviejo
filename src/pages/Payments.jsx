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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, FileText, Loader2, Search, Plus, X, FileSpreadsheet, AlertTriangle, Calendar, Filter } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import ContactCard from "../components/ContactCard";
import ParentPaymentForm from "../components/payments/ParentPaymentForm";
import BankReconciliation from "../components/payments/BankReconciliation";
import ExportButton from "../components/ExportButton";

const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

const calculateDaysOverdue = (mes) => {
  const vencimientos = {
    "Junio": new Date(new Date().getFullYear(), 5, 30),
    "Septiembre": new Date(new Date().getFullYear(), 8, 15),
    "Diciembre": new Date(new Date().getFullYear(), 11, 15)
  };
  
  const vencimiento = vencimientos[mes];
  if (!vencimiento) return 0;
  
  const today = new Date();
  const diff = Math.floor((today - vencimiento) / (1000 * 60 * 60 * 24));
  return diff > 0 ? diff : 0;
};

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
  const [previewImage, setPreviewImage] = useState(null);
  
  // Filtros avanzados
  const [temporadaFilter, setTemporadaFilter] = useState(getCurrentSeason());
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);

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
      toast.success("Pago actualizado correctamente");
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

  const handleStatusChange = async (payment, newStatus) => {
    if (!isAdmin) {
      console.warn("Only administrators can change payment status.");
      return;
    }
    const updatedData = { ...payment, estado: newStatus };
    if (newStatus === "Pagado" && !payment.fecha_pago) {
      updatedData.fecha_pago = new Date().toISOString().split('T')[0];
    }
    
    await updatePaymentMutation.mutateAsync({ id: payment.id, paymentData: updatedData });
    
    // Enviar email de confirmación al padre
    if (newStatus === "Pagado") {
      try {
        const player = players.find(p => p.id === payment.jugador_id);
        if (player?.email_padre) {
          await base44.integrations.Core.SendEmail({
            to: player.email_padre,
            subject: `✅ Pago Confirmado - ${payment.jugador_nombre}`,
            body: `
              <h2>Pago Confirmado</h2>
              <p>Hola,</p>
              <p>Te confirmamos que hemos recibido y verificado el pago de <strong>${payment.jugador_nombre}</strong>.</p>
              <hr>
              <p><strong>Detalles del pago:</strong></p>
              <ul>
                <li><strong>Periodo:</strong> ${payment.mes}</li>
                <li><strong>Temporada:</strong> ${payment.temporada}</li>
                <li><strong>Cantidad:</strong> ${payment.cantidad}€</li>
                <li><strong>Estado:</strong> ✅ Pagado</li>
              </ul>
              <hr>
              <p>Gracias por tu pago.</p>
              <p><strong>CD Bustarviejo</strong></p>
            `
          });
        }
      } catch (error) {
        console.error("Error sending confirmation email:", error);
      }
    }
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

  // Filtrado avanzado
  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.mes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlayer = playerFilter === "all" || payment.jugador_id === playerFilter;
    const matchesTemporada = temporadaFilter === "all" || payment.temporada === temporadaFilter;
    const matchesEstado = estadoFilter === "all" || payment.estado === estadoFilter;
    
    // Filtro de categoría
    let matchesCategoria = true;
    if (categoriaFilter !== "all") {
      const player = players.find(p => p.id === payment.jugador_id);
      matchesCategoria = player?.deporte === categoriaFilter;
    }
    
    // Filtro de vencidos
    let matchesOverdue = true;
    if (showOverdueOnly) {
      const daysOverdue = calculateDaysOverdue(payment.mes);
      matchesOverdue = payment.estado !== "Pagado" && daysOverdue > 0;
    }
    
    return matchesSearch && matchesPlayer && matchesTemporada && matchesEstado && matchesCategoria && matchesOverdue;
  });

  const filteredPlayer = (playerFilter && playerFilter !== "all")
    ? players.find(p => p.id === playerFilter)
    : null;

  const statusEmojis = {
    "Pagado": "🟢",
    "En revisión": "🟠",
    "Pendiente": "🔴"
  };

  // Estadísticas mejoradas
  const pendingCount = payments.filter(p => p.estado === "Pendiente" && p.temporada === temporadaFilter).length;
  const inReviewCount = payments.filter(p => p.estado === "En revisión" && p.temporada === temporadaFilter).length;
  const paidCount = payments.filter(p => p.estado === "Pagado" && p.temporada === temporadaFilter).length;
  
  const overduePayments = payments.filter(p => {
    if (p.estado === "Pagado" || p.temporada !== temporadaFilter) return false;
    return calculateDaysOverdue(p.mes) > 0;
  });
  
  const totalRecaudado = payments
    .filter(p => p.estado === "Pagado" && p.temporada === temporadaFilter)
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  // Temporadas únicas
  const temporadas = ["all", ...new Set(payments.map(p => p.temporada).filter(Boolean))];
  
  // Categorías únicas
  const categorias = ["all", ...new Set(players.map(p => p.deporte).filter(Boolean))];

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

      {/* Stats mejoradas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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

        {isAdmin && (
          <>
            <Card className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100 border-red-200">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-red-900 mb-1 font-semibold">Vencidos</p>
                    <p className="text-3xl font-bold text-red-700">{overduePayments.length}</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-green-900 mb-1 font-semibold">Recaudado</p>
                    <p className="text-2xl font-bold text-green-700">{totalRecaudado.toFixed(0)}€</p>
                  </div>
                  <span className="text-4xl">💰</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Alerta de pagos vencidos */}
      {isAdmin && overduePayments.length > 0 && (
        <Card className="border-2 border-red-400 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-2">⚠️ Pagos Vencidos Detectados</h3>
                <p className="text-sm text-red-800 mb-3">
                  Hay {overduePayments.length} pago(s) vencido(s) que requieren atención
                </p>
                <Button
                  size="sm"
                  onClick={() => setShowOverdueOnly(!showOverdueOnly)}
                  className={showOverdueOnly ? "bg-red-700" : "bg-red-600 hover:bg-red-700"}
                >
                  {showOverdueOnly ? "Ver Todos" : "Ver Solo Vencidos"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
          {/* Filtros avanzados */}
          {isAdmin && (
            <Card className="border-none shadow-lg bg-white">
              <CardHeader className="border-b border-slate-100">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Filter className="w-5 h-5" />
                  Filtros Avanzados
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Temporada</label>
                    <Select value={temporadaFilter} onValueChange={setTemporadaFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {temporadas.map(t => (
                          <SelectItem key={t} value={t}>
                            {t === "all" ? "Todas las temporadas" : t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Categoría</label>
                    <Select value={categoriaFilter} onValueChange={setCategoriaFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas las categorías</SelectItem>
                        {categorias.filter(c => c !== "all").map(cat => (
                          <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Estado</label>
                    <Select value={estadoFilter} onValueChange={setEstadoFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los estados</SelectItem>
                        <SelectItem value="Pendiente">Pendiente</SelectItem>
                        <SelectItem value="En revisión">En revisión</SelectItem>
                        <SelectItem value="Pagado">Pagado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-end">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setTemporadaFilter(getCurrentSeason());
                        setCategoriaFilter("all");
                        setEstadoFilter("all");
                        setShowOverdueOnly(false);
                        setSearchTerm("");
                      }}
                      className="w-full"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Limpiar Filtros
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

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
                <CardTitle className="text-xl">
                  Detalle de Pagos
                  {filteredPayments.length !== payments.length && (
                    <span className="text-sm font-normal text-slate-600 ml-2">
                      ({filteredPayments.length} de {payments.length})
                    </span>
                  )}
                </CardTitle>
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
                      {filteredPayments.map((payment) => {
                        const daysOverdue = calculateDaysOverdue(payment.mes);
                        const isOverdue = payment.estado !== "Pagado" && daysOverdue > 0;
                        
                        return (
                          <TableRow key={payment.id} className={`hover:bg-slate-50 ${isOverdue ? 'bg-red-50' : ''}`}>
                            <TableCell className="font-medium">
                              {payment.jugador_nombre}
                              {isOverdue && (
                                <Badge className="ml-2 bg-red-500 text-white text-xs">
                                  Vencido {daysOverdue}d
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>{payment.mes}</TableCell>
                            <TableCell className="font-medium text-slate-700">
                              {payment.temporada}
                            </TableCell>
                            <TableCell className="font-bold text-slate-900">
                              {payment.cantidad}€
                            </TableCell>
                            <TableCell className="text-sm text-slate-600">
                              {payment.mes === "Junio" && "30 de junio"}
                              {payment.mes === "Septiembre" && "15 de sept"}
                              {payment.mes === "Diciembre" && "15 de dic"}
                            </TableCell>
                            <TableCell>
                              {payment.justificante_url ? (
                                <div className="flex items-center gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setPreviewImage(payment.justificante_url)}
                                    className="text-orange-600 hover:text-orange-700 p-0 h-auto"
                                  >
                                    <FileText className="w-4 h-4 mr-1" />
                                    <span className="text-xs">Ver</span>
                                  </Button>
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
                                      ✓ Pagado
                                    </Button>
                                  )}
                                </div>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
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

      {/* Modal de vista previa */}
      <Dialog open={!!previewImage} onOpenChange={() => setPreviewImage(null)}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Vista Previa del Justificante</DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="mt-4">
              {previewImage.endsWith('.pdf') ? (
                <iframe src={previewImage} className="w-full h-[600px] border rounded-lg" />
              ) : (
                <img src={previewImage} alt="Justificante" className="w-full h-auto rounded-lg" />
              )}
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => window.open(previewImage, '_blank')}
                >
                  Abrir en nueva pestaña
                </Button>
                <Button onClick={() => setPreviewImage(null)}>
                  Cerrar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
          {isAdmin && (
            <>
              <p>• <strong>Filtros:</strong> Usa los filtros avanzados para buscar pagos específicos por temporada, categoría o estado</p>
              <p>• <strong>Vencidos:</strong> Los pagos vencidos aparecen resaltados en rojo con los días de retraso</p>
            </>
          )}
          <p className="pt-2 border-t border-orange-200">
            <strong>Importante:</strong> Sube el justificante junto con el registro del pago para que pueda ser verificado más rápidamente.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}