import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Upload, FileText, Loader2, Search, Plus, X, Gift, Info, DollarSign, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useActiveSeason } from "../components/season/SeasonProvider";
import PayModal from "../components/payments/PayModal";
import QuickPaySelector from "../components/payments/QuickPaySelector";
import PaymentsCartBar from "../components/payments/PaymentsCartBar";
import BatchTransferDialog from "../components/payments/BatchTransferDialog";
import BatchSummaryDialog from "../components/payments/BatchSummaryDialog";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { createPageUrl } from "@/utils";

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
  const [quickPayOpen, setQuickPayOpen] = useState(false);
  const [selectedPlayerId, setSelectedPlayerId] = useState(null);
  const [selectedPaymentMonth, setSelectedPaymentMonth] = useState(null);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payModalContext, setPayModalContext] = useState({ player: null, payment: null });
  // Carrito de pagos
  const [cartSelected, setCartSelected] = useState([]); // [{key, player, payment}]
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [transferConcept, setTransferConcept] = useState("");
  const [showSummary, setShowSummary] = useState(false);
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
    staleTime: 30000, // 30 segundos
    gcTime: 300000,
    retry: 1,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const { data: players = [], isLoading: loadingPlayers } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: async () => {
      console.log('🔍 [ParentPayments] Buscando jugadores para:', user?.email);
      const filtered = await base44.entities.Player.filter({
        $or: [
          { email_padre: user?.email },
          { email_tutor_2: user?.email },
          { email_jugador: user?.email }
        ],
        activo: true
      });
      console.log('✅ [ParentPayments] Jugadores activos filtrados (server):', filtered.length);
      return filtered;
    },
    enabled: !!user?.email,
    retry: 1,
    staleTime: 300000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const { data: payments = [], isLoading: loadingPayments } = useQuery({
    queryKey: ['myPayments', user?.email, players.map(p => p.id).join(',')],
    queryFn: async () => {
      console.log('💳 [ParentPayments] Buscando pagos para jugadores:', players.map(p => p.nombre));
      if (!players || players.length === 0) {
        console.log('⚠️ [ParentPayments] Sin jugadores, retornando pagos vacíos');
        return [];
      }
      const playerIds = players.map(p => p.id);
      const filtered = await base44.entities.Payment.filter({
        jugador_id: { $in: playerIds },
        is_deleted: { $ne: true }
      }, '-created_date');
      console.log('✅ [ParentPayments] Pagos filtrados (server):', filtered.length);
      return filtered;
    },
    enabled: !!user?.email && players.length > 0,
    retry: 1,
    staleTime: 300000,
    gcTime: 300000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  const isLoading = !user || loadingPlayers;

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const jugadorId = urlParams.get('jugador_id');
    if (jugadorId) {
      setShowForm(true);
    }
    if (urlParams.get('stripe') === 'success') {
      setSuccessMessage('✅ Pago con tarjeta completado. Se confirmará en segundos.');
      setShowSuccess(true);
      setCartSelected([]);
      window.history.replaceState({}, '', createPageUrl('ParentPayments'));
    }
    if (urlParams.get('stripe') === 'canceled') {
      // No toast to reduce noise
      window.history.replaceState({}, '', createPageUrl('ParentPayments'));
    }
  }, []);

  const { activeSeason: currentSeason, seasonConfig } = useActiveSeason();

  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigs'],
    queryFn: () => base44.entities.CategoryConfig.list(),
    staleTime: 600000, // 10 minutos
    gcTime: 1200000,
    refetchOnWindowFocus: false,
  });

  const { data: customPlans = [] } = useQuery({
    queryKey: ['customPaymentPlans'],
    queryFn: () => base44.entities.CustomPaymentPlan.list(),
    staleTime: 300000,
    refetchOnWindowFocus: false,
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (paymentData) => {
      // Si viene con isUpdate=true, actualizar en lugar de crear
      if (paymentData.isUpdate && paymentData.id) {
        console.log('🔄 [ParentPayments] Actualizando pago existente:', paymentData.id);
        const { id, isUpdate, ...updateData } = paymentData;
        const payment = await base44.entities.Payment.update(id, updateData);
        console.log('✅ [ParentPayments] Pago actualizado:', payment.id);
        return payment;
      }

      // VALIDACIÓN: solo bloquear si existe Y tiene justificante
      const duplicado = payments.find(p => 
        p.jugador_id === paymentData.jugador_id &&
        p.mes === paymentData.mes &&
        p.temporada === paymentData.temporada &&
        p.is_deleted !== true &&
        p.justificante_url
      );

      if (duplicado) {
        throw new Error(`Ya existe un pago de ${paymentData.mes} con justificante (Estado: ${duplicado.estado})`);
      }

      console.log('✅ [ParentPayments] Creando pago nuevo:', paymentData);
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
          await base44.functions.invoke('sendEmail', {
            to: "cdbustarviejo@gmail.com",
            subject: `Nuevo Pago Registrado - ${paymentData.jugador_nombre}`,
          html: `
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
        const confirmBody = `<h2>Pago Registrado - CD Bustarviejo</h2>
        <p>Estimados padres/tutores,</p>
        <p>Confirmamos que hemos recibido el registro de pago para <strong>${paymentData.jugador_nombre}</strong>.</p>
        
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
          <p><strong>DETALLES DEL PAGO</strong></p>
          <p>📅 <strong>Periodo:</strong> ${paymentData.mes}</p>
          <p>📚 <strong>Temporada:</strong> ${paymentData.temporada}</p>
          <p>💰 <strong>Cantidad:</strong> ${paymentData.cantidad} euros</p>
          <p>📊 <strong>Estado:</strong> ${paymentData.justificante_url ? 'En revisión 🟠' : 'Pendiente de justificante 🔴'}</p>
        </div>
        
        <p>${paymentData.justificante_url ? 'Estamos revisando tu justificante y actualizaremos el estado pronto.' : 'Recuerda subir el justificante de pago para que podamos verificarlo.'}</p>
        
        <p style="margin-top: 24px;">Atentamente,<br><strong>CD Bustarviejo</strong></p>
        <p style="color: #64748b; font-size: 14px; margin-top: 16px;">Contacto: cdbustarviejo@gmail.com</p>
        `;
        
        console.log('📧 [ParentPayments] Enviando confirmación a padres:', { padre: player?.email_padre, tutor2: player?.email_tutor_2 });
        
        if (player?.email_padre) {
          console.log('📤 [ParentPayments] Enviando a padre:', player.email_padre);
          await base44.functions.invoke('sendEmail', {
            to: player.email_padre,
            subject: "Pago Registrado - CD Bustarviejo",
            html: confirmBody
          });
          console.log('✅ [ParentPayments] Email enviado a padre');
        }
        
        if (player?.email_tutor_2) {
          console.log('📤 [ParentPayments] Enviando a tutor 2:', player.email_tutor_2);
          await base44.functions.invoke('sendEmail', {
            to: player.email_tutor_2,
            subject: "Pago Registrado - CD Bustarviejo",
            html: confirmBody
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
        }
        
        // Send confirmation to parents
        const confirmBody = `<h2>Justificante Recibido - CD Bustarviejo</h2>
        <p>Estimados padres/tutores,</p>
        <p>Hemos recibido el justificante de pago para <strong>${payment.jugador_nombre}</strong>.</p>
        
        <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
          <p><strong>DETALLES DEL PAGO</strong></p>
          <p>📅 <strong>Periodo:</strong> ${payment.mes}</p>
          <p>📚 <strong>Temporada:</strong> ${payment.temporada}</p>
          <p>💰 <strong>Cantidad:</strong> ${payment.cantidad} euros</p>
          <p>📊 <strong>Estado:</strong> En revisión 🟠</p>
        </div>
        
        <p>Estamos verificando tu justificante y actualizaremos el estado pronto.</p>
        
        <p style="margin-top: 24px;">Atentamente,<br><strong>CD Bustarviejo</strong></p>
        <p style="color: #64748b; font-size: 14px; margin-top: 16px;">Contacto: cdbustarviejo@gmail.com</p>
        `;
        
        console.log('📧 [ParentPayments] Enviando confirmación de justificante a padres:', { padre: player?.email_padre, tutor2: player?.email_tutor_2 });
        
        if (player?.email_padre) {
          console.log('📤 [ParentPayments] Enviando a padre:', player.email_padre);
          await base44.functions.invoke('sendEmail', {
            to: player.email_padre,
            subject: "Justificante Recibido - CD Bustarviejo",
            html: confirmBody
          });
          console.log('✅ [ParentPayments] Email enviado a padre');
        }
        
        if (player?.email_tutor_2) {
          console.log('📤 [ParentPayments] Enviando a tutor 2:', player.email_tutor_2);
          await base44.functions.invoke('sendEmail', {
            to: player.email_tutor_2,
            subject: "Justificante Recibido - CD Bustarviejo",
            html: confirmBody
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
      queryClient.invalidateQueries({ queryKey: ['payments'] }); // Dashboard
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

  // --- Carrito de pagos ---
  const generateConceptCode = () => {
    if (cartSelected.length === 0) return '';
    const abbr = (mes) => ({ 'Junio': 'Jun', 'Septiembre': 'Sep', 'Diciembre': 'Dic' }[mes] || mes?.slice(0,3));
    // Agrupar por apellido y acumular meses
    const groups = {};
    cartSelected.forEach(({ player, payment }) => {
      const name = (player?.nombre || '').trim();
      const surname = name ? (name.split(' ').slice(-1)[0] || name) : 'FAMILIA';
      const key = surname.toUpperCase();
      if (!groups[key]) groups[key] = new Set();
      groups[key].add(abbr(payment?.mes));
    });
    const parts = Object.entries(groups)
      .map(([surname, monthsSet]) => `${surname}:${Array.from(monthsSet).join('+')}`);
    const base = `CDB ${parts.join(' | ')}`;
    // Limitar longitud
    if (base.length <= 60) return base;
    const first = parts[0];
    const restCount = parts.length - 1;
    return `CDB ${first} +${restCount}`;
  };

  const ensureRealPayments = async (selected) => {
    // Convierte virtuales en reales y devuelve items con payment_id asegurado
    const items = [];
    for (const sel of selected) {
      const p = sel.payment;
      if (p.isVirtual) {
        const created = await base44.entities.Payment.create({
          jugador_id: sel.player.id,
          jugador_nombre: sel.player.nombre,
          tipo_pago: p.tipo_pago,
          mes: p.mes,
          temporada: p.temporada,
          cantidad: p.cantidad,
          estado: 'Pendiente',
          metodo_pago: 'Transferencia'
        });
        items.push({
          payment_id: created.id,
          jugador_id: sel.player.id,
          jugador_nombre: sel.player.nombre,
          mes: p.mes,
          temporada: p.temporada,
          cantidad: p.cantidad
        });
      } else {
        items.push({
          payment_id: p.id,
          jugador_id: sel.player.id,
          jugador_nombre: sel.player.nombre,
          mes: p.mes,
          temporada: p.temporada,
          cantidad: p.cantidad
        });
      }
    }
    return items;
  };

  const handlePayCartWithCard = async () => {
    if (cartSelected.length === 0) return;
    if (window.top !== window.self) {
      alert('Por seguridad, el pago con tarjeta solo funciona en la app publicada.');
      return;
    }
    const items = await ensureRealPayments(cartSelected);
    const total = items.reduce((s, it) => s + Number(it.cantidad || 0), 0);
    const batch = await base44.entities.BatchPayment.create({
      code: generateConceptCode(),
      user_email: user.email,
      metodo: 'Tarjeta',
      status: 'draft',
      total,
      items
    });
    // Crear sesión Stripe con múltiples conceptos
    const successUrl = `${window.location.origin}${createPageUrl('ParentPayments')}?stripe=success`;
    const cancelUrl = `${window.location.origin}${createPageUrl('ParentPayments')}?stripe=canceled`;
    const lineItems = items.map((it) => ({
      price_data: {
        currency: 'eur',
        product_data: { name: `Cuota ${it.mes} - ${it.jugador_nombre} (${it.temporada})` },
        unit_amount: Math.round(Number(it.cantidad) * 100)
      },
      quantity: 1
    }));
    const { data } = await base44.functions.invoke('stripeCheckout', {
      lineItems,
      successUrl,
      cancelUrl,
      metadata: {
        tipo: 'pago_cuota_batch',
        batch_id: batch.id
      }
    });
    if (data?.id) {
      await base44.entities.BatchPayment.update(batch.id, { stripe_session_id: data.id });
    }
    if (data?.url) {
      window.location.href = data.url;
    }
  };

  const handleGenerateTransfer = async () => {
    if (cartSelected.length === 0) return;
    const concept = generateConceptCode();
    setTransferConcept(concept);
    setShowTransferDialog(true);
  };

  const handleConfirmTransfer = async (file) => {
    const items = await ensureRealPayments(cartSelected);
    const total = items.reduce((s, it) => s + Number(it.cantidad || 0), 0);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    const batch = await base44.entities.BatchPayment.create({
      code: transferConcept,
      user_email: user.email,
      metodo: 'Transferencia',
      status: 'pending_review',
      total,
      concepto: transferConcept,
      justificante_url: file_url,
      items
    });
    // Marcar cada payment en revisión con justificante común
    for (const it of items) {
      const current = payments.find((p) => p.id === it.payment_id);
      await base44.entities.Payment.update(it.payment_id, {
        ...(current || {}),
        estado: 'En revisión',
        metodo_pago: 'Transferencia',
        justificante_url: file_url
      });
    }

    // Notificaciones por email: resumen a tesorería y confirmaciones por jugador
    try {
      // Resumen a tesorería (si está habilitado en la temporada)
      if (seasonConfig?.notificaciones_admin_email) {
        const rows = items.map((it) => `
          <tr>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;">${it.jugador_nombre}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;">${it.mes}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;">${it.temporada}</td>
            <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;">${Number(it.cantidad).toFixed(2)}€</td>
          </tr>`).join('');
        const adminHtml = `
          <h2>Lote de Transferencia Recibido</h2>
          <p><strong>Usuario:</strong> ${user.email}</p>
          <p><strong>Concepto:</strong> ${transferConcept}</p>
          <p><strong>Importe total:</strong> ${total.toFixed(2)}€</p>
          <p><strong>Justificante:</strong> <a href="${file_url}" target="_blank" rel="noopener">Ver archivo</a></p>
          <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:14px;">
            <thead>
              <tr style="background:#f8fafc;color:#334155;">
                <th style="text-align:left;padding:6px 8px;">Jugador</th>
                <th style="text-align:left;padding:6px 8px;">Mes</th>
                <th style="text-align:left;padding:6px 8px;">Temporada</th>
                <th style="text-align:right;padding:6px 8px;">Importe</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        `;
        await base44.functions.invoke('sendEmail', {
          to: 'cdbustarviejo@gmail.com',
          subject: `Lote Transferencia - ${items.length} pagos - ${total.toFixed(2)}€`,
          html: adminHtml
        });
      }

      // Confirmación a familias por cada jugador
      const byPlayer = items.reduce((acc, it) => {
        acc[it.jugador_id] = acc[it.jugador_id] || [];
        acc[it.jugador_id].push(it);
        return acc;
      }, {});
      for (const jugadorId of Object.keys(byPlayer)) {
        const p = players.find(pl => pl.id === jugadorId);
        if (!p) continue;
        const list = byPlayer[jugadorId];
        const subtotal = list.reduce((s, it) => s + Number(it.cantidad || 0), 0);
        const meses = list.map((it) => `${it.mes} (${Number(it.cantidad).toFixed(2)}€)`).join(', ');
        const html = `
          <h2>Justificante recibido - CD Bustarviejo</h2>
          <p>Hemos recibido el justificante de transferencia para <strong>${p.nombre}</strong>.</p>
          <div style="background:#f0f9ff;border-left:4px solid #3b82f6;padding:12px;margin:12px 0;">
            <p><strong>Concepto:</strong> ${transferConcept}</p>
            <p><strong>Cuotas incluidas:</strong> ${meses}</p>
            <p><strong>Importe para este jugador:</strong> ${subtotal.toFixed(2)}€</p>
            <p><strong>Estado:</strong> En revisión 🟠</p>
          </div>
          <p>Te avisaremos cuando el pago quede verificado por Tesorería.</p>
        `;
        if (p.email_padre) {
          await base44.functions.invoke('sendEmail', { to: p.email_padre, subject: 'Justificante recibido - CD Bustarviejo', html });
        }
        if (p.email_tutor_2) {
          await base44.functions.invoke('sendEmail', { to: p.email_tutor_2, subject: 'Justificante recibido - CD Bustarviejo', html });
        }
      }
    } catch (e) {
      console.log('Email notifications (batch) error:', e);
    }

    // Limpiar selección y cerrar
    setShowTransferDialog(false);
    setCartSelected([]);
    setSuccessMessage('📤 Justificante recibido para el lote. Pagos en revisión.');
    setShowSuccess(true);
    queryClient.invalidateQueries({ queryKey: ['myPayments'] });
    queryClient.invalidateQueries({ queryKey: ['allPayments'] });
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
  
  // currentSeason provided by SeasonProvider

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
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              queryClient.invalidateQueries({ queryKey: ['myPlayers'] });
              queryClient.invalidateQueries({ queryKey: ['myPayments'] });
              toast.success("Actualizando datos...");
            }}
            className="bg-white"
            title="Refrescar datos"
          >
            <RefreshCw className={`w-5 h-5 ${loadingPlayers || loadingPayments ? 'animate-spin' : ''}`} />
          </Button>
          <Button
            onClick={() => {
              setQuickPayOpen(true);
            }}
            type="button"
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          >
            <Plus className="w-5 h-5 mr-2" />
            Pagar / Registrar
          </Button>
        </div>
      </div>



      {/* Modal selector rápido Tarjeta / Transferencia */}
      <QuickPaySelector
        open={quickPayOpen}
        onClose={() => setQuickPayOpen(false)}
        onChooseCard={() => {
          // Si hay exactamente 1 cuota seleccionada en la tabla, abrimos el PayModal de esa; si no, mostramos aviso para usar los botones de Pagar o el carrito
          if (cartSelected.length === 1) {
            const { player, payment } = cartSelected[0];
            setPayModalContext({ player, payment });
            setPayModalOpen(true);
          } else {
            alert('Selecciona una cuota concreta para pagar con tarjeta o usa el carrito para varias.');
          }
        }}
        onChooseTransfer={() => {
          setQuickPayOpen(false);
          setSelectedPlayerId(null);
          setShowForm(true);
          setTimeout(() => {
            const formElement = document.querySelector('[data-payment-form]');
            if (formElement) {
              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }}
      />

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

              // Usar SIEMPRE la temporada activa
              const playerSeason = currentSeason;
              const allPlayerPayments = payments.filter(p => 
                p.jugador_id === player.id && 
                normalizeSeason(p.temporada) === normalizeSeason(playerSeason)
              );

              // Verificar si tiene plan personalizado
              const playerCustomPlan = customPlans.find(p => 
                p.jugador_id === player.id && p.estado === "Activo"
              );

              // Determinar tipo de pago - verificar si ALGÚN pago es de tipo único o plan especial
              const hasPagoUnico = allPlayerPayments.some(p => 
                p.tipo_pago === "Único" || p.tipo_pago === "único"
              );
              
              const hasPlanEspecial = allPlayerPayments.some(p => 
                p.tipo_pago === "Plan Especial"
              );
              
              console.log(`🔍 [ParentPayments] ${player.nombre}:`, {
                pagosTotales: allPlayerPayments.length,
                tiposPago: allPlayerPayments.map(p => p.tipo_pago),
                hasPagoUnico,
                hasPlanEspecial
              });

              // Si tiene plan especial, mostrar SOLO los pagos reales (no crear virtuales)
              let displayPayments;
              
              if (hasPlanEspecial) {
                // Plan especial: mostrar SOLO pagos reales del plan, sin duplicados
                const planPayments = allPlayerPayments.filter(p => p.tipo_pago === "Plan Especial");
                
                // Eliminar duplicados basándose en mes (Cuota 1, Cuota 2, etc)
                const seen = new Set();
                displayPayments = planPayments.filter(p => {
                  if (seen.has(p.mes)) {
                    console.log('⚠️ [ParentPayments] Duplicado detectado:', p.mes, p.id);
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
                // Determinar los meses que debería tener este jugador
                const allMonths = hasPagoUnico
                  ? ["Junio"]
                  : ["Junio", "Septiembre", "Diciembre"];
                
                displayPayments = allMonths.map(mes => {
                  // Buscar cualquier pago de este mes (pagado, pendiente o en revisión)
                  const existingPayment = allPlayerPayments.find(p => p.mes === mes);
                  
                  if (existingPayment) {
                    // Si existe el pago (en cualquier estado), mostrarlo
                    return existingPayment;
                  }
                  
                  // Solo crear virtual si NO existe ningún pago para este mes
                  const cuotas = getCuotasFromConfig(player.deporte, categoryConfigs);
                  const cantidad = hasPagoUnico 
                    ? cuotas.total 
                    : getImportePorMesFromConfig(player.deporte, mes, categoryConfigs);
                  
                  return {
                    id: `virtual-${player.id}-${mes}`,
                    jugador_id: player.id,
                    jugador_nombre: player.nombre,
                    mes: mes,
                    temporada: currentSeason,
                    estado: "Pendiente",
                    cantidad: cantidad,
                    tipo_pago: hasPagoUnico ? "Único" : "Tres meses",
                    isVirtual: true
                    };
                    });
              }
              
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
                    <div className="flex flex-wrap items-start md:items-center justify-start md:justify-between gap-3">
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
                        <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end">
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
                        <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end">
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
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {displayPayments.map((payment, index) => {
                            // Para PLAN ESPECIAL - mostrar cuotas en orden secuencial
                            let mostrarBotonPagar = false;
                            
                            if (hasPlanEspecial) {
                              // Plan especial: solo permitir pagar la PRIMERA cuota pendiente
                              const cuotasPendientes = displayPayments
                                .filter(p => p.estado === "Pendiente" && !p.isVirtual)
                                .sort((a, b) => {
                                  const numA = parseInt(a.mes.replace('Cuota ', ''));
                                  const numB = parseInt(b.mes.replace('Cuota ', ''));
                                  return numA - numB;
                                });
                              
                              mostrarBotonPagar = cuotasPendientes.length > 0 && cuotasPendientes[0].id === payment.id;
                            } else {
                              // Lógica estándar para mostrar botón "Pagar" solo si la cuota anterior está pagada
                              const ordenMeses = ["Junio", "Septiembre", "Diciembre"];
                              const mesIndex = ordenMeses.indexOf(payment.mes);
                              const cuotaAnterior = mesIndex > 0 ? displayPayments.find(p => p.mes === ordenMeses[mesIndex - 1]) : null;
                              const cuotaAnteriorPagada = mesIndex === 0 || cuotaAnterior?.estado === "Pagado";
                              // Mostrar botón si: está pendiente Y (es la primera cuota O la anterior está pagada)
                              mostrarBotonPagar = payment.estado === "Pendiente" && cuotaAnteriorPagada;
                            }

                            return (
                            <div key={payment.id} className={`border-l-4 p-3 rounded ${
                              payment.estado === "Pagado" ? "border-green-500 bg-green-50" :
                              payment.estado === "En revisión" ? "border-orange-500 bg-orange-50" :
                              "border-red-500 bg-red-50"
                            }`}>
                              <div className="flex flex-wrap items-start md:items-center justify-start md:justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="font-bold text-slate-900">{payment.mes}</span>
                                    {payment.tipo_pago === "Plan Especial" && (
                                      <Badge className="bg-purple-100 text-purple-700 text-xs">Plan Especial</Badge>
                                    )}
                                    <span className="text-2xl">{statusEmojis[payment.estado]}</span>
                                    <span className="text-lg font-bold">{payment.cantidad?.toFixed(2)}€</span>
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
                                  <p className="text-xs text-slate-600">
                                    {payment.estado}{payment.isVirtual ? " (sin registrar)" : ""}
                                    {payment.notas && payment.tipo_pago === "Plan Especial" && (
                                      <span className="block text-purple-600 mt-1">{payment.notas}</span>
                                    )}
                                  </p>
                                </div>
                                <div className="flex items-center gap-2 w-full md:w-auto justify-start md:justify-end">
                                  {/* Selección para carrito */}
                                  {(() => {
                                    const key = payment.id;
                                    const isSelected = cartSelected.some(s => s.payment.id === payment.id);
                                    const canSelect = payment.estado === 'Pendiente';
                                    return (
                                      <div className="flex items-center gap-2">
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={(v) => {
                                            if (!canSelect) return;
                                            setCartSelected(prev => {
                                              const exists = prev.some(s => s.payment.id === payment.id);
                                              if (v && !exists) return [...prev, { player, payment }];
                                              if (!v && exists) return prev.filter(s => s.payment.id !== payment.id);
                                              return prev;
                                            });
                                          }}
                                          disabled={!canSelect}
                                        />
                                        {mostrarBotonPagar && !payment.isVirtual && (
                                          <Button
                                            size="sm"
                                            onClick={() => {
                                              setPayModalContext({ player, payment });
                                              setPayModalOpen(true);
                                            }}
                                            className="bg-orange-600 hover:bg-orange-700 text-white"
                                          >
                                            💳 Pagar
                                          </Button>
                                        )}
                                      </div>
                                    );
                                  })()}
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

      {/* Aviso de selección múltiple */}
      <Alert className="mb-4">
        <AlertTitle>Pago múltiple de cuotas</AlertTitle>
        <AlertDescription>
          Puedes seleccionar distintas cuotas de diferentes jugadores y pagarlas todas a la vez. Marca las cuotas que quieras, revisa el total y elige Tarjeta o Transferencia.
        </AlertDescription>
      </Alert>

      <ContactCard />

      <PayModal
        open={payModalOpen}
        onClose={() => setPayModalOpen(false)}
        player={payModalContext.player}
        payment={payModalContext.payment}
        onPayCard={async () => {
          const { player, payment } = payModalContext;
          if (!player || !payment) return;
          try {
            // Bloquear en iframe (editor)
            if (window.top !== window.self) {
              alert('Por seguridad, el pago con tarjeta solo funciona en la app publicada.');
              return;
            }
            const successUrl = `${window.location.origin}${createPageUrl('ParentPayments')}?stripe=success`;
            const cancelUrl = `${window.location.origin}${createPageUrl('ParentPayments')}?stripe=canceled`;
            const { data } = await base44.functions.invoke('stripeCheckout', {
              amount: Number(payment.cantidad),
              name: `Cuota ${payment.mes} - ${player.nombre} (${payment.temporada})`,
              currency: 'eur',
              successUrl,
              cancelUrl,
              metadata: {
                tipo: 'pago_cuota',
                payment_id: payment.id,
                jugador_id: player.id,
                jugador_nombre: player.nombre,
                temporada: payment.temporada,
                mes: payment.mes,
                categoria: player.deporte || '',
                user_email: user?.email
              }
            });
            if (data?.url) {
              window.location.href = data.url;
            } else {
              toast.error(data?.error || 'No se pudo iniciar el pago con tarjeta');
            }
          } catch (e) {
            console.error('Stripe checkout error', e);
          }
        }}
        onChooseTransfer={() => {
          const { player, payment } = payModalContext;
          setPayModalOpen(false);
          setSelectedPlayerId(player?.id || null);
          setSelectedPaymentMonth(payment?.mes || null);
          setShowForm(true);
          setTimeout(() => {
            const formElement = document.querySelector('[data-payment-form]');
            if (formElement) {
              formElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 100);
        }}
        onUploadTransfer={(file) => {
          if (!payModalContext?.payment?.id) return;
          setPayModalOpen(false);
          setUploadingPaymentId(payModalContext.payment.id);
          uploadJustificanteMutation.mutate({ paymentId: payModalContext.payment.id, file });
        }}
        />

        {/* Barra flotante del carrito */}
        <PaymentsCartBar
          selectedCount={cartSelected.length}
          total={cartSelected.reduce((s, it) => s + Number(it.payment.cantidad || 0), 0)}
          onPayCard={() => setShowSummary(true)}
          onTransfer={() => setShowSummary(true)}
        />

        <BatchSummaryDialog
          open={showSummary}
          onClose={() => setShowSummary(false)}
          items={cartSelected}
          total={cartSelected.reduce((s, it) => s + Number(it.payment.cantidad || 0), 0)}
          onPayCard={async () => { setShowSummary(false); await handlePayCartWithCard(); }}
          onTransfer={async () => { setShowSummary(false); await handleGenerateTransfer(); }}
        />

        {/* Diálogo de transferencia por lote */}
        <BatchTransferDialog
        open={showTransferDialog}
        onClose={() => setShowTransferDialog(false)}
        concept={transferConcept}
        total={cartSelected.reduce((s, it) => s + Number(it.payment.cantidad || 0), 0)}
        onConfirm={handleConfirmTransfer}
        />

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