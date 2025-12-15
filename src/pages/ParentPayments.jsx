import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, Loader2, Search, Plus, X, Gift, Info, DollarSign } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import ContactCard from "../components/ContactCard";
import ParentPaymentForm from "../components/payments/ParentPaymentForm";
import { CheckmarkAnimation } from "../components/animations/SuccessAnimation";
import { usePageTutorial } from "../components/tutorials/useTutorial";

// Cuotas fallback (se sobreescriben con CategoryConfig si existe)
const CUOTAS_FALLBACK = {
  "Fútbol Aficionado": { inscripcion: 165, segunda: 100, tercera: 95, total: 360 },
  "Fútbol Juvenil": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "Fútbol Cadete": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "Fútbol Infantil (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83, total: 281 },
  "Fútbol Alevín (Mixto)": { inscripcion: 115, segunda: 83, tercera: 83, total: 281 },
  "Fútbol Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75, total: 250 },
  "Fútbol Pre-Benjamín (Mixto)": { inscripcion: 100, segunda: 75, tercera: 75, total: 250 },
  "Fútbol Femenino": { inscripcion: 135, segunda: 100, tercera: 95, total: 330 },
  "Baloncesto (Mixto)": { inscripcion: 50, segunda: 50, tercera: 50, total: 150 }
};

// Mapeo de nombres de deporte a nombres de categoría en CategoryConfig
const CATEGORY_NAME_MAPPING = {
  "Fútbol Aficionado": "AFICIONADO",
  "Fútbol Juvenil": "JUVENIL",
  "Fútbol Cadete": "CADETE",
  "Fútbol Infantil (Mixto)": "INFANTIL",
  "Fútbol Alevín (Mixto)": "ALEVIN",
  "Fútbol Benjamín (Mixto)": "BENJAMIN",
  "Fútbol Pre-Benjamín (Mixto)": "PRE-BENJAMIN",
  "Fútbol Femenino": "FEMENINO",
  "Baloncesto (Mixto)": "BALONCESTO"
};

// Función que obtiene cuotas de CategoryConfig si existe
const getCuotasFromConfig = (categoria, categoryConfigs) => {
  if (!categoryConfigs || categoryConfigs.length === 0) {
    return CUOTAS_FALLBACK[categoria] || { inscripcion: 0, segunda: 0, tercera: 0, total: 0 };
  }
  
  const mappedName = CATEGORY_NAME_MAPPING[categoria] || categoria;
  const categoryConfig = categoryConfigs.find(c => 
    (c.nombre === categoria || c.nombre === mappedName) && c.activa
  );
  
  if (categoryConfig) {
    return {
      inscripcion: categoryConfig.cuota_inscripcion,
      segunda: categoryConfig.cuota_segunda,
      tercera: categoryConfig.cuota_tercera,
      total: categoryConfig.cuota_total
    };
  }
  
  return CUOTAS_FALLBACK[categoria] || { inscripcion: 0, segunda: 0, tercera: 0, total: 0 };
};

const getImportePorMesFromConfig = (categoria, mes, categoryConfigs) => {
  const cuotas = getCuotasFromConfig(categoria, categoryConfigs);
  if (mes === "Junio") return cuotas.inscripcion;
  if (mes === "Septiembre") return cuotas.segunda;
  if (mes === "Diciembre") return cuotas.tercera;
  return 0;
};

export default function ParentPayments() {
  const [uploadingPaymentId, setUploadingPaymentId] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const queryClient = useQueryClient();
  
  // Tutorial interactivo para primera visita
  usePageTutorial("parent_payments");

  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const u = await base44.auth.me();
      console.log('👤 [ParentPayments] Usuario cargado:', u.email);
      return u;
    },
    staleTime: 0,
    gcTime: 300000,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const { data: players = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      console.log('🔍 [ParentPayments] Buscando jugadores para:', user?.email);
      const allPlayers = await base44.entities.Player.list();
      console.log('📊 [ParentPayments] Total jugadores en BD:', allPlayers.length);
      const filtered = allPlayers.filter(p =>
        (p.email_padre === user?.email || p.email_tutor_2 === user?.email) && p.activo === true
      );
      console.log('✅ [ParentPayments] Jugadores activos filtrados:', filtered.length, filtered.map(p => p.nombre));
      return filtered;
    },
    enabled: !!user?.email,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['myPayments', user?.email, players.map(p => p.id).join(',')],
    queryFn: async () => {
      console.log('💳 [ParentPayments] Buscando pagos para jugadores:', players.map(p => p.nombre));
      if (!players || players.length === 0) {
        console.log('⚠️ [ParentPayments] Sin jugadores, retornando pagos vacíos');
        return [];
      }
      const allPayments = await base44.entities.Payment.list('-created_date');
      console.log('📊 [ParentPayments] Total pagos en BD:', allPayments.length);
      const playerIds = players.map(p => p.id);
      const filtered = allPayments.filter(payment => 
        playerIds.includes(payment.jugador_id) && payment.is_deleted !== true
      );
      console.log('✅ [ParentPayments] Pagos filtrados:', filtered.length);
      return filtered;
    },
    enabled: !!user?.email,
    staleTime: 0,
    gcTime: 0,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const isLoading = !user || loadingPlayers;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const jugadorId = urlParams.get('jugador_id');
    if (jugadorId) {
      setShowForm(true);
    }
  }, []);

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    staleTime: 600000, // 10 minutos
    gcTime: 1200000,
    refetchOnWindowFocus: false,
  });

  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigs'],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 600000, // 10 minutos
    gcTime: 1200000,
    refetchOnWindowFocus: false,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      const payment = await base44.entities.Payment.create(paymentData);
      
      // Invalidar queries INMEDIATAMENTE
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });
      
      // Send email to club (solo si notificaciones están activadas)
      const player = players.find(p => p.id === paymentData.jugador_id);
      try {
        if (seasonConfig?.notificaciones_admin_email) {
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
        }
        
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
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });
      setShowForm(false);
      
      // Mensaje según si tiene justificante o no
      if (variables.justificante_url) {
        setSuccessMessage("🔍 Pago enviado - En revisión por el administrador");
      } else {
        setSuccessMessage("✅ Pago registrado - Recuerda subir el justificante");
      }
      setShowSuccess(true);
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
      
      // Invalidar queries INMEDIATAMENTE después de subir
      queryClient.invalidateQueries({ queryKey: ['myPayments'] });
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });

      const player = players.find(p => p.id === payment.jugador_id);
      
      try {
        if (seasonConfig?.notificaciones_admin_email) {
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
        }
        
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
      queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
      queryClient.invalidateQueries({ queryKey: ['allPayments'] });
      setUploadingPaymentId(null);
      setSuccessMessage("🔍 Justificante enviado - Pago en revisión por el administrador");
      setShowSuccess(true);
    },
    onError: () => {
      toast.error("Error al subir el justificante");
      setUploadingPaymentId(null);
    }
  });

  const handleFileUpload = async (paymentId, e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tamaño de archivo (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande. Máximo 10MB");
      return;
    }

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
    // Junio (6) inicia inscripciones para la siguiente temporada
    return month >= 6 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
  };
  
  const currentSeason = getCurrentSeason();

  return (
    <>
      <CheckmarkAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message={successMessage}
      />
      <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mis Pagos</h1>
          <p className="text-slate-600 mt-1">Gestiona tus cuotas y justificantes</p>
        </div>
        <Button
          onClick={() => {
            setSelectedPlayerId(null);
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



      {/* Payment Form */}
      <div data-payment-form>
        <AnimatePresence>
          {showForm && (
            <ParentPaymentForm
                players={players}
                payments={payments}
                customPlans={customPlans}
                onSubmit={handleSubmitPayment}
                onCancel={() => {
                  setShowForm(false);
                  setSelectedPlayerId(null);
                  setSelectedPaymentMonth(null);
                }}
                isSubmitting={createPaymentMutation.isPending}
                preselectedPlayerId={selectedPlayerId}
                preselectedMonth={selectedPaymentMonth}
              />
          )}
        </AnimatePresence>
      </div>

      {/* Info sobre fechas límite */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-blue-900">📅 Fechas límite de pago:</p>
              <div className="text-xs text-blue-800 space-y-0.5">
                <p>• <strong>Junio:</strong> vence el 30 de Junio</p>
                <p>• <strong>Septiembre:</strong> vence el 15 de Septiembre</p>
                <p>• <strong>Diciembre:</strong> vence el 15 de Diciembre</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
              // Normalizar temporada (aceptar tanto "/" como "-")
              const normalizeSeason = (season) => {
                if (!season) return currentSeason;
                return season.replace(/-/g, '/');
              };

              const allPlayerPayments = payments.filter(p => 
                p.jugador_id === player.id && 
                normalizeSeason(p.temporada) === normalizeSeason(currentSeason)
              );

              // Verificar si tiene plan personalizado
              const playerCustomPlan = customPlans.find(p => 
                p.jugador_id === player.id && p.activo === true
              );

              // Determinar los meses que debería tener este jugador
              let allMonths;
              if (playerCustomPlan) {
                // Si tiene plan personalizado, usar esos meses
                allMonths = playerCustomPlan.cuotas_personalizadas.map(c => c.mes);
              } else {
                // Lógica estándar (pago único vs tres meses)
                const hasPagoUnico = allPlayerPayments.some(p => 
                  p.tipo_pago === "Único" || p.tipo_pago === "único"
                );
                allMonths = hasPagoUnico
                  ? ["Junio"]
                  : ["Junio", "Septiembre", "Diciembre"];
              }

              // Crear pagos virtuales SOLO para meses que NO tienen ningún pago (ni pagado, ni pendiente, ni revisión)
              const displayPayments = allMonths.map(mes => {
                // Buscar cualquier pago de este mes (pagado, pendiente o en revisión)
                const existingPayment = allPlayerPayments.find(p => p.mes === mes);
                
                if (existingPayment) {
                  // Si existe el pago (en cualquier estado), mostrarlo
                  return existingPayment;
                }
                
                // Solo crear virtual si NO existe ningún pago para este mes
                let cantidad;
                if (playerCustomPlan) {
                  // Usar cantidad del plan personalizado
                  const cuotaPlan = playerCustomPlan.cuotas_personalizadas.find(c => c.mes === mes);
                  cantidad = cuotaPlan?.cantidad || 0;
                } else {
                  const cuotas = getCuotasFromConfig(player.deporte, categoryConfigs);
                  cantidad = hasPagoUnico 
                    ? cuotas.total 
                    : getImportePorMesFromConfig(player.deporte, mes, categoryConfigs);
                }
                
                return {
                  id: `virtual-${player.id}-${mes}`,
                  jugador_id: player.id,
                  jugador_nombre: player.nombre,
                  mes: mes,
                  temporada: currentSeason,
                  estado: "Pendiente",
                  cantidad: cantidad,
                  tipo_pago: hasPagoUnico ? "Único" : "Tres meses",
                  isVirtual: true,
                  customPlan: playerCustomPlan ? true : false
                  };
                  });
              
              // Contar solo pagos REALES (no virtuales)
              const realPayments = displayPayments.filter(p => !p.isVirtual);
              const pendingPayments = realPayments.filter(p => p.estado === "Pendiente");
              const reviewPayments = realPayments.filter(p => p.estado === "En revisión");
              const paidPayments = realPayments.filter(p => p.estado === "Pagado");
              
              // Contar cuántos pagos faltan (incluyendo virtuales)
              const totalPaymentsDue = displayPayments.filter(p => p.estado === "Pendiente").length;

              return (
                <Card key={player.id} className="border-none shadow-lg bg-white overflow-hidden">
                  <CardHeader className="bg-slate-50 border-b">
                    <div className="flex items-center justify-between gap-3">
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
                      {totalPaymentsDue > 0 && (
                        <Badge className="bg-red-500 text-white">
                          {totalPaymentsDue} Pendiente{totalPaymentsDue > 1 ? 's' : ''}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6">
                    {/* Alerta de plan personalizado */}
                    {playerCustomPlan && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-purple-100 border-2 border-purple-400 rounded-lg">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-purple-600" />
                          <p className="text-sm font-bold text-purple-900">💰 Plan de Pago Personalizado</p>
                        </div>
                        <p className="text-xs text-purple-700 mt-1">
                          {playerCustomPlan.mensaje_para_familia || playerCustomPlan.motivo}
                        </p>
                        <div className="flex items-center justify-between mt-2 pt-2 border-t border-purple-300">
                          <p className="text-xs text-purple-600">
                            <strong>{playerCustomPlan.cuotas_personalizadas?.length} cuotas personalizadas</strong>
                          </p>
                          <p className="text-sm font-bold text-purple-900">
                            Total: {playerCustomPlan.total_plan}€
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Alerta de descuento por hermano */}
                    {player.tiene_descuento_hermano && player.descuento_aplicado > 0 && !playerCustomPlan && (
                      <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Gift className="w-5 h-5 text-purple-600" />
                          <p className="text-sm font-bold text-purple-900">🎉 Descuento Familiar Aplicado</p>
                        </div>
                        <p className="text-xs text-purple-700 mt-1">
                          Este jugador tiene <strong>{player.descuento_aplicado}€</strong> de descuento por tener hermanos mayores inscritos. 
                          El descuento se aplica en la cuota de inscripción (Junio).
                        </p>
                      </div>
                    )}

                    {displayPayments.filter(p => !p.isVirtual).length === 0 ? (
                      <div className="text-center py-8 text-slate-500">
                        <p>No hay pagos registrados para este jugador</p>
                        {!showForm && (
                          <Button
                            onClick={() => {
                              setSelectedPlayerId(player.id);
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
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {displayPayments.map((payment, index) => {
                            // Lógica para mostrar botón "Pagar" solo si la cuota anterior está pagada
                            const ordenMeses = ["Junio", "Septiembre", "Diciembre"];
                            const mesIndex = ordenMeses.indexOf(payment.mes);
                            const cuotaAnterior = mesIndex > 0 ? displayPayments.find(p => p.mes === ordenMeses[mesIndex - 1]) : null;
                            const cuotaAnteriorPagada = mesIndex === 0 || cuotaAnterior?.estado === "Pagado";
                            // Mostrar botón si: está pendiente Y (es la primera cuota O la anterior está pagada)
                            const mostrarBotonPagar = payment.estado === "Pendiente" && cuotaAnteriorPagada;

                            return (
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
                                    <TooltipProvider>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Info className="w-4 h-4 text-slate-400 hover:text-slate-600 cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                          <p className="text-xs">
                                            {payment.estado === "Pagado" && "✅ Pago verificado y confirmado por el administrador"}
                                            {payment.estado === "En revisión" && "🔍 El administrador está verificando tu justificante. Suele tardar 1-2 días hábiles"}
                                            {payment.estado === "Pendiente" && payment.isVirtual && "⏳ Aún no has registrado este pago. Haz click en 'Pagar' cuando lo realices"}
                                            {payment.estado === "Pendiente" && !payment.isVirtual && "📤 Falta subir el justificante de pago para que el administrador lo verifique"}
                                          </p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </TooltipProvider>
                                  </div>
                                  <p className="text-xs text-slate-600">{payment.estado}{payment.isVirtual ? " (sin registrar)" : ""}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  {mostrarBotonPagar && (
                                    <Button
                                      size="sm"
                                      onClick={() => {
                                        setSelectedPlayerId(player.id);
                                        setSelectedPaymentMonth(payment.mes);
                                        setShowForm(true);
                                        setTimeout(() => {
                                          const formElement = document.querySelector('[data-payment-form]');
                                          if (formElement) {
                                            formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                          }
                                        }, 100);
                                      }}
                                      className="bg-orange-600 hover:bg-orange-700 text-white"
                                    >
                                      💳 Pagar
                                    </Button>
                                  )}
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
                                  {payment.recibo_url && payment.estado === "Pagado" && (
                                   <Button
                                     size="sm"
                                     variant="ghost"
                                     onClick={() => window.open(payment.recibo_url, '_blank')}
                                     className="text-blue-600 hover:text-blue-700"
                                     title="Descargar recibo"
                                   >
                                     📄 Recibo
                                   </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );})}
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
      </>
      );
      }