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
import { Upload, FileText, Loader2, Search, Plus, X, FileSpreadsheet, AlertTriangle, Calendar, Filter, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

import ContactCard from "../components/ContactCard";
import ParentPaymentForm from "../components/payments/ParentPaymentForm";
import BankReconciliation from "../components/payments/BankReconciliation";
import ExportButton from "../components/ExportButton";
import { getCuotasPorCategoriaSync, getImportePorCategoriaYMesSync as getImportePorMes } from "../components/payments/paymentAmounts";

const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

// Normalizar temporada para comparación (soporta "2025/2026" y "2025-2026")
const normalizeTemporada = (temporada) => {
  if (!temporada) return "";
  return temporada.replace(/-/g, "/");
};

const matchTemporada = (paymentTemp, filterTemp) => {
  if (filterTemp === "all") return true;
  return normalizeTemporada(paymentTemp) === normalizeTemporada(filterTemp);
};

// Obtener todas las temporadas únicas de los pagos para usar como default
const getDefaultSeason = (payments) => {
  if (!payments || payments.length === 0) return getCurrentSeason();
  const seasons = [...new Set(payments.map(p => p.temporada).filter(Boolean))];
  // Si hay pagos, usar la temporada más reciente
  return seasons.sort().reverse()[0] || getCurrentSeason();
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
  
  // Fetch active season config
  const { data: activeSeasonConfig } = useQuery({
    queryKey: ['activeSeasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
  });
  
  // Filtros avanzados - iniciar con "all" para mostrar TODOS los pagos por defecto
  const [temporadaFilter, setTemporadaFilter] = useState("all");

  // NO auto-filtrar por temporada activa - empezar mostrando TODOS los pagos
  // El usuario puede filtrar manualmente si lo desea
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
        console.log('[DEBUG ROLES] Usuario:', currentUser.email, 'role:', currentUser.role, 'es_tesorero:', currentUser.es_tesorero, 'es_entrenador:', currentUser.es_entrenador);
        const adminCheck = currentUser.role === "admin";
        const treasurerCheck = currentUser.es_tesorero === true;
        const coachCheck = currentUser.es_entrenador === true && !adminCheck;

        console.log('[DEBUG ROLES] adminCheck:', adminCheck, 'treasurerCheck:', treasurerCheck, 'coachCheck:', coachCheck, 'isAdmin final:', adminCheck || treasurerCheck);
        setIsAdmin(adminCheck || treasurerCheck);
        setIsCoach(coachCheck);

        if (adminCheck || treasurerCheck) {
          const allPlayers = await base44.entities.Player.list();
          // SOLO jugadores ACTIVOS de la temporada actual
          setMyPlayers(allPlayers.filter(p => p.activo === true));
        } else if (coachCheck) {
          const allPlayers = await base44.entities.Player.list();
          // SOLO jugadores ACTIVOS de la temporada actual
          const userPlayers = allPlayers.filter(p =>
            (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email) && p.activo === true
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

  const { data: players = [] } = useQuery({
    queryKey: ['allPlayers'],
    queryFn: async () => {
      const allPlayers = await base44.entities.Player.list();
      // SOLO jugadores ACTIVOS
      return allPlayers.filter(p => p.activo === true) || [];
    },
    initialData: [],
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['myPayments'],
    queryFn: async () => {
      try {
        const allPayments = await base44.entities.Payment.list('-created_date');
        console.log('[DEBUG PAGOS QUERY] Total pagos en BD:', allPayments?.length);
        return allPayments || [];
      } catch (error) {
        console.error("Error loading payments:", error);
        return [];
      }
    },
    initialData: [],
    staleTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: 'always',
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
        console.log('📧 [Payments] Enviando notificación de justificante a admin');
        await base44.integrations.Core.SendEmail({
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
    
    // Enviar email de confirmación a los padres
    if (newStatus === "Pagado") {
      try {
        const player = players.find(p => p.id === payment.jugador_id);
        
        console.log('📧 [Payments] Enviando confirmación de pago a padres:', { jugador: payment.jugador_nombre, padre: player?.email_padre, tutor2: player?.email_tutor_2 });
        
        const confirmBody = `Estimados padres/tutores,

Confirmamos que hemos recibido y verificado el pago de ${payment.jugador_nombre}.

DETALLES DEL PAGO
Periodo: ${payment.mes}
Temporada: ${payment.temporada}
Cantidad: ${payment.cantidad} euros
Estado: Pagado

Gracias por su pago.

Atentamente,

CD Bustarviejo

Datos de contacto:
Email: cdbustarviejo@gmail.com
        `;
        
        if (player?.email_padre) {
          console.log('📤 [Payments] Enviando a padre:', player.email_padre);
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: player.email_padre,
            subject: "Pago Confirmado - CD Bustarviejo",
            body: confirmBody
          });
          console.log('✅ [Payments] Email enviado a padre');
        }
        
        if (player?.email_tutor_2) {
          console.log('📤 [Payments] Enviando a tutor 2:', player.email_tutor_2);
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: player.email_tutor_2,
            subject: "Pago Confirmado - CD Bustarviejo",
            body: confirmBody
          });
          console.log('✅ [Payments] Email enviado a tutor 2');
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

  // Filtrado avanzado - aplicar solo a admin
  const filteredPayments = !isAdmin ? (payments || []) : (payments || []).filter(payment => {
    const matchesSearch = searchTerm === "" || 
      payment.jugador_nombre?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.mes?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPlayer = playerFilter === "all" || payment.jugador_id === playerFilter;
    const matchesTemporada = matchTemporada(payment.temporada, temporadaFilter);
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
    "Pendiente": "🔴",
    "Anulado": "⚪️"
  };

  // Estadísticas mejoradas - si el filtro es "all", contar todos
  const statsTemporada = temporadaFilter === "all" ? null : temporadaFilter;
  const inReviewCount = (payments || []).filter(p => p.estado === "En revisión" && (statsTemporada === null || matchTemporada(p.temporada, statsTemporada))).length;
  const paidCount = (payments || []).filter(p => p.estado === "Pagado" && (statsTemporada === null || matchTemporada(p.temporada, statsTemporada))).length;
  
  // Calcular pendientes: cuántas cuotas faltan por pagar de todos los jugadores
  const pendingCount = React.useMemo(() => {
    let totalPendientes = 0;
    const targetTemporada = temporadaFilter === "all" ? null : temporadaFilter;
    
    if (!players || !payments) return 0;
    
    players.forEach(player => {
      const playerPayments = payments.filter(p => 
        p.jugador_id === player.id && 
        (targetTemporada === null || matchTemporada(p.temporada, targetTemporada))
      );
      
      // Verificar si tiene pago único pagado o en revisión
      const hasPagoUnico = playerPayments.some(p => 
        (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
        (p.estado === "Pagado" || p.estado === "En revisión")
      );
      
      if (hasPagoUnico) {
        // Si tiene pago único, no faltan cuotas
        return;
      }
      
      // Contar cuotas pagadas o en revisión de tipo "Tres meses"
      const mesesPagados = playerPayments
        .filter(p => p.tipo_pago === "Tres meses" && (p.estado === "Pagado" || p.estado === "En revisión"))
        .map(p => p.mes);
      
      // Faltan 3 meses menos los que ya están pagados/en revisión
      const cuotasFaltantes = 3 - mesesPagados.length;
      totalPendientes += cuotasFaltantes;
    });
    
    return totalPendientes;
  }, [players, payments, temporadaFilter]);
  
  // Calcular vencidos: cuotas que pasaron su fecha de vencimiento
  const overdueCount = React.useMemo(() => {
    let totalVencidos = 0;
    const targetTemporada = temporadaFilter === "all" ? null : temporadaFilter;
    
    if (!players || !payments) return 0;
    
    players.forEach(player => {
      const playerPayments = payments.filter(p => 
        p.jugador_id === player.id && 
        (targetTemporada === null || matchTemporada(p.temporada, targetTemporada))
      );
      
      // Verificar si tiene pago único pagado
      const hasPagoUnico = playerPayments.some(p => 
        (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
        p.estado === "Pagado"
      );
      
      if (hasPagoUnico) {
        // Si tiene pago único pagado, no hay vencidos
        return;
      }
      
      // Verificar cada mes (Junio, Septiembre, Diciembre)
      const allMonths = ["Junio", "Septiembre", "Diciembre"];
      
      allMonths.forEach(mes => {
        const pagoMes = playerPayments.find(p => p.mes === mes);
        const daysOverdue = calculateDaysOverdue(mes);
        
        // Si no tiene pago o el pago no está pagado, y ya pasó la fecha de vencimiento
        if (daysOverdue > 0 && (!pagoMes || pagoMes.estado !== "Pagado")) {
          totalVencidos++;
        }
      });
    });
    
    return totalVencidos;
  }, [players, payments, temporadaFilter]);
  
  const overduePayments = (payments || []).filter(p => {
    if (p.estado === "Pagado") return false;
    if (!matchTemporada(p.temporada, temporadaFilter)) return false;
    return calculateDaysOverdue(p.mes) > 0;
  });
  
  const totalRecaudado = (payments || [])
    .filter(p => p.estado === "Pagado" && matchTemporada(p.temporada, temporadaFilter))
    .reduce((sum, p) => sum + (p.cantidad || 0), 0);

  // Temporadas únicas - mantener formato original pero ordenar correctamente
  const temporadasRaw = [...new Set((payments || []).map(p => p.temporada).filter(Boolean))];
  // Ordenar temporadas de más reciente a más antigua
  const temporadasOrdenadas = temporadasRaw.sort((a, b) => {
    const yearA = parseInt(normalizeTemporada(a).split('/')[0]);
    const yearB = parseInt(normalizeTemporada(b).split('/')[0]);
    return yearB - yearA;
  });
  const temporadas = ["all", ...temporadasOrdenadas];
  
  // Categorías únicas
  const categorias = ["all", ...new Set((players || []).map(p => p.deporte).filter(Boolean))];

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
            onClick={async () => {
              toast.loading("Actualizando datos...", { id: "refresh" });
              try {
                await queryClient.invalidateQueries({ queryKey: ['myPayments'] });
                await queryClient.invalidateQueries({ queryKey: ['myPlayers', user?.email] });
                await queryClient.refetchQueries({ queryKey: ['myPayments'] });
                await queryClient.refetchQueries({ queryKey: ['myPlayers', user?.email] });
                toast.success("Datos actualizados", { id: "refresh" });
              } catch (error) {
                toast.error("Error al actualizar", { id: "refresh" });
              }
            }}
            variant="outline"
            className="shadow-lg"
          >
            <RefreshCw className="w-5 h-5" />
          </Button>
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
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Pendientes</p>
                <p className="text-3xl font-bold text-red-600">{pendingCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Cuotas por pagar</p>
              </div>
              <span className="text-4xl">🔴</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">En Revisión</p>
                <p className="text-3xl font-bold text-orange-600">{inReviewCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Pagos verificando</p>
              </div>
              <span className="text-4xl">🟠</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Pagados</p>
                <p className="text-3xl font-bold text-green-600">{paidCount}</p>
                <p className="text-[10px] text-slate-500 mt-1">Pagos confirmados</p>
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
                  <div className="flex-1">
                    <p className="text-sm text-red-900 mb-1 font-semibold">Vencidos</p>
                    <p className="text-3xl font-bold text-red-700">{overdueCount}</p>
                    <p className="text-[10px] text-red-700 mt-1">Pasó fecha límite</p>
                  </div>
                  <AlertTriangle className="w-10 h-10 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-lg bg-gradient-to-br from-green-50 to-green-100">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="text-sm text-green-900 mb-1 font-semibold">Recaudado</p>
                    <p className="text-2xl font-bold text-green-700">{totalRecaudado.toFixed(0)}€</p>
                    <p className="text-[10px] text-green-700 mt-1">Total temporada</p>
                  </div>
                  <span className="text-4xl">💰</span>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Alerta de pagos vencidos */}
      {isAdmin && overdueCount > 0 && (
        <Card className="border-2 border-red-400 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-start gap-4">
              <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="font-bold text-red-900 mb-2">⚠️ Pagos Vencidos Detectados</h3>
                <p className="text-sm text-red-800 mb-3">
                  Hay {overdueCount} cuota(s) vencida(s) que requieren atención
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
                        setTemporadaFilter(activeSeasonConfig?.temporada || "all");
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
                  payments={payments}
                  onSubmit={handleSubmitPayment}
                  onCancel={() => setShowForm(false)}
                  isSubmitting={createPaymentMutation.isPending}
                  isAdmin={isAdmin}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Payments by Player */}
          <Card className="border-none shadow-lg bg-white">
            <CardHeader className="border-b border-slate-100">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <CardTitle className="text-xl">
                  Pagos por Jugador
                </CardTitle>
                <div className="relative w-full md:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Buscar jugador..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-32 w-full" />
                  ))}
                </div>
              ) : !players || players.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-slate-500">No hay jugadores registrados</p>
                </div>
              ) : (() => {
                // Filtrar jugadores por búsqueda Y filtros avanzados
                const playersToShow = (players || []).filter(player => {
                 // Filtro de búsqueda
                 const matchesSearch = searchTerm === "" || player.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

                 // Filtro de categoría
                 const matchesCategoria = categoriaFilter === "all" || player.deporte === categoriaFilter;

                 // Filtro por estado - verificar si el jugador tiene pagos del estado buscado
                 let matchesEstado = true;
                 if (estadoFilter !== "all") {
                   const playerPayments = (payments || []).filter(p => p.jugador_id === player.id && matchTemporada(p.temporada, temporadaFilter));
                   
                   // Si filtramos por "Pendiente", verificar si le falta algún pago
                   if (estadoFilter === "Pendiente") {
                     const hasPagoUnico = playerPayments.some(p => 
                       (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
                       (p.estado === "Pagado" || p.estado === "En revisión")
                     );
                     
                     if (hasPagoUnico) {
                       matchesEstado = false; // No mostrar si ya pagó todo con pago único
                     } else {
                       // Contar meses que YA están pagados o en revisión
                       const mesesPagadosORevision = playerPayments
                         .filter(p => p.estado === "Pagado" || p.estado === "En revisión")
                         .map(p => p.mes);
                       
                       // Verificar si hay meses sin pagar (considerando los 3 meses: Junio, Sep, Dic)
                       const allMonths = ["Junio", "Septiembre", "Diciembre"];
                       const mesesSinPagar = allMonths.filter(mes => !mesesPagadosORevision.includes(mes));
                       
                       matchesEstado = mesesSinPagar.length > 0; // Mostrar si le falta al menos 1 pago
                     }
                   } else {
                     // Para otros estados, mostrar si tiene al menos un pago con ese estado
                     matchesEstado = playerPayments.some(p => p.estado === estadoFilter);
                   }
                 }

                 return matchesSearch && matchesCategoria && matchesEstado;
                });

                if (playersToShow.length === 0) {
                 return (
                   <div className="text-center py-12">
                     <p className="text-slate-500">No se encontraron jugadores con los filtros aplicados</p>
                   </div>
                 );
                }

                return (
                 <div className="space-y-4">
                   {playersToShow.map(player => {
                     const allPlayerPayments = filteredPayments.filter(p => p.jugador_id === player.id);

                      // Determinar meses según tipo de pago REAL (no del player.tipo_pago)
                      // Si tiene un pago "Único" pagado o en revisión, solo mostrar Junio
                      const hasPagoUnico = allPlayerPayments.some(p => 
                        (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
                        (p.estado === "Pagado" || p.estado === "En revisión")
                      );

                      // Si tiene pago único, solo mostrar ese pago (Junio), ignorar los demás
                      const playerPayments = hasPagoUnico
                        ? allPlayerPayments.filter(p => p.mes === "Junio")
                        : allPlayerPayments;

                      // Determinar los meses que debería tener este jugador
                      const allMonths = hasPagoUnico
                        ? ["Junio"]
                        : ["Junio", "Septiembre", "Diciembre"];

                      // Obtener TODOS los pagos reales del jugador para la temporada (sin filtros de estado)
                      const allRealPayments = (payments || []).filter(p => 
                        p.jugador_id === player.id && 
                        matchTemporada(p.temporada, temporadaFilter)
                      );

                      console.log(`[DEBUG PAGOS] Jugador: ${player.nombre}, Pagos reales encontrados:`, allRealPayments.length, allRealPayments.map(p => ({mes: p.mes, estado: p.estado})));

                      // Si temporadaFilter es "all", mostrar los pagos reales sin crear virtuales
                      // Si hay filtro de temporada, crear pagos virtuales para los meses que faltan
                      let displayPayments;
                      if (temporadaFilter === "all") {
                        // Solo mostrar pagos reales cuando el filtro es "all"
                        displayPayments = allRealPayments;
                      } else {
                        // Crear pagos virtuales para los meses que faltan
                        displayPayments = allMonths.map(mes => {
                          // Buscar en TODOS los pagos reales, no solo los filtrados
                          const existingPayment = allRealPayments.find(p => p.mes === mes);
                          if (existingPayment) {
                            console.log(`[DEBUG PAGOS] ${player.nombre} - Mes ${mes}: Pago REAL encontrado con estado ${existingPayment.estado}`);
                            return existingPayment;
                          }
                          // Crear un pago virtual pendiente con cantidad correcta
                          const cuotas = getCuotasPorCategoriaSync(player.deporte);
                          const cantidad = hasPagoUnico 
                            ? cuotas.total 
                            : getImportePorMes(player.deporte, mes);
                          
                          console.log(`[DEBUG PAGOS] ${player.nombre} - Mes ${mes}: Creando pago VIRTUAL`);
                          return {
                            id: `virtual-${player.id}-${mes}`,
                            jugador_id: player.id,
                            jugador_nombre: player.nombre,
                            mes: mes,
                            temporada: temporadaFilter,
                            estado: "Pendiente",
                            cantidad: cantidad,
                            tipo_pago: hasPagoUnico ? "Único" : "Tres meses",
                            isVirtual: true
                          };
                        });
                      }

                      // Si hay filtro de estado activo, filtrar displayPayments también
                      if (estadoFilter !== "all") {
                        displayPayments = displayPayments.filter(p => p.estado === estadoFilter);
                      }
                      
                      // Contar pagos por estado (reales + virtuales para mostrar correctamente)
                      const reviewPayments = displayPayments.filter(p => p.estado === "En revisión");
                      const paidPayments = displayPayments.filter(p => p.estado === "Pagado");
                      
                      // Calcular cuántos pagos REALMENTE faltan
                      // Si tiene pago único pagado/revisión = 0 pendientes
                      // Si no, contar meses sin pago o con pago pendiente
                      let totalPaymentsDue = 0;
                      if (!hasPagoUnico) {
                        // Filtrar pagos de la temporada actual del jugador (no de filteredPayments que puede estar filtrado)
                        const playerPaymentsTemporada = (payments || []).filter(p => 
                          p.jugador_id === player.id && 
                          matchTemporada(p.temporada, temporadaFilter)
                        );
                        const mesesConPagoOK = playerPaymentsTemporada
                          .filter(p => p.estado === "Pagado" || p.estado === "En revisión")
                          .map(p => p.mes);
                        totalPaymentsDue = allMonths.filter(mes => !mesesConPagoOK.includes(mes)).length;
                      }
                      
                      // Total pendiente en euros - calcular basado en meses que faltan
                      let totalPending = 0;
                      if (!hasPagoUnico && totalPaymentsDue > 0) {
                        const playerPaymentsTemporada = payments.filter(p => 
                          p.jugador_id === player.id && 
                          matchTemporada(p.temporada, temporadaFilter)
                        );
                        const mesesConPagoOK = playerPaymentsTemporada
                          .filter(p => p.estado === "Pagado" || p.estado === "En revisión")
                          .map(p => p.mes);
                        const mesesPendientes = allMonths.filter(mes => !mesesConPagoOK.includes(mes));
                        
                        mesesPendientes.forEach(mes => {
                          totalPending += getImportePorMes(player.deporte, mes);
                        });
                      }

                      return (
                        <Card key={player.id} className="border hover:shadow-lg transition-shadow">
                          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b p-3 lg:p-4">
                            <div className="flex items-center justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0">
                                {player.foto_url ? (
                                  <img src={player.foto_url} className="w-8 h-8 lg:w-10 lg:h-10 rounded-full object-cover flex-shrink-0" alt="" />
                                ) : (
                                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold text-xs lg:text-sm flex-shrink-0">
                                    {player.nombre.charAt(0)}
                                  </div>
                                )}
                                <div className="min-w-0">
                                  <h3 className="font-bold text-sm lg:text-base text-slate-900 truncate">{player.nombre}</h3>
                                  <p className="text-xs text-slate-600 truncate">{player.deporte || "Sin categoría"}</p>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                {totalPaymentsDue > 0 && (
                                  <Badge className="bg-red-500 text-white text-xs">
                                    {totalPaymentsDue} Pendiente{totalPaymentsDue > 1 ? 's' : ''}
                                  </Badge>
                                )}
                                {reviewPayments.length > 0 && (
                                  <Badge className="bg-orange-500 text-white text-xs">
                                    {reviewPayments.length} Revisión
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-3 lg:p-4">
                            <div className="grid grid-cols-3 gap-2 mb-3">
                              <div className="bg-red-50 rounded p-2 border border-red-200">
                                <p className="text-[10px] lg:text-xs text-red-700">Pendientes</p>
                                <p className="text-lg lg:text-xl font-bold text-red-600">{totalPaymentsDue}</p>
                                {totalPending > 0 && (
                                  <p className="text-[10px] text-red-600">{totalPending.toFixed(0)}€</p>
                                )}
                              </div>
                              <div className="bg-orange-50 rounded p-2 border border-orange-200">
                                <p className="text-[10px] lg:text-xs text-orange-700">Revisión</p>
                                <p className="text-lg lg:text-xl font-bold text-orange-600">{reviewPayments.length}</p>
                              </div>
                              <div className="bg-green-50 rounded p-2 border border-green-200">
                                <p className="text-[10px] lg:text-xs text-green-700">Pagados</p>
                                <p className="text-lg lg:text-xl font-bold text-green-600">{paidPayments.length}</p>
                              </div>
                            </div>

                            <div className="space-y-1.5">
                                {displayPayments.map(payment => {
                                  const daysOverdue = calculateDaysOverdue(payment.mes);
                                  const isOverdue = payment.estado !== "Pagado" && daysOverdue > 0;

                                  return (
                                    <div key={payment.id} className="flex items-center justify-between p-2 bg-slate-50 rounded hover:bg-slate-100 transition-colors gap-2">
                                      <div className="flex items-center gap-2 min-w-0 flex-1">
                                        <Badge className={
                                          payment.estado === "Pagado" ? "bg-green-100 text-green-700 text-[10px] lg:text-xs" :
                                          payment.estado === "En revisión" ? "bg-orange-100 text-orange-700 text-[10px] lg:text-xs" :
                                          "bg-red-100 text-red-700 text-[10px] lg:text-xs"
                                        }>
                                          {statusEmojis[payment.estado]}
                                        </Badge>
                                        <div className="min-w-0 flex-1">
                                          <p className="text-xs lg:text-sm font-medium text-slate-900">
                                            {payment.mes}
                                            {isOverdue && (
                                              <span className="ml-2 text-red-600 text-[10px]">
                                                (Vencido {daysOverdue}d)
                                              </span>
                                            )}
                                          </p>
                                          <p className="text-[10px] lg:text-xs text-slate-600">
                                            {payment.cantidad}€
                                          </p>
                                        </div>
                                      </div>
                                      <div className="flex gap-1 items-center">
                                       {payment.justificante_url ? (
                                         <Button
                                           variant="ghost"
                                           size="sm"
                                           onClick={() => setPreviewImage(payment.justificante_url)}
                                           className="text-orange-600 hover:text-orange-700 p-1 h-6"
                                           title="Ver justificante"
                                         >
                                           <FileText className="w-3 h-3 lg:w-4 lg:h-4" />
                                         </Button>
                                       ) : payment.estado === "Pendiente" && (
                                         <span className="text-red-600 text-xs lg:text-sm">❌</span>
                                       )}
                                       {isAdmin && payment.estado !== "Pagado" && payment.justificante_url && !payment.isVirtual && (
                                         <Button
                                           size="sm"
                                           onClick={() => handleStatusChange(payment, "Pagado")}
                                           className="bg-green-600 hover:bg-green-700 text-[10px] lg:text-xs h-6 px-2"
                                         >
                                           ✓ Pagado
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
                );
              })()}
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