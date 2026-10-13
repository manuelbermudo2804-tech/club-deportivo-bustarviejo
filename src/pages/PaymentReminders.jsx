import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Send, CheckCircle2, RefreshCw, Mail, MessageCircle, Loader2, Users, Info, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { getCuotasPorCategoriaSync } from "../components/payments/paymentAmounts";

import SocialLinks from "../components/SocialLinks";
import { useActiveSeason } from "../components/season/SeasonProvider";
import { CheckmarkAnimation } from "../components/animations/SuccessAnimation";
import SelectiveReminderDialog from "../components/reminders/SelectiveReminderDialog";
import { buildWhatsAppReminderMessage, openWhatsAppReminder } from "../components/reminders/whatsappReminderMessage";
import { registrarRecordatorioEnviado } from "../components/reminders/recordatorioTracking";
import PlayerPaymentSwitches from "../components/payments/PlayerPaymentSwitches";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

export default function PaymentReminders() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sendingMassive, setSendingMassive] = useState(false);
  const [selectedFamilies, setSelectedFamilies] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [selectiveDialogFamily, setSelectiveDialogFamily] = useState(null);
  const [filterStaff, setFilterStaff] = useState("all"); // all, staff, noStaff
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterDebtRange, setFilterDebtRange] = useState("all"); // all, low, medium, high

  const { activeSeason, seasonConfig } = useActiveSeason();

  // Datos bancarios desde SeasonConfig (con fallback)
  const clubIban = useMemo(() => {
    const raw = seasonConfig?.club_iban?.trim();
    if (!raw) return "ES82 0049 4447 38 2010604048";
    return raw.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim();
  }, [seasonConfig]);
  const clubBank = seasonConfig?.club_bank?.trim() || "Santander";

  const { data: payments = [], refetch: refetchPayments } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const allPayments = await base44.entities.Payment.list();
      return allPayments.filter(p => p.is_deleted !== true);
    },
  });

  const { data: players = [], refetch: refetchPlayers } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
  });

  const { data: categoryConfigs = [] } = useQuery({
    queryKey: ['categoryConfigs'],
    queryFn: () => base44.entities.CategoryConfig.list(),
  });

  const { data: customPlans = [] } = useQuery({
    queryKey: ['customPaymentPlans'],
    queryFn: () => base44.entities.CustomPaymentPlan.list(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const handleRefresh = async () => {
    await refetchPayments();
    await refetchPlayers();
    toast.success("Datos actualizados");
  };

  // Calcular cuotas correctas desde CategoryConfig
  const getCorrectAmount = (deporte, mes) => {
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

    const mappedName = CATEGORY_NAME_MAPPING[deporte] || deporte;
    const categoryConfig = categoryConfigs.find(c => 
      (c.nombre === deporte || c.nombre === mappedName) && c.activa
    );

    if (categoryConfig) {
      switch(mes) {
        case "Junio": return categoryConfig.cuota_inscripcion;
        case "Septiembre": return categoryConfig.cuota_segunda;
        case "Diciembre": return categoryConfig.cuota_tercera;
      }
    }
    
    // Fallback
    const cuotas = getCuotasPorCategoriaSync(deporte);
    return cuotas.junio || cuotas.septiembre || cuotas.diciembre || 0;
  };

  // Siempre la temporada activa
  const effectiveSeason = useMemo(() => {
    return (activeSeason || getCurrentSeason()).replace(/-/g, '/');
  }, [activeSeason]);

  // Agrupar por familia (email_padre)
  const familiesData = useMemo(() => {
    const currentSeason = effectiveSeason;
    const activePlayers = players.filter(p => p.activo === true);
    const familyMap = {};

    activePlayers.forEach(player => {
      const familyEmail = player.email_padre;
      if (!familyEmail) return;

      if (!familyMap[familyEmail]) {
        // Verificar si el email pertenece a algún miembro del staff
        const userAccount = allUsers.find(u => u.email === familyEmail);
        const isStaff = userAccount && (
          userAccount.role === "admin" || 
          userAccount.es_entrenador === true || 
          userAccount.es_coordinador === true || 
          userAccount.es_tesorero === true
        );
        const staffRole = isStaff ? (
          userAccount.role === "admin" ? "Admin" :
          userAccount.es_coordinador ? "Coordinador" :
          userAccount.es_tesorero ? "Tesorero" :
          userAccount.es_entrenador ? "Entrenador" : "Staff"
        ) : null;

        familyMap[familyEmail] = {
          email: familyEmail,
          nombre_tutor: player.nombre_tutor_legal || "Familia",
          telefono: player.telefono,
          email_tutor_2: player.email_tutor_2,
          jugadores: [],
          isStaff: isStaff,
          staffRole: staffRole
        };
      }

      // Normalizar temporadas (aceptar "/" y "-")
      const normalizeSeason = (season) => {
        if (!season) return currentSeason;
        return season.replace(/-/g, '/');
      };

      // Calcular estado de pagos del jugador - FILTRAR CORRECTAMENTE
      const playerPayments = payments.filter(p => 
        p.jugador_id === player.id && 
        normalizeSeason(p.temporada) === currentSeason
      );

      // Verificar si tiene plan especial activo
      const playerActivePlan = customPlans.find(p => 
        p.jugador_id === player.id && 
        p.estado === "Activo" &&
        normalizeSeason(p.temporada) === currentSeason
      );

      if (playerActivePlan) {
        console.log(`[PLAN ESPECIAL] ${player.nombre} tiene plan activo con ${playerActivePlan.numero_cuotas} cuotas`);
        
        // Filtrar solo pagos del plan especial
        const planPayments = playerPayments.filter(p => p.tipo_pago === "Plan Especial");
        
        // Eliminar duplicados por mes
        const seen = new Set();
        const uniquePlanPayments = planPayments.filter(p => {
          if (seen.has(p.mes)) return false;
          seen.add(p.mes);
          return true;
        });
        
        // Contar cuántas cuotas están pagadas o en revisión
        const cuotasPagadas = uniquePlanPayments.filter(p => 
          p.estado === "Pagado" || p.estado === "En revisión"
        ).length;
        
        // Cuotas pendientes
        const cuotasPendientes = uniquePlanPayments.filter(p => p.estado === "Pendiente");
        
        console.log(`[PLAN ESPECIAL] ${player.nombre}: ${cuotasPagadas} pagadas, ${cuotasPendientes.length} pendientes`);
        
        // Si no hay cuotas pendientes, no tiene pagos pendientes
        if (cuotasPendientes.length === 0) {
          familyMap[familyEmail].jugadores.push({
            id: player.id,
            nombre: player.nombre,
            deporte: player.deporte,
            foto_url: player.foto_url,
            pendingMonths: [],
            totalDue: 0,
            hasPendingPayments: false
          });
          return;
        }
        
        // Mostrar solo las cuotas pendientes
        const pendingMonths = cuotasPendientes.map(p => ({
          mes: p.mes,
          cantidad: p.cantidad,
          payment_id: p.id,
          isVirtual: false
        }));
        
        familyMap[familyEmail].jugadores.push({
          id: player.id,
          nombre: player.nombre,
          deporte: player.deporte,
          foto_url: player.foto_url,
          pendingMonths: pendingMonths,
          totalDue: pendingMonths.reduce((sum, m) => sum + m.cantidad, 0),
          hasPendingPayments: true
        });
        return;
      }

      // Detectar Plan Mensual (pago inicial + mensualidades Stripe)
      const hasPlanMensual = playerPayments.some(p => p.tipo_pago === "Plan Mensual");
      if (hasPlanMensual) {
        const pmInitial = playerPayments.find(p => p.tipo_pago === "Plan Mensual" && p.mes === "Junio");
        const numMeses = pmInitial?.plan_mensual_meses || (() => {
          const m = pmInitial?.notas?.match(/(\d+)x [\d.]+€\/mes/);
          return m ? Number(m[1]) : 0;
        })();
        const mensualidad = pmInitial?.plan_mensual_mensualidad || (() => {
          const m = pmInitial?.notas?.match(/(\d+)x ([\d.]+)€\/mes/);
          return m ? Number(m[2]) : 0;
        })();
        const totalEsperadas = 1 + numMeses; // pago inicial + N mensualidades
        const allPM = playerPayments.filter(p => p.tipo_pago === "Plan Mensual");
        const pagados = allPM.filter(p => p.estado === "Pagado");
        const pendientes = allPM.filter(p => p.estado === "Pendiente");

        const pendingMonths = [];

        // Pago inicial pendiente
        if (pmInitial && pmInitial.estado === "Pendiente") {
          pendingMonths.push({
            mes: "Pago Inicial (Plan Mensual)",
            cantidad: pmInitial.cantidad,
            payment_id: pmInitial.id,
            isVirtual: false
          });
        }

        // Mensualidades pendientes registradas
        pendientes.filter(p => p.id !== pmInitial?.id).forEach(p => {
          pendingMonths.push({
            mes: p.mes || "Mensualidad",
            cantidad: p.cantidad,
            payment_id: p.id,
            isVirtual: false
          });
        });

        // Mensualidades futuras aún no creadas por Stripe
        const mensualidadesCobradas = allPM.filter(p => p.mes !== "Junio" && (p.estado === "Pagado" || p.estado === "En revisión" || p.estado === "Pendiente")).length;
        const mensualidadesFaltantes = Math.max(0, numMeses - mensualidadesCobradas);
        for (let i = 0; i < mensualidadesFaltantes; i++) {
          pendingMonths.push({
            mes: `Mensualidad futura (${i + mensualidadesCobradas + 1}/${numMeses})`,
            cantidad: mensualidad,
            payment_id: null,
            isVirtual: true
          });
        }

        const totalDue = pendingMonths.reduce((sum, m) => sum + m.cantidad, 0);
        familyMap[familyEmail].jugadores.push({
          id: player.id,
          nombre: player.nombre,
          deporte: player.deporte,
          foto_url: player.foto_url,
          pendingMonths,
          totalDue,
          hasPendingPayments: pendingMonths.length > 0
        });
        return;
      }

      // Detectar si tiene pago único (pagado, en revisión O pendiente)
      const hasPagoUnico = playerPayments.some(p => 
        p.tipo_pago === "Único" || p.tipo_pago === "único"
      );

      // Si tiene pago único (independientemente del estado), NO mostrar meses individuales
      if (hasPagoUnico) {
        const pagoUnico = playerPayments.find(p => p.tipo_pago === "Único" || p.tipo_pago === "único");
        
        // Si el pago único está pagado o en revisión, no hay nada pendiente
        if (pagoUnico.estado === "Pagado" || pagoUnico.estado === "En revisión") {
          familyMap[familyEmail].jugadores.push({
            id: player.id,
            nombre: player.nombre,
            deporte: player.deporte,
            foto_url: player.foto_url,
            pendingMonths: [],
            totalDue: 0,
            hasPendingPayments: false
          });
          return;
        }
        
        // Si está pendiente, mostrar como un solo pago único
        familyMap[familyEmail].jugadores.push({
          id: player.id,
          nombre: player.nombre,
          deporte: player.deporte,
          foto_url: player.foto_url,
          pendingMonths: [{ 
            mes: "Pago Único", 
            cantidad: pagoUnico.cantidad,
            payment_id: pagoUnico.id,
            isVirtual: false
          }],
          totalDue: pagoUnico.cantidad,
          hasPendingPayments: true
        });
        return;
      }

      // Si NO tiene pago único, verificar los 3 meses
      const allMonths = ["Junio", "Septiembre", "Diciembre"];
      const pendingMonths = [];
      
      allMonths.forEach(mes => {
        // Buscar si hay un pago PAGADO o EN REVISIÓN para este mes
        const pagoPagadoORevision = playerPayments.find(p => 
          p.mes === mes && (p.estado === "Pagado" || p.estado === "En revisión")
        );
        
        // Si ya está pagado o en revisión, NO incluir como pendiente
        if (pagoPagadoORevision) return;

        // Si NO está pagado ni en revisión, incluir como pendiente
        const existingPendingPayment = playerPayments.find(p => 
          p.mes === mes && p.estado === "Pendiente"
        );
        
        const cantidad = existingPendingPayment 
          ? existingPendingPayment.cantidad 
          : getCorrectAmount(player.deporte, mes);
        
        pendingMonths.push({ 
          mes, 
          cantidad,
          payment_id: existingPendingPayment?.id || null,
          isVirtual: !existingPendingPayment
        });
      });

      const totalDue = pendingMonths.reduce((sum, m) => sum + m.cantidad, 0);

      familyMap[familyEmail].jugadores.push({
        id: player.id,
        nombre: player.nombre,
        deporte: player.deporte,
        foto_url: player.foto_url,
        pendingMonths,
        totalDue,
        hasPendingPayments: pendingMonths.length > 0
      });
    });

    // Mapa de datos de recordatorios por jugador (fecha + nº veces)
    const reminderByPlayer = {};
    players.forEach(p => {
      reminderByPlayer[p.id] = {
        fecha: p.ultimo_recordatorio_pago_fecha || null,
        veces: p.recordatorios_pago_enviados || 0
      };
    });

    return Object.values(familyMap)
      .filter(f => f.jugadores.some(j => j.hasPendingPayments))
      .map(family => {
        // Para la familia: fecha más reciente y máximo de veces enviado entre sus jugadores
        let ultimaFecha = null;
        let vecesEnviado = 0;
        family.jugadores.forEach(j => {
          const r = reminderByPlayer[j.id];
          if (r) {
            if (r.fecha && (!ultimaFecha || new Date(r.fecha) > new Date(ultimaFecha))) ultimaFecha = r.fecha;
            if (r.veces > vecesEnviado) vecesEnviado = r.veces;
          }
        });
        return {
          ...family,
          totalFamilyDue: family.jugadores.reduce((sum, j) => sum + j.totalDue, 0),
          totalPendingPayments: family.jugadores.reduce((sum, j) => sum + j.pendingMonths.length, 0),
          recordatorioUltimaFecha: ultimaFecha,
          recordatorioVeces: vecesEnviado
        };
      })
      .sort((a, b) => b.totalFamilyDue - a.totalFamilyDue);
  }, [players, payments, categoryConfigs, effectiveSeason, customPlans, allUsers]);

  const filteredFamilies = familiesData.filter(family => {
    // Filtro de búsqueda de texto
    const matchesSearch = family.nombre_tutor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      family.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      family.jugadores.some(j => j.nombre.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filtro de staff
    const matchesStaff = filterStaff === "all" || 
      (filterStaff === "staff" && family.isStaff) ||
      (filterStaff === "noStaff" && !family.isStaff);
    
    // Filtro de categoría
    const matchesCategory = filterCategory === "all" || 
      family.jugadores.some(j => j.deporte === filterCategory);
    
    // Filtro de rango de deuda
    const matchesDebt = filterDebtRange === "all" ||
      (filterDebtRange === "low" && family.totalFamilyDue < 100) ||
      (filterDebtRange === "medium" && family.totalFamilyDue >= 100 && family.totalFamilyDue < 300) ||
      (filterDebtRange === "high" && family.totalFamilyDue >= 300);
    
    return matchesSearch && matchesStaff && matchesCategory && matchesDebt;
  });

  // Obtener categorías únicas para el filtro
  const availableCategories = [...new Set(
    familiesData.flatMap(f => f.jugadores.map(j => j.deporte))
  )].sort();

  const sendMassiveReminders = async () => {
    if (selectedFamilies.length === 0) {
      toast.error("Selecciona al menos una familia");
      return;
    }

    setSendingMassive(true);

    try {
      let sent = 0;
      for (const familyEmail of selectedFamilies) {
        const family = familiesData.find(f => f.email === familyEmail);
        if (!family) continue;

        // Construir mensaje
        let mensaje = `Estimada familia,\n\nLes recordamos que tienen los siguientes pagos pendientes:\n\n`;
        
        family.jugadores.forEach(jugador => {
          if (jugador.hasPendingPayments) {
            mensaje += `👤 ${jugador.nombre} (${jugador.deporte}):\n`;
            jugador.pendingMonths.forEach(m => {
              mensaje += `   • ${m.mes}: ${m.cantidad}€\n`;
            });
            mensaje += `\n`;
          }
        });

        mensaje += `Total pendiente: ${family.totalFamilyDue}€\n\n`;
        mensaje += `📧 DATOS BANCARIOS:\n`;
        mensaje += `IBAN: ${clubIban}\n`;
        mensaje += `Banco: ${clubBank}\n`;
        mensaje += `Beneficiario: CD Bustarviejo\n\n`;
        mensaje += `Por favor, accede a la app y registra los pagos.\n\n`;
        mensaje += `Atentamente,\nCD Bustarviejo`;

        // Buscar o crear conversación (usar filter en vez de list para rendimiento)
        const matchingConvs = await base44.entities.PrivateConversation.filter({
          participante_familia_email: family.email,
          participante_staff_email: 'sistema@cdbustarviejo.com'
        });
        let conv = matchingConvs[0];

        if (!conv) {
          conv = await base44.entities.PrivateConversation.create({
            participante_familia_email: family.email,
            participante_familia_nombre: family.nombre_tutor,
            participante_staff_email: "sistema@cdbustarviejo.com",
            participante_staff_nombre: "🤖 Sistema de Recordatorios - Administración",
            participante_staff_rol: "admin",
            categoria: "Todos",
            jugadores_relacionados: family.jugadores.map(j => ({ jugador_id: j.id, jugador_nombre: j.nombre })),
            ultimo_mensaje: mensaje.substring(0, 100),
            ultimo_mensaje_fecha: new Date().toISOString(),
            ultimo_mensaje_de: "staff",
            no_leidos_familia: 1,
            archivada: false
          });
        }

        // Crear mensaje
        await base44.entities.PrivateMessage.create({
          conversacion_id: conv.id,
          remitente_email: "sistema@cdbustarviejo.com",
          remitente_nombre: "🤖 Sistema de Recordatorios",
          remitente_tipo: "staff",
          mensaje: `💬 RECORDATORIO DE PAGOS\n\n${mensaje}`,
          leido: false
        });

        await base44.entities.PrivateConversation.update(conv.id, {
          ultimo_mensaje: mensaje.substring(0, 100),
          ultimo_mensaje_fecha: new Date().toISOString(),
          ultimo_mensaje_de: "staff",
          no_leidos_familia: (conv.no_leidos_familia || 0) + 1
        });

        // Enviar email
        await base44.functions.invoke('sendEmail', {
          to: family.email,
          subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
          html: mensaje.replace(/\n/g, '<br>')
        });

        if (family.email_tutor_2) {
          await base44.functions.invoke('sendEmail', {
            to: family.email_tutor_2,
            subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
            html: mensaje.replace(/\n/g, '<br>')
          });
        }

        // Crear notificación en Centro de Alertas
        await base44.entities.AppNotification.create({
        usuario_email: family.email,
        titulo: "💳 Recordatorio de Pagos Pendientes",
        mensaje: `Tienes ${family.totalPendingPayments} pago(s) pendiente(s) por ${family.totalFamilyDue}€. Revisa Mensajes del Club.`,
        tipo: "importante",
        icono: "💳",
        enlace: "ParentSystemMessages",
        vista: false
        });
        if (family.email_tutor_2) {
        await base44.entities.AppNotification.create({
        usuario_email: family.email_tutor_2,
        titulo: "💳 Recordatorio de Pagos Pendientes",
        mensaje: `Tienes ${family.totalPendingPayments} pago(s) pendiente(s) por ${family.totalFamilyDue}€. Revisa Mensajes del Club.`,
        tipo: "importante",
        icono: "💳",
        enlace: "ParentSystemMessages",
        vista: false
        });
        }

        await registrarRecordatorioEnviado(family);

        sent++;
        console.log(`✅ Recordatorio enviado a ${family.email}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      await refetchPlayers();
      setSuccessMessage(`✅ ${sent} recordatorio${sent > 1 ? 's' : ''} enviado${sent > 1 ? 's' : ''}`);
      setShowSuccess(true);
      setTimeout(() => toast.success(`${sent} recordatorios enviados por Email + Chat`), 2000);
      setSelectedFamilies([]);
    } catch (error) {
      console.error("Error sending massive reminders:", error);
      toast.error("Error al enviar recordatorios masivos");
    }

    setSendingMassive(false);
  };

  const toggleFamily = (email) => {
    setSelectedFamilies(prev =>
      prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
    );
  };

  const selectAll = () => {
    if (selectedFamilies.length === filteredFamilies.length) {
      setSelectedFamilies([]);
    } else {
      setSelectedFamilies(filteredFamilies.map(f => f.email));
    }
  };

  const totalFamilies = familiesData.length;
  const totalPendingAmount = familiesData.reduce((sum, f) => sum + f.totalFamilyDue, 0);
  const totalPendingPayments = familiesData.reduce((sum, f) => sum + f.totalPendingPayments, 0);

  const sendSelectiveReminder = async (family, selectedPayments) => {
    try {
      toast.loading("Enviando recordatorio personalizado...", { id: `selective-${family.email}` });
      
      // Construir mensaje solo con los pagos seleccionados
      let mensaje = `Estimada familia,\n\nLes recordamos que tienen los siguientes pagos pendientes:\n\n`;
      
      let totalRecordatorio = 0;
      family.jugadores.forEach(jugador => {
        const selectedMonths = selectedPayments[jugador.id] || [];
        if (selectedMonths.length > 0) {
          mensaje += `👤 ${jugador.nombre} (${jugador.deporte}):\n`;
          jugador.pendingMonths
            .filter(m => selectedMonths.includes(m.mes))
            .forEach(m => {
              mensaje += `   • ${m.mes}: ${m.cantidad}€\n`;
              totalRecordatorio += m.cantidad;
            });
          mensaje += `\n`;
        }
      });

      mensaje += `Total pendiente: ${totalRecordatorio}€\n\n`;
      mensaje += `📧 DATOS BANCARIOS:\n`;
      mensaje += `IBAN: ${clubIban}\n`;
      mensaje += `Banco: ${clubBank}\n`;
      mensaje += `Beneficiario: CD Bustarviejo\n\n`;
      mensaje += `Por favor, accede a la app y registra los pagos.\n\n`;
      mensaje += `Atentamente,\nCD Bustarviejo`;

      // Buscar o crear conversación (usar filter en vez de list para rendimiento)
      const matchingConvs = await base44.entities.PrivateConversation.filter({
        participante_familia_email: family.email,
        participante_staff_email: 'sistema@cdbustarviejo.com'
      });
      let conv = matchingConvs[0];

      if (!conv) {
        conv = await base44.entities.PrivateConversation.create({
          participante_familia_email: family.email,
          participante_familia_nombre: family.nombre_tutor,
          participante_staff_email: "sistema@cdbustarviejo.com",
          participante_staff_nombre: "🤖 Sistema de Recordatorios - Administración",
          participante_staff_rol: "admin",
          categoria: "Todos",
          jugadores_relacionados: family.jugadores.map(j => ({ jugador_id: j.id, jugador_nombre: j.nombre })),
          ultimo_mensaje: mensaje.substring(0, 100),
          ultimo_mensaje_fecha: new Date().toISOString(),
          ultimo_mensaje_de: "staff",
          no_leidos_familia: 1,
          archivada: false
        });
      }

      // Crear mensaje
      await base44.entities.PrivateMessage.create({
        conversacion_id: conv.id,
        remitente_email: "sistema@cdbustarviejo.com",
        remitente_nombre: "🤖 Sistema de Recordatorios",
        remitente_tipo: "staff",
        mensaje: `💬 RECORDATORIO DE PAGOS\n\n${mensaje}`,
        leido: false
      });

      await base44.entities.PrivateConversation.update(conv.id, {
        ultimo_mensaje: mensaje.substring(0, 100),
        ultimo_mensaje_fecha: new Date().toISOString(),
        ultimo_mensaje_de: "staff",
        no_leidos_familia: (conv.no_leidos_familia || 0) + 1
      });

      // Enviar emails
      await base44.functions.invoke('sendEmail', {
        to: family.email,
        subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
        html: mensaje.replace(/\n/g, '<br>')
      });

      if (family.email_tutor_2) {
        await base44.functions.invoke('sendEmail', {
          to: family.email_tutor_2,
          subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
          html: mensaje.replace(/\n/g, '<br>')
        });
      }

      // Crear notificación en Centro de Alertas
      await base44.entities.AppNotification.create({
        usuario_email: family.email,
        titulo: "💳 Recordatorio de Pagos Pendientes",
        mensaje: `Tienes pagos pendientes por ${totalRecordatorio}€. Revisa Mensajes del Club.`,
        tipo: "importante",
        icono: "💳",
        enlace: "ParentSystemMessages",
        vista: false
      });
      if (family.email_tutor_2) {
        await base44.entities.AppNotification.create({
          usuario_email: family.email_tutor_2,
          titulo: "💳 Recordatorio de Pagos Pendientes",
          mensaje: `Tienes pagos pendientes por ${totalRecordatorio}€. Revisa Mensajes del Club.`,
          tipo: "importante",
          icono: "💳",
          enlace: "ParentSystemMessages",
          vista: false
        });
      }

      await registrarRecordatorioEnviado(family);
      await refetchPlayers();
      toast.dismiss(`selective-${family.email}`);
      setSuccessMessage(`✅ Recordatorio enviado a ${family.nombre_tutor}`);
      setShowSuccess(true);
      setTimeout(() => toast.success(`Recordatorio personalizado enviado`), 2000);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error al enviar recordatorio", { id: `selective-${family.email}` });
    }
  };

  return (
    <>
      <CheckmarkAnimation 
        show={showSuccess} 
        onComplete={() => setShowSuccess(false)}
        message={successMessage}
      />
      <div className="mx-auto w-full min-w-0 max-w-[1600px] space-y-5 overflow-x-hidden px-3 pb-8 pt-4 sm:px-5 lg:space-y-6 lg:px-8 lg:pt-7 [&_*]:min-w-0">
        <SocialLinks />

      <section className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950 p-5 text-white shadow-lg sm:p-7">
        <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-orange-500/20 blur-3xl" />
        <div className="relative flex min-w-0 flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-400/15 ring-1 ring-orange-200/20 sm:h-14 sm:w-14"><Bell className="h-6 w-6 text-orange-300 sm:h-7 sm:w-7" /></div>
            <div className="min-w-0">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-orange-300">Administración · Gestión de cobros</p>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Recordatorios de pago</h1>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">Gestiona avisos, revisa las deudas pendientes y contacta con las familias.</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.06] px-4 py-3 sm:min-w-[190px] sm:flex-col sm:items-start">
            <div><p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Temporada activa</p><p className="mt-1 text-sm font-bold text-white">{effectiveSeason}</p></div>
            <Button onClick={handleRefresh} variant="outline" size="sm" className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"><RefreshCw className="mr-2 h-4 w-4" />Actualizar</Button>
          </div>
        </div>
      </section>

      <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-4 sm:p-5">
          <CardTitle className="flex min-w-0 items-start gap-2 text-base font-bold leading-snug text-slate-900 sm:text-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Recordatorios automáticos
          </CardTitle>
        </CardHeader>
        <CardContent className="min-w-0 space-y-4 p-3 sm:p-5">
          <p className="text-sm text-slate-700">
            El sistema envía recordatorios <strong>automáticamente</strong> por Email + Chat privado "🔔 Mensajes del Club" en estas fechas:
          </p>
          
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div className="min-w-0 rounded-xl border border-blue-200 bg-blue-50/50 p-3 sm:p-4">
              <p className="font-bold text-blue-900 text-sm mb-1">📅 Junio (Límite: 30 Jun)</p>
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• 15 Jun - 15 días antes</li>
                <li>• 23 Jun - 7 días antes</li>
                <li>• 2 Jul - 2 días después</li>
              </ul>
            </div>
            
            <div className="min-w-0 rounded-xl border border-orange-200 bg-orange-50/50 p-3 sm:p-4">
              <p className="font-bold text-orange-900 text-sm mb-1">📅 Septiembre (Límite: 15 Sep)</p>
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• 1 Sep - 14 días antes</li>
                <li>• 8 Sep - 7 días antes</li>
                <li>• 17 Sep - 2 días después</li>
              </ul>
            </div>
            
            <div className="min-w-0 rounded-xl border border-red-200 bg-red-50/50 p-3 sm:p-4">
              <p className="font-bold text-red-900 text-sm mb-1">📅 Diciembre (Límite: 15 Dic)</p>
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• 1 Dic - 14 días antes</li>
                <li>• 8 Dic - 7 días antes</li>
                <li>• 17 Dic - 2 días después</li>
              </ul>
            </div>
          </div>
          
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 sm:p-4">
            <p className="text-xs text-green-800">
              ✅ <strong>Solo se envían a familias con pagos pendientes</strong> de ese mes específico
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-3 sm:gap-4 xl:grid-cols-2">
        <Alert className="min-w-0 rounded-2xl border-blue-200 bg-white p-4 shadow-sm sm:p-5">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            <p className="font-bold mb-2">💡 ¿Cómo funciona?</p>
            <ul className="text-sm space-y-1 list-disc list-inside">
              <li><strong>Cuotas automáticas:</strong> Se calculan desde "Temporadas y Categorías"</li>
              <li><strong>Los padres registran sus pagos</strong> en "Mis Pagos"</li>
              <li><strong>Recordatorios manuales:</strong> Puedes enviar cuando quieras</li>
            </ul>
          </AlertDescription>
        </Alert>
        
        <Alert className="bg-orange-50 border-orange-300">
          <RefreshCw className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <p className="font-bold mb-2">⚙️ Actualizar Cantidades</p>
            <p className="text-sm mb-2">Si cambiaste las cuotas en "Temporadas y Categorías", usa este botón para recalcular TODOS los pagos pendientes con las nuevas cantidades.</p>
            <Button
              onClick={async () => {
                if (!confirm("¿Recalcular TODOS los pagos pendientes con las cuotas actuales de 'Temporadas y Categorías'?\n\nSOLO afecta a pagos con estado 'Pendiente'.")) return;
                
                try {
                  toast.loading("Recalculando cantidades...");
                  const currentSeason = (activeSeason || getCurrentSeason()).replace(/-/g, '/');
                  const allPayments = await base44.entities.Payment.list();
                  const activePlayers = await base44.entities.Player.list();
                  
                  let updated = 0;
                  for (const payment of allPayments) {
                    if (payment.estado !== "Pendiente" || payment.temporada !== currentSeason) continue;
                    
                    const player = activePlayers.find(p => p.id === payment.jugador_id);
                    if (!player) continue;
                    
                    const correctAmount = getCorrectAmount(player.deporte, payment.mes);
                    if (payment.cantidad !== correctAmount) {
                      await base44.entities.Payment.update(payment.id, { cantidad: correctAmount });
                      updated++;
                    }
                  }
                  
                  await refetchPayments();
                  toast.dismiss();
                  toast.success(`✅ ${updated} pagos actualizados con las cuotas correctas`);
                } catch (error) {
                  toast.dismiss();
                  toast.error("Error al actualizar cantidades");
                  console.error(error);
                }
              }}
              size="sm"
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Actualizar Todas las Cantidades
            </Button>
          </AlertDescription>
        </Alert>
      </div>

      {/* Resumen */}
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4">
        <Card className="rounded-2xl border border-red-200 bg-red-50/70 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-100 text-red-700"><Users className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-xs font-medium text-red-800 sm:text-sm">Familias con deuda</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{totalFamilies}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-orange-200 bg-orange-50/70 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><Bell className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-xs font-medium text-orange-800 sm:text-sm">Pagos pendientes</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{totalPendingPayments}</p></div>
          </CardContent>
        </Card>
        <Card className="rounded-2xl border border-emerald-200 bg-emerald-50/70 shadow-sm">
          <CardContent className="flex items-center gap-4 p-4 sm:p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Mail className="h-5 w-5" /></div>
            <div className="min-w-0"><p className="text-xs font-medium text-emerald-800 sm:text-sm">Importe total pendiente</p><p className="mt-1 text-3xl font-bold tracking-tight text-slate-950">{totalPendingAmount.toFixed(0)}€</p></div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y filtros */}
      <Card className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <CardHeader className="border-b border-slate-100 px-4 py-3 sm:px-5"><CardTitle className="text-sm font-semibold text-slate-800">Buscar y filtrar familias</CardTitle></CardHeader>
        <CardContent className="min-w-0 space-y-3 p-3 sm:p-4">
          <Input
            placeholder="🔍 Buscar familia o jugador..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full"
          />
          
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <label className="text-xs text-slate-600 mb-1 block">Tipo de familia</label>
              <select
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
              >
                <option value="all">Todas las familias</option>
                <option value="noStaff">Solo familias (sin staff)</option>
                <option value="staff">Solo miembros del staff</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 mb-1 block">Categoría/Deporte</label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
              >
                <option value="all">Todas las categorías</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-600 mb-1 block">Rango de deuda</label>
              <select
                value={filterDebtRange}
                onChange={(e) => setFilterDebtRange(e.target.value)}
                className="w-full text-sm border rounded-lg px-3 py-2 bg-white"
              >
                <option value="all">Cualquier importe</option>
                <option value="low">Menos de 100€</option>
                <option value="medium">100€ - 300€</option>
                <option value="high">Más de 300€</option>
              </select>
            </div>
          </div>

          {(filterStaff !== "all" || filterCategory !== "all" || filterDebtRange !== "all" || searchQuery) && (
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {filteredFamilies.length} de {familiesData.length} familias
              </Badge>
              <Button
                onClick={() => {
                  setSearchQuery("");
                  setFilterStaff("all");
                  setFilterCategory("all");
                  setFilterDebtRange("all");
                }}
                variant="ghost"
                size="sm"
                className="text-xs"
              >
                Limpiar filtros
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Acciones masivas */}
      <div className="grid w-full min-w-0 grid-cols-1 gap-2 sm:grid-cols-2">
        <Button
          onClick={selectAll}
          variant="outline"
          size="sm"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {selectedFamilies.length === filteredFamilies.length ? "Deseleccionar" : "Seleccionar"} todas ({filteredFamilies.length})
        </Button>
        <Button
          onClick={sendMassiveReminders}
          disabled={selectedFamilies.length === 0 || sendingMassive}
          className="w-full min-w-0 whitespace-normal h-auto min-h-10 py-2 bg-orange-600 hover:bg-orange-700 active:scale-95 transition-transform"
        >
          {sendingMassive ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
          ) : (
            <><Send className="w-4 h-4 mr-2" />Enviar Masivo ({selectedFamilies.length})</>
          )}
        </Button>
      </div>

      {selectedFamilies.length > 0 && (
        <Alert className="bg-orange-50 border-orange-300">
          <Send className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <p className="font-bold">
              {selectedFamilies.length} familia{selectedFamilies.length > 1 ? 's' : ''} seleccionada{selectedFamilies.length > 1 ? 's' : ''}
            </p>
            <p className="text-sm mt-1">
              Se enviará recordatorio por Email + Chat privado "🔔 Mensajes del Club"
            </p>
          </AlertDescription>
        </Alert>
      )}

      {/* Lista de familias */}
      <div className="space-y-3">
        {filteredFamilies.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <p className="text-lg font-semibold text-green-700">¡Todas las familias al día!</p>
              <p className="text-sm text-slate-600 mt-1">No hay pagos pendientes</p>
            </CardContent>
          </Card>
        ) : (
          filteredFamilies.map(family => (
            <Card key={family.email} className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-shadow hover:border-slate-300 hover:shadow-md">
              <CardHeader className="border-b border-slate-100 bg-slate-50/80 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex items-start gap-3 flex-1 min-w-0">
                    <input
                      type="checkbox"
                      checked={selectedFamilies.includes(family.email)}
                      onChange={() => toggleFamily(family.email)}
                      className="w-5 h-5 rounded border-slate-300"
                    />
                    <div className="flex-1">
                     <div className="flex flex-wrap items-center gap-2 mb-1">
                       <CardTitle className="text-base">{family.nombre_tutor}</CardTitle>
                       {family.isStaff && (
                         <Badge className="bg-purple-500 text-white text-xs">
                           👤 {family.staffRole}
                         </Badge>
                       )}
                     </div>
                     <p className="text-xs text-slate-600 break-all">{family.email}</p>
                     {family.recordatorioVeces > 0 ? (
                       <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5 inline-block mt-1">
                         📨 Último recordatorio: {family.recordatorioUltimaFecha ? format(new Date(family.recordatorioUltimaFecha), "d MMM yyyy 'a las' HH:mm", { locale: es }) : "—"} · {family.recordatorioVeces} {family.recordatorioVeces === 1 ? "vez" : "veces"}
                       </p>
                     ) : (
                       <p className="text-[11px] text-slate-400 mt-1">Sin recordatorios enviados</p>
                     )}
                     {family.telefono && (
                       <div className="flex items-center gap-2 flex-wrap">
                         <p className="text-xs text-slate-500">📱 {family.telefono}</p>
                         <button
                           type="button"
                           className="inline-flex items-center gap-1 text-[10px] bg-green-500 text-white px-2 py-0.5 rounded-full hover:bg-green-600 transition-colors"
                           onClick={(e) => {
                             e.stopPropagation();
                             const mensaje = buildWhatsAppReminderMessage({ family, clubIban, clubBank });
                             const ok = openWhatsAppReminder({ telefono: family.telefono, mensaje });
                             if (!ok) toast.error('Teléfono no válido');
                           }}
                           title="Abre WhatsApp con el recordatorio ya escrito"
                         >
                           💬 WhatsApp con mensaje
                         </button>
                       </div>
                     )}
                    </div>
                    </div>
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:text-right pl-8 sm:pl-0">
                    <Badge className="max-w-full whitespace-normal text-center bg-red-500 text-white mb-1">
                      {family.totalPendingPayments} pendientes
                    </Badge>
                    <p className="text-lg font-bold text-red-600">{family.totalFamilyDue.toFixed(0)}€</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="min-w-0 p-3 sm:p-4">
                <div className="space-y-3">
                  {family.jugadores.map(jugador => (
                    <div key={jugador.id} className="flex min-w-0 items-start gap-3 rounded-xl border border-slate-200 bg-white p-2 sm:p-3">
                      {jugador.foto_url ? (
                        <img src={jugador.foto_url} className="h-10 w-10 flex-shrink-0 rounded-full object-cover sm:h-12 sm:w-12" alt="" />
                      ) : (
                        <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-orange-500 font-bold text-white sm:h-12 sm:w-12">
                          {jugador.nombre.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{jugador.nombre}</p>
                        <p className="text-xs text-slate-600">{jugador.deporte}</p>
                        {jugador.hasPendingPayments && (
                          <div className="mt-2 space-y-1">
                            {jugador.pendingMonths.map(m => (
                              <div key={m.mes} className="flex flex-wrap justify-between gap-x-3 text-xs">
                                <span className="text-red-600">• {m.mes}</span>
                                <span className="font-semibold text-red-700">{m.cantidad}€</span>
                              </div>
                            ))}
                            <div className="pt-1 border-t border-slate-200 flex justify-between text-xs font-bold">
                              <span className="text-slate-700">Total jugador:</span>
                              <span className="text-red-700">{jugador.totalDue}€</span>
                            </div>
                          </div>
                        )}
                        <PlayerPaymentSwitches
                          key={`sw-${jugador.id}-${players.find(p => p.id === jugador.id)?.updated_date || ''}`}
                          player={players.find(p => p.id === jugador.id) || { id: jugador.id }}
                          onUpdated={refetchPlayers}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Total familia:</p>
                    <p className="text-2xl font-bold text-red-600">{family.totalFamilyDue.toFixed(0)}€</p>
                  </div>
                  <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                    <Button
                      onClick={() => setSelectiveDialogFamily(family)}
                      size="sm"
                      variant="outline"
                      className="border-orange-300 text-orange-700 hover:bg-orange-50"
                    >
                      <Zap className="w-4 h-4 mr-2" />
                      Seleccionar Pagos
                    </Button>
                    <Button
                    onClick={async (e) => {
                      const button = e.currentTarget;
                      button.disabled = true;
                      
                      try {
                        toast.loading("Enviando recordatorio...", { id: `reminder-${family.email}` });
                        
                        // Construir mensaje
                        let mensaje = `Estimada familia,\n\nLes recordamos que tienen los siguientes pagos pendientes:\n\n`;
                        
                        family.jugadores.forEach(jugador => {
                          if (jugador.hasPendingPayments) {
                            mensaje += `👤 ${jugador.nombre} (${jugador.deporte}):\n`;
                            jugador.pendingMonths.forEach(m => {
                              mensaje += `   • ${m.mes}: ${m.cantidad}€\n`;
                            });
                            mensaje += `\n`;
                          }
                        });

                        mensaje += `Total pendiente: ${family.totalFamilyDue}€\n\n`;
                        mensaje += `📧 DATOS BANCARIOS:\n`;
                        mensaje += `IBAN: ${clubIban}\n`;
                        mensaje += `Banco: ${clubBank}\n`;
                        mensaje += `Beneficiario: CD Bustarviejo\n\n`;
                        mensaje += `Por favor, accede a la app y registra los pagos.\n\n`;
                        mensaje += `Atentamente,\nCD Bustarviejo`;

                        // Buscar o crear conversación (usar filter en vez de list para rendimiento)
                        const matchingConvs = await base44.entities.PrivateConversation.filter({
                          participante_familia_email: family.email,
                          participante_staff_email: 'sistema@cdbustarviejo.com'
                        });
                        let conv = matchingConvs[0];

                        if (!conv) {
                          conv = await base44.entities.PrivateConversation.create({
                            participante_familia_email: family.email,
                            participante_familia_nombre: family.nombre_tutor,
                            participante_staff_email: "sistema@cdbustarviejo.com",
                            participante_staff_nombre: "🤖 Sistema de Recordatorios - Administración",
                            participante_staff_rol: "admin",
                            categoria: "Todos",
                            jugadores_relacionados: family.jugadores.map(j => ({ jugador_id: j.id, jugador_nombre: j.nombre })),
                            ultimo_mensaje: mensaje.substring(0, 100),
                            ultimo_mensaje_fecha: new Date().toISOString(),
                            ultimo_mensaje_de: "staff",
                            no_leidos_familia: 1,
                            archivada: false
                          });
                        }

                        // Crear mensaje
                        await base44.entities.PrivateMessage.create({
                          conversacion_id: conv.id,
                          remitente_email: "sistema@cdbustarviejo.com",
                          remitente_nombre: "🤖 Sistema de Recordatorios",
                          remitente_tipo: "staff",
                          mensaje: `💬 RECORDATORIO DE PAGOS\n\n${mensaje}`,
                          leido: false
                        });

                        await base44.entities.PrivateConversation.update(conv.id, {
                          ultimo_mensaje: mensaje.substring(0, 100),
                          ultimo_mensaje_fecha: new Date().toISOString(),
                          ultimo_mensaje_de: "staff",
                          no_leidos_familia: (conv.no_leidos_familia || 0) + 1
                        });

                        // Enviar email
                        await base44.functions.invoke('sendEmail', {
                          to: family.email,
                          subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
                          html: mensaje.replace(/\n/g, '<br>')
                        });

                        if (family.email_tutor_2) {
                          await base44.functions.invoke('sendEmail', {
                            to: family.email_tutor_2,
                            subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
                            html: mensaje.replace(/\n/g, '<br>')
                          });
                        }

                        // Crear notificación en Centro de Alertas
                        await base44.entities.AppNotification.create({
                          usuario_email: family.email,
                          titulo: "💳 Recordatorio de Pagos Pendientes",
                          mensaje: `Tienes ${family.totalPendingPayments} pago(s) pendiente(s) por ${family.totalFamilyDue}€. Revisa Mensajes del Club.`,
                          tipo: "importante",
                          icono: "💳",
                          enlace: "ParentSystemMessages",
                          vista: false
                        });
                        if (family.email_tutor_2) {
                          await base44.entities.AppNotification.create({
                            usuario_email: family.email_tutor_2,
                            titulo: "💳 Recordatorio de Pagos Pendientes",
                            mensaje: `Tienes ${family.totalPendingPayments} pago(s) pendiente(s) por ${family.totalFamilyDue}€. Revisa Mensajes del Club.`,
                            tipo: "importante",
                            icono: "💳",
                            enlace: "ParentSystemMessages",
                            vista: false
                          });
                        }

                        await registrarRecordatorioEnviado(family);
                        await refetchPlayers();
                        console.log(`✅ Recordatorio enviado a ${family.email}`);
                        toast.dismiss(`reminder-${family.email}`);
                        setSuccessMessage(`✅ Recordatorio enviado a ${family.nombre_tutor}`);
                        setShowSuccess(true);
                        setTimeout(() => toast.success(`Recordatorio enviado`), 2000);
                      } catch (error) {
                        console.error("Error:", error);
                        toast.error("Error al enviar recordatorio", { id: `reminder-${family.email}` });
                      } finally {
                        button.disabled = false;
                      }
                    }}
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 active:scale-95 transition-transform"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Enviar Todo
                  </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      </div>

      {/* Diálogo de selección granular */}
      {selectiveDialogFamily && (
        <SelectiveReminderDialog
          open={!!selectiveDialogFamily}
          onClose={() => setSelectiveDialogFamily(null)}
          family={selectiveDialogFamily}
          onSend={(selectedPayments) => sendSelectiveReminder(selectiveDialogFamily, selectedPayments)}
        />
      )}
      </>
      );
      }