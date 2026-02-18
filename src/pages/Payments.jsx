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
import CustomPaymentPlansList from "../components/payments/CustomPaymentPlansList";
import CustomPaymentPlanForm from "../components/payments/CustomPaymentPlanForm";
import { getCuotasPorCategoriaSync, getImportePorCategoriaYMesSync as getImportePorMes } from "../components/payments/paymentAmounts";
import { sendPaymentReceipt, createPlayerPaymentReceiptData } from "../components/receipts/PaymentReceiptPDF";
import { useActiveSeason } from "../components/season/SeasonProvider";

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
  
  // Active season from global provider
  const { activeSeason: activeSeasonStr, seasonConfig: activeSeasonConfig } = useActiveSeason();


  
  // Filtros avanzados - SIEMPRE la temporada activa
  const [temporadaFilter, setTemporadaFilter] = useState(activeSeasonStr);
  // Sincronizar automáticamente cuando cambie la temporada activa
  useEffect(() => {
    if (activeSeasonStr && temporadaFilter !== activeSeasonStr) {
      setTemporadaFilter(activeSeasonStr);
    }
  }, [activeSeasonStr]);
  const [categoriaFilter, setCategoriaFilter] = useState("all");
  const [estadoFilter, setEstadoFilter] = useState("all");
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [showCustomPlanForm, setShowCustomPlanForm] = useState(false);
  const [selectedPlayerForPlan, setSelectedPlayerForPlan] = useState(null);
  const [editingPlan, setEditingPlan] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(20);

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
          // Mostrar TODOS los jugadores para poder ver sus pagos históricos
          setMyPlayers(allPlayers);
        } else if (coachCheck) {
          const allPlayers = await base44.entities.Player.list();
          // Para entrenadores, mostrar sus hijos (activos e inactivos para ver historial)
          const userPlayers = allPlayers.filter(p =>
            (p.email_padre === currentUser.email || p.email_tutor_2 === currentUser.email)
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
      // Mostrar TODOS los jugadores para poder ver sus pagos históricos
      return allPlayers || [];
    },
    initialData: [],
  });

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['myPayments'],
    queryFn: async () => {
      try {
        const allPayments = await base44.entities.Payment.list('-created_date');
        console.log('[DEBUG PAGOS QUERY] Total pagos en BD:', allPayments?.length);
        return (allPayments || []).filter(p => p.is_deleted !== true);
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

  const { data: customPlans = [] } = useQuery({
    queryKey: ['customPaymentPlans'],
    queryFn: () => base44.entities.CustomPaymentPlan.list('-created_date'),
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

  const createCustomPlanMutation = useMutation({
    mutationFn: async (planData) => {
      const currentUser = await base44.auth.me();
      
      // 1. Crear el plan personalizado
      const createdPlan = await base44.entities.CustomPaymentPlan.create({
        ...planData,
        aprobado_por: currentUser.email,
        aprobado_por_nombre: currentUser.full_name,
        fecha_aprobacion: new Date().toISOString()
      });
      
      // 2. Crear automáticamente los pagos pendientes según las cuotas del plan
      const paymentsToCreate = planData.cuotas.map(cuota => ({
        jugador_id: planData.jugador_id,
        jugador_nombre: planData.jugador_nombre,
        tipo_pago: "Plan Especial",
        mes: `Cuota ${cuota.numero}`,
        temporada: planData.temporada,
        cantidad: cuota.cantidad,
        estado: "Pendiente",
        metodo_pago: "Transferencia",
        fecha_pago: null,
        notas: `Plan personalizado de ${planData.numero_cuotas} cuotas - Cuota ${cuota.numero}/${planData.numero_cuotas}. Vence: ${new Date(cuota.fecha_vencimiento).toLocaleDateString('es-ES')}`,
        plan_especial_id: createdPlan.id
      }));
      
      // Crear todos los pagos en bulk
      await base44.entities.Payment.bulkCreate(paymentsToCreate);
      
      return createdPlan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customPaymentPlans'] });
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      setShowCustomPlanForm(false);
      setSelectedPlayerForPlan(null);
      setEditingPlan(null);
      toast.success("Plan creado y cuotas generadas automáticamente ✅");
    },
  });

  const updateCustomPlanMutation = useMutation({
    mutationFn: ({ id, planData }) => base44.entities.CustomPaymentPlan.update(id, planData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customPaymentPlans'] });
      setShowCustomPlanForm(false);
      setEditingPlan(null);
      toast.success("Plan actualizado correctamente");
    },
  });

  const deleteCustomPlanMutation = useMutation({
    mutationFn: async (planId) => {
      const plan = customPlans.find(p => p.id === planId);
      
      // 1. Eliminar los pagos asociados al plan que estén pendientes
      const planPayments = payments.filter(p => 
        p.plan_especial_id === planId &&
        p.estado === "Pendiente"
      );
      
      for (const payment of planPayments) {
        await base44.entities.Payment.delete(payment.id);
      }
      
      // 2. Eliminar el plan
      await base44.entities.CustomPaymentPlan.delete(planId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customPaymentPlans'] });
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      toast.success("Plan y cuotas pendientes eliminados ✅");
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
        await base44.functions.invoke('sendEmail', {
          to: "cdbustarviejo@gmail.com",
          subject: `Justificante de Pago Recibido - ${payment.jugador_nombre}`,
          html: `
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
    
    // Generar recibo PDF cuando se marca como Pagado
    if (newStatus === "Pagado") {
      try {
        console.log('📄 [Payments] Generando recibo PDF para pago:', payment.id);
        const receiptResponse = await base44.functions.invoke('generatePaymentReceipt', {
          paymentId: payment.id
        });
        
        if (receiptResponse.data?.success) {
          console.log('✅ [Payments] Recibo PDF generado:', receiptResponse.data.recibo_url);
          await queryClient.invalidateQueries({ queryKey: ['myPayments'] });
          toast.success("💾 Recibo generado y disponible");
        }
      } catch (receiptError) {
        console.error("Error generating receipt:", receiptError);
        toast.error("Error al generar recibo (el pago se confirmó correctamente)");
      }
    }
    
    // AUTO-CREAR SOCIO cuando se marca pago como Pagado
    if (newStatus === "Pagado") {
      try {
        const player = players.find(p => p.id === payment.jugador_id);
        
        // AUTO-REGISTRO DE PADRES COMO SOCIOS
        console.log('👥 [AUTO-SOCIO] Verificando si crear socio para:', player?.email_padre);
        
        if (player?.email_padre) {
          try {
            // Verificar si ya existe socio con este email en esta temporada
            const allMembers = await base44.entities.ClubMember.list();
            const existingMember = allMembers.find(m => 
              m.email?.toLowerCase() === player.email_padre?.toLowerCase() && 
              m.temporada === payment.temporada
            );
            
            if (!existingMember) {
              console.log('✅ [AUTO-SOCIO] Creando socio automáticamente para:', player.email_padre);
              
              // Generar número de socio
              const currentYear = new Date().getFullYear();
              const memberCount = allMembers.length + 1;
              const numeroSocio = `CDB-${currentYear}-${String(memberCount).padStart(4, '0')}`;
              
              // Verificar si es renovación (existe en temporada anterior)
              const previousSeasonMember = allMembers.find(m => 
                m.email?.toLowerCase() === player.email_padre?.toLowerCase()
              );
              
              const newMember = await base44.entities.ClubMember.create({
                numero_socio: numeroSocio,
                nombre_completo: player.nombre_tutor_legal || player.email_padre.split('@')[0],
                dni: player.dni_tutor_legal || '',
                email: player.email_padre,
                telefono: player.telefono || '',
                direccion: player.direccion || '',
                municipio: player.municipio || 'Bustarviejo',
                cuota_socio: 0, // Los padres no pagan cuota de socio aparte
                tipo_inscripcion: previousSeasonMember ? "Renovación" : "Nueva Inscripción",
                estado_pago: "Pagado",
                temporada: payment.temporada,
                fecha_pago: updatedData.fecha_pago,
                activo: true,
                es_socio_padre: true, // Marcador para distinguir socios-padres de externos
                jugadores_hijos: [{ jugador_id: player.id, jugador_nombre: player.nombre }],
                notas: `Socio creado automáticamente al confirmar pago de ${player.nombre}`
              });
              
              console.log('🎉 [AUTO-SOCIO] Socio creado:', newMember.numero_socio);
              toast.success(`👥 Padre registrado como socio: ${numeroSocio}`);
            } else {
              console.log('ℹ️ [AUTO-SOCIO] Socio ya existe para esta temporada');
            }
          } catch (socioError) {
            console.error("Error auto-creando socio:", socioError);
            // No fallar todo el proceso si falla crear socio
          }
        }
        
        console.log('📧 [Payments] Generando y enviando recibo PDF:', { jugador: payment.jugador_nombre, padre: player?.email_padre, tutor2: player?.email_tutor_2 });
        
        // Generar datos del recibo
        const receiptData = createPlayerPaymentReceiptData(payment, player, activeSeasonConfig);
        
        // Enviar recibo al padre principal
        if (player?.email_padre) {
          console.log('📤 [Payments] Enviando recibo PDF a padre:', player.email_padre);
          await sendPaymentReceipt(receiptData, player.email_padre, base44);
          console.log('✅ [Payments] Recibo PDF enviado a padre');
          toast.success(`📧 Recibo enviado a ${player.email_padre}`);
        }
        
        // Enviar recibo al segundo tutor
        if (player?.email_tutor_2) {
          console.log('📤 [Payments] Enviando recibo PDF a tutor 2:', player.email_tutor_2);
          await sendPaymentReceipt(receiptData, player.email_tutor_2, base44);
          console.log('✅ [Payments] Recibo PDF enviado a tutor 2');
        }
      } catch (error) {
        console.error("Error sending receipt PDF:", error);
        toast.error("Error al enviar recibo: " + error.message);
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
    
    players.filter(p => p.activo === true).forEach(player => {
      const playerPayments = payments.filter(p => 
        p.jugador_id === player.id && 
        (targetTemporada === null || matchTemporada(p.temporada, targetTemporada))
      );
      
      // Verificar si tiene plan especial
      const hasPlanEspecial = playerPayments.some(p => p.tipo_pago === "Plan Especial");
      
      if (hasPlanEspecial) {
        // Contar cuotas pendientes del plan especial
        const cuotasPendientes = playerPayments.filter(p => 
          p.tipo_pago === "Plan Especial" && p.estado === "Pendiente"
        ).length;
        totalPendientes += cuotasPendientes;
        return;
      }
      
      // Si hay ALGÚN pago de tipo único (en cualquier estado), es pago único
      const hasPagoUnico = playerPayments.some(p => 
        p.tipo_pago === "Único" || p.tipo_pago === "único"
      );
      
      if (hasPagoUnico) {
        // Buscar el pago único
        const pagoUnico = playerPayments.find(p => 
          p.tipo_pago === "Único" || p.tipo_pago === "único"
        );
        // Solo contar 1 si está pendiente
        if (pagoUnico && pagoUnico.estado === "Pendiente") {
          totalPendientes += 1;
        }
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
    
    players.filter(p => p.activo === true).forEach(player => {
      const playerPayments = payments.filter(p => 
        p.jugador_id === player.id && 
        (targetTemporada === null || matchTemporada(p.temporada, targetTemporada))
      );
      
      // Verificar si tiene plan especial
      const hasPlanEspecial = playerPayments.some(p => p.tipo_pago === "Plan Especial");
      
      if (hasPlanEspecial) {
        // Para planes especiales, contar cuotas vencidas comparando con fecha_vencimiento
        const plan = customPlans.find(p => 
          p.jugador_id === player.id && 
          p.estado === "Activo" &&
          (targetTemporada === null || matchTemporada(p.temporada, targetTemporada))
        );
        
        if (plan && plan.cuotas) {
          const now = new Date();
          plan.cuotas.forEach(cuota => {
            const vencimiento = new Date(cuota.fecha_vencimiento);
            const pagoCuota = playerPayments.find(p => p.mes === `Cuota ${cuota.numero}`);
            
            if (now > vencimiento && (!pagoCuota || pagoCuota.estado === "Pendiente")) {
              totalVencidos++;
            }
          });
        }
        return;
      }
      
      // Si hay ALGÚN pago de tipo único (en cualquier estado), es pago único
      const hasPagoUnico = playerPayments.some(p => 
        p.tipo_pago === "Único" || p.tipo_pago === "único"
      );
      
      if (hasPagoUnico) {
        // Buscar el pago único
        const pagoUnico = playerPayments.find(p => 
          p.tipo_pago === "Único" || p.tipo_pago === "único"
        );
        // Solo contar como vencido si está pendiente Y ya pasó el vencimiento de Junio
        if (pagoUnico && pagoUnico.estado === "Pendiente" && calculateDaysOverdue("Junio") > 0) {
          totalVencidos += 1;
        }
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
  }, [players, payments, temporadaFilter, customPlans]);
  
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
    <div className="min-h-screen overflow-y-auto p-6 lg:p-8 space-y-6 pb-28">
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
        <Card onClick={() => { if (!isAdmin) return; setActiveTab('pagos'); setShowOverdueOnly(false); setEstadoFilter('Pendiente'); }} className="border-none shadow-lg bg-white cursor-pointer hover:ring-2 hover:ring-orange-300">
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

        <Card onClick={() => { if (!isAdmin) return; setActiveTab('pagos'); setShowOverdueOnly(false); setEstadoFilter('En revisión'); }} className="border-none shadow-lg bg-white cursor-pointer hover:ring-2 hover:ring-orange-300">
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

        <Card onClick={() => { if (!isAdmin) return; setActiveTab('pagos'); setShowOverdueOnly(false); setEstadoFilter('Pagado'); }} className="border-none shadow-lg bg-white cursor-pointer hover:ring-2 hover:ring-orange-300">
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
            <Card onClick={() => { if (!isAdmin) return; setActiveTab('pagos'); setEstadoFilter('all'); setShowOverdueOnly(true); }} className="border-none shadow-lg bg-gradient-to-br from-red-50 to-red-100 border-red-200 cursor-pointer hover:ring-2 hover:ring-red-300">
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
            <>
              <TabsTrigger value="planes" className="flex-1">
                💰 Planes Especiales ({customPlans.filter(p => p.activo).length})
              </TabsTrigger>
              <TabsTrigger value="reconciliacion" className="flex-1">
                <FileSpreadsheet className="w-4 h-4 mr-2" />
                Reconciliación Bancaria
              </TabsTrigger>
            </>
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
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Jugador</label>
                    <Select value={playerFilter} onValueChange={setPlayerFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todos los jugadores" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los jugadores</SelectItem>
                        {(players || []).filter(p => p.activo).sort((a,b) => (a.nombre||'').localeCompare(b.nombre||'')).map(p => (
                          <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

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
                        setTemporadaFilter(activeSeasonStr || "all");
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
                  customPlans={customPlans}
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
                // CRÍTICO: Solo mostrar jugadores ACTIVOS (no mostrar jugadores de temporadas anteriores pendientes de renovación)
                if (!player.activo) return false;

                // Filtro de búsqueda
                const matchesSearch = searchTerm === "" || player.nombre?.toLowerCase().includes(searchTerm.toLowerCase());

                // Filtro de categoría
                const matchesCategoria = categoriaFilter === "all" || player.deporte === categoriaFilter;

                // IMPORTANTE: Si hay filtro de temporada, solo mostrar jugadores que tengan pagos en esa temporada O plan especial
                const playerPayments = (payments || []).filter(p => p.jugador_id === player.id && matchTemporada(p.temporada, temporadaFilter));
                const hasActivePlan = customPlans.some(p => p.jugador_id === player.id && p.estado === "Activo" && matchTemporada(p.temporada, temporadaFilter));

                // Si hay filtro de temporada específico y el jugador NO tiene pagos en esa temporada NI plan especial, no mostrarlo
                if (temporadaFilter !== "all" && playerPayments.length === 0 && !hasActivePlan) {
                  return false;
                }

                 // Filtro por estado - verificar si el jugador tiene pagos del estado buscado
                 let matchesEstado = true;
                 if (estadoFilter !== "all") {
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

                const displayedPlayers = playersToShow.slice(0, displayLimit);
                const hasMore = playersToShow.length > displayLimit;

                return (
                <div className="space-y-4">
                  {displayedPlayers.map(player => {
                    // CRÍTICO: Usar TODOS los pagos (no filtrados) para detectar tipo de pago
                    const allPlayerPaymentsRaw = (payments || []).filter(p => 
                      p.jugador_id === player.id && 
                      matchTemporada(p.temporada, temporadaFilter)
                    );

                    // Determinar meses según tipo de pago REAL (no del player.tipo_pago)
                    // Si tiene un pago "Único" (en cualquier estado), solo mostrar Junio
                    const hasPagoUnico = allPlayerPaymentsRaw.some(p => 
                      p.tipo_pago === "Único" || p.tipo_pago === "único"
                    );

                    // Si tiene plan especial, mostrar TODOS sus pagos
                    const hasPlanEspecial = allPlayerPaymentsRaw.some(p => p.tipo_pago === "Plan Especial");
                    
                    // Plan Mensual: solo pago inicial, Stripe cobra el resto automáticamente
                    const hasPlanMensual = allPlayerPaymentsRaw.some(p => p.tipo_pago === "Plan Mensual");

                    // Filtrar según tipo de pago
                    const playerPayments = hasPlanEspecial
                      ? allPlayerPaymentsRaw
                      : hasPlanMensual
                      ? allPlayerPaymentsRaw.filter(p => p.tipo_pago === "Plan Mensual")
                      : hasPagoUnico
                      ? allPlayerPaymentsRaw.filter(p => p.mes === "Junio")
                      : allPlayerPaymentsRaw;

                      // Verificar si tiene plan personalizado
                      const playerCustomPlan = customPlans.find(p => 
                        p.jugador_id === player.id && p.estado === "Activo"
                      );

                      // Determinar los meses que debería tener este jugador
                      let allMonths;
                      if (hasPlanEspecial) {
                        // Si tiene plan especial, NO crear virtuales
                        allMonths = [];
                      } else if (hasPagoUnico) {
                        allMonths = ["Junio"];
                      } else {
                        allMonths = ["Junio", "Septiembre", "Diciembre"];
                      }

                      console.log(`[DEBUG PAGOS] Jugador: ${player.nombre}, Pagos reales encontrados:`, playerPayments.length, playerPayments.map(p => ({mes: p.mes, estado: p.estado, tipo: p.tipo_pago})));

                      // SOLO crear pagos virtuales si hay filtro de temporada específico (NO si es "all")
                      let displayPayments;
                      if (temporadaFilter === "all") {
                        // Si el filtro es "all", SOLO mostrar los pagos reales que existen en BD
                        displayPayments = playerPayments;
                      } else if (hasPlanEspecial) {
                        // Si tiene plan especial, mostrar SOLO pagos reales del plan (no crear virtuales)
                        const planPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
                        
                        // Eliminar duplicados basándose en mes (Cuota 1, Cuota 2, etc)
                        const seen = new Set();
                        displayPayments = planPayments.filter(p => {
                          if (seen.has(p.mes)) {
                            console.log('⚠️ [Payments] Duplicado detectado:', p.mes, p.id);
                            return false;
                          }
                          seen.add(p.mes);
                          return true;
                        });
                        
                        // Ordenar por número de cuota
                        displayPayments.sort((a, b) => {
                          const numA = parseInt(a.mes?.replace('Cuota ', '') || '0');
                          const numB = parseInt(b.mes?.replace('Cuota ', '') || '0');
                          return numA - numB;
                        });
                      } else {
                        // Si hay filtro de temporada, crear virtuales para meses que faltan
                        displayPayments = allMonths.map(mes => {
                          const existingPayment = playerPayments.find(p => p.mes === mes);
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
                        }).filter(Boolean);
                      }

                      // Si hay filtro de estado activo, filtrar displayPayments también
                      if (estadoFilter !== "all") {
                        displayPayments = displayPayments.filter(p => p.estado === estadoFilter);
                      }
                      
                      // Contar pagos por estado - SOLO pagos NO virtuales
                      const reviewPayments = displayPayments.filter(p => !p.isVirtual && p.estado === "En revisión");
                      const paidPayments = displayPayments.filter(p => !p.isVirtual && p.estado === "Pagado");
                      const pendingPayments = displayPayments.filter(p => p.estado === "Pendiente");
                      
                      // Calcular cuántos pagos REALMENTE faltan
                      const totalPaymentsDue = pendingPayments.length;
                      
                      // Total pendiente en euros - calcular basado en pagos pendientes
                      const totalPending = pendingPayments.reduce((sum, p) => sum + (p.cantidad || 0), 0);
                      
                      // Calcular progreso - cuántas cuotas espera vs cuántas ha pagado
                      let totalCuotasEsperadas;
                      if (hasPlanEspecial && playerCustomPlan) {
                        totalCuotasEsperadas = playerCustomPlan.numero_cuotas || playerCustomPlan.cuotas?.length || 6;
                      } else if (hasPagoUnico) {
                        totalCuotasEsperadas = 1;
                      } else {
                        totalCuotasEsperadas = 3;
                      }
                      
                      const cuotasPagadas = paidPayments.length;
                      const porcentajePagado = totalCuotasEsperadas > 0 ? Math.round((cuotasPagadas / totalCuotasEsperadas) * 100) : 0;

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
                            {/* Alerta de plan especial */}
                            {playerCustomPlan && (
                              <div className="mb-3 p-2 bg-purple-50 border-2 border-purple-300 rounded-lg">
                                <p className="text-xs font-bold text-purple-900">💰 Plan de Pago Personalizado</p>
                                <p className="text-xs text-purple-700 mt-1">
                                  {playerCustomPlan.numero_cuotas} cuotas de {(playerCustomPlan.deuda_final / playerCustomPlan.numero_cuotas).toFixed(2)}€
                                </p>
                              </div>
                            )}
                            
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
                                <p className="text-[10px] text-green-600">{cuotasPagadas}/{totalCuotasEsperadas}</p>
                              </div>
                            </div>
                            
                            {/* Barra de progreso adaptada */}
                            <div className="mb-3">
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-slate-600">
                                  {hasPlanEspecial ? "Progreso Plan Especial" : hasPagoUnico ? "Pago Único" : "Progreso Cuotas"}
                                </span>
                                <span className="font-bold text-slate-900">{porcentajePagado}%</span>
                              </div>
                              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                <div 
                                  className={`h-full transition-all duration-500 ${
                                    porcentajePagado === 100 ? 'bg-green-500' : 
                                    porcentajePagado >= 50 ? 'bg-orange-500' : 'bg-red-500'
                                  }`}
                                  style={{ width: `${porcentajePagado}%` }}
                                />
                              </div>
                              <p className="text-xs text-slate-500 mt-1">
                                {cuotasPagadas} de {totalCuotasEsperadas} cuotas pagadas
                                {totalPaymentsDue > 0 && ` • ${totalPaymentsDue} pendiente${totalPaymentsDue > 1 ? 's' : ''}`}
                              </p>
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
                                       {payment.recibo_url && payment.estado === "Pagado" && (
                                         <Button
                                           variant="ghost"
                                           size="sm"
                                           onClick={() => window.open(payment.recibo_url, '_blank')}
                                           className="text-green-600 hover:text-green-700 p-1 h-6"
                                           title="Descargar recibo"
                                         >
                                           📄
                                         </Button>
                                       )}
                                       {isAdmin && payment.estado === "En revisión" && !payment.isVirtual && (
                                                          <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleStatusChange(payment, "Pendiente")}
                                                            className="border-red-400 text-red-600 hover:bg-red-50 text-[10px] lg:text-xs h-6 px-2"
                                                            title="Rechazar justificante y volver a Pendiente"
                                                          >
                                                            ✗ Rechazar
                                                          </Button>
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
                    
                    {hasMore && (
                      <div className="text-center pt-6">
                        <Button
                          onClick={() => setDisplayLimit(prev => prev + 20)}
                          variant="outline"
                          className="border-orange-500 text-orange-600 hover:bg-orange-50"
                        >
                          Cargar más jugadores ({playersToShow.length - displayLimit} restantes)
                        </Button>
                      </div>
                    )}
                    
                    {!hasMore && playersToShow.length > 20 && (
                      <div className="text-center pt-4">
                        <p className="text-sm text-slate-500">
                          Mostrando todos los {playersToShow.length} jugadores
                        </p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <>
            <TabsContent value="planes">
              <div className="space-y-6">
                <div className="flex justify-end">
                  <Button
                    onClick={() => {
                      setEditingPlan(null);
                      setSelectedPlayerForPlan(null);
                      setShowCustomPlanForm(true);
                    }}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    Nuevo Plan Personalizado
                  </Button>
                </div>
                
                <CustomPaymentPlansList
                  plans={customPlans}
                  players={players}
                  onEdit={(plan) => {
                    const player = players.find(p => p.id === plan.jugador_id);
                    setSelectedPlayerForPlan(player);
                    setEditingPlan(plan);
                    setShowCustomPlanForm(true);
                  }}
                  onDelete={(planId) => {
                    if (confirm("¿Eliminar este plan personalizado?\n\nSe borrarán todas las cuotas pendientes asociadas. Las cuotas ya pagadas se mantendrán en el historial.")) {
                      deleteCustomPlanMutation.mutate(planId);
                    }
                  }}
                />
              </div>
            </TabsContent>

            <TabsContent value="reconciliacion">
              <BankReconciliation
                payments={payments}
                players={players}
                onReconcile={handleReconcile}
              />
            </TabsContent>
          </>
        )}
      </Tabs>

      {/* Modal selector de jugador para plan personalizado */}
      {showCustomPlanForm && !selectedPlayerForPlan && (
        <Dialog open={true} onOpenChange={() => setShowCustomPlanForm(false)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Selecciona un jugador</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-slate-400" />
                <Input
                  placeholder="Buscar jugador..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
                {players
                  .filter(p => 
                    p.activo && 
                    (!searchTerm || p.nombre.toLowerCase().includes(searchTerm.toLowerCase()))
                  )
                  .map(player => {
                    const hasActivePlan = customPlans.some(p => p.jugador_id === player.id && p.activo);
                    return (
                      <button
                        key={player.id}
                        onClick={() => {
                          if (!hasActivePlan) {
                            setSelectedPlayerForPlan(player);
                          }
                        }}
                        className={`text-left p-3 bg-white hover:bg-purple-50 rounded-lg border-2 transition-all ${
                          hasActivePlan ? 'border-slate-200 opacity-50 cursor-not-allowed' : 'border-slate-200 hover:border-purple-400'
                        }`}
                        disabled={hasActivePlan}
                      >
                        <div className="flex items-center gap-2">
                          {player.foto_url ? (
                            <img src={player.foto_url} className="w-10 h-10 rounded-full object-cover" alt="" />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                              {player.nombre.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="font-medium text-sm">{player.nombre}</p>
                            <p className="text-xs text-slate-600">{player.deporte}</p>
                            {hasActivePlan && (
                              <p className="text-xs text-purple-600 font-medium mt-1">✅ Ya tiene plan activo</p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Form para crear/editar plan personalizado */}
      <CustomPaymentPlanForm
        open={showCustomPlanForm && !!selectedPlayerForPlan}
        onClose={() => {
          setShowCustomPlanForm(false);
          setSelectedPlayerForPlan(null);
          setEditingPlan(null);
        }}
        player={selectedPlayerForPlan}
        existingPlan={editingPlan}
        payments={payments}
        onSubmit={(planData) => {
          if (editingPlan) {
            updateCustomPlanMutation.mutate({ id: editingPlan.id, planData });
          } else {
            createCustomPlanMutation.mutate(planData);
          }
        }}
        isSubmitting={createCustomPlanMutation.isPending || updateCustomPlanMutation.isPending}
      />

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