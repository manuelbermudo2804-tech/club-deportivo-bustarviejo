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
import { CheckmarkAnimation } from "../components/animations/SuccessAnimation";
import SelectiveReminderDialog from "../components/reminders/SelectiveReminderDialog";

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

  // Agrupar por familia (email_padre)
  const familiesData = useMemo(() => {
    const currentSeason = getCurrentSeason();
    const activePlayers = players.filter(p => p.activo === true);
    const familyMap = {};

    activePlayers.forEach(player => {
      const familyEmail = player.email_padre;
      if (!familyEmail) return;

      if (!familyMap[familyEmail]) {
        familyMap[familyEmail] = {
          email: familyEmail,
          nombre_tutor: player.nombre_tutor_legal || "Familia",
          telefono: player.telefono,
          email_tutor_2: player.email_tutor_2,
          jugadores: []
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

      // Detectar si tiene pago único pagado/en revisión
      const hasPagoUnico = playerPayments.some(p => 
        (p.tipo_pago === "Único" || p.tipo_pago === "único") && 
        (p.estado === "Pagado" || p.estado === "En revisión")
      );

      // Si tiene pago único pagado, NO hay cuotas pendientes
      if (hasPagoUnico) {
        // Pago único ya cubierto, 0 pendientes
        familyMap[familyEmail].jugadores.push({
          id: player.id,
          nombre: player.nombre,
          deporte: player.deporte,
          foto_url: player.foto_url,
          pendingMonths: [],
          totalDue: 0,
          hasPendingPayments: false
        });
        return; // Continuar con siguiente jugador
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

    return Object.values(familyMap)
      .filter(f => f.jugadores.some(j => j.hasPendingPayments))
      .map(family => ({
        ...family,
        totalFamilyDue: family.jugadores.reduce((sum, j) => sum + j.totalDue, 0),
        totalPendingPayments: family.jugadores.reduce((sum, j) => sum + j.pendingMonths.length, 0)
      }))
      .sort((a, b) => b.totalFamilyDue - a.totalFamilyDue);
  }, [players, payments, categoryConfigs]);

  const filteredFamilies = familiesData.filter(family =>
    family.nombre_tutor.toLowerCase().includes(searchQuery.toLowerCase()) ||
    family.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    family.jugadores.some(j => j.nombre.toLowerCase().includes(searchQuery.toLowerCase()))
  );

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
        mensaje += `IBAN: ES82 0049 4447 38 2010604048\n`;
        mensaje += `Banco: Santander\n`;
        mensaje += `Beneficiario: CD Bustarviejo\n\n`;
        mensaje += `Por favor, accede a la app y registra los pagos.\n\n`;
        mensaje += `Atentamente,\nCD Bustarviejo`;

        // Buscar o crear conversación
        const allConvs = await base44.entities.PrivateConversation.list();
        let conv = allConvs.find(c => 
          c.participante_familia_email === family.email &&
          c.participante_staff_email === 'sistema@cdbustarviejo.com'
        );

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
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: family.email,
          subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
          body: mensaje
        });

        if (family.email_tutor_2) {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: family.email_tutor_2,
            subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
            body: mensaje
          });
        }

        // 🆕 CREAR NOTIFICACIÓN PARA QUE APAREZCA EN CENTRO DE ALERTAS
        const notifMasivo1 = await base44.entities.AppNotification.create({
          usuario_email: family.email,
          titulo: "💳 Recordatorio de Pagos",
          mensaje: `Tienes pagos pendientes por ${family.totalFamilyDue}€. Revisa los detalles en Mensajes del Club.`,
          tipo: "importante",
          icono: "💳",
          enlace: "ParentSystemMessages",
          vista: false
        });
        console.log(`✅ [MASIVO] Notificación creada para ${family.email}:`, notifMasivo1);

        if (family.email_tutor_2) {
          const notifMasivo2 = await base44.entities.AppNotification.create({
            usuario_email: family.email_tutor_2,
            titulo: "💳 Recordatorio de Pagos",
            mensaje: `Tienes pagos pendientes por ${family.totalFamilyDue}€. Revisa los detalles en Mensajes del Club.`,
            tipo: "importante",
            icono: "💳",
            enlace: "ParentSystemMessages",
            vista: false
          });
          console.log(`✅ [MASIVO] Notificación creada para tutor 2 ${family.email_tutor_2}:`, notifMasivo2);
        }

        sent++;
        console.log(`✅ Recordatorio enviado a ${family.email}`);
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

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
      mensaje += `IBAN: ES82 0049 4447 38 2010604048\n`;
      mensaje += `Banco: Santander\n`;
      mensaje += `Beneficiario: CD Bustarviejo\n\n`;
      mensaje += `Por favor, accede a la app y registra los pagos.\n\n`;
      mensaje += `Atentamente,\nCD Bustarviejo`;

      // Buscar o crear conversación
      const allConvs = await base44.entities.PrivateConversation.list();
      let conv = allConvs.find(c => 
        c.participante_familia_email === family.email &&
        c.participante_staff_email === 'sistema@cdbustarviejo.com'
      );

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
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo",
        to: family.email,
        subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
        body: mensaje
      });

      if (family.email_tutor_2) {
        await base44.integrations.Core.SendEmail({
          from_name: "CD Bustarviejo",
          to: family.email_tutor_2,
          subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
          body: mensaje
        });
      }

      // 🆕 CREAR NOTIFICACIÓN PARA QUE APAREZCA EN CENTRO DE ALERTAS
      const notif1 = await base44.entities.AppNotification.create({
        usuario_email: family.email,
        titulo: "💳 Recordatorio de Pagos",
        mensaje: `Tienes pagos pendientes por ${totalRecordatorio}€. Revisa los detalles en Mensajes del Club.`,
        tipo: "importante",
        icono: "💳",
        enlace: "ParentSystemMessages",
        vista: false
      });
      console.log(`✅ [SELECTIVO] Notificación creada para ${family.email}:`, notif1);

      if (family.email_tutor_2) {
        const notif2 = await base44.entities.AppNotification.create({
          usuario_email: family.email_tutor_2,
          titulo: "💳 Recordatorio de Pagos",
          mensaje: `Tienes pagos pendientes por ${totalRecordatorio}€. Revisa los detalles en Mensajes del Club.`,
          tipo: "importante",
          icono: "💳",
          enlace: "ParentSystemMessages",
          vista: false
        });
        console.log(`✅ [SELECTIVO] Notificación creada para tutor 2 ${family.email_tutor_2}:`, notif2);
      }

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
      <div className="p-3 lg:p-8 space-y-4 lg:space-y-6">
        <SocialLinks />

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
        <div>
          <h1 className="text-xl lg:text-3xl font-bold text-slate-900">💳 Recordatorios de Pago</h1>
          <p className="text-xs lg:text-sm text-slate-600 mt-1">Sistema simplificado - Vista por familias</p>
        </div>
        <Button onClick={handleRefresh} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar
        </Button>
      </div>

      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            🤖 Recordatorios Automáticos Activados
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-700">
            El sistema envía recordatorios <strong>automáticamente</strong> por Email + Chat privado "🔔 Mensajes del Club" en estas fechas:
          </p>
          
          <div className="grid md:grid-cols-3 gap-3">
            <div className="bg-white rounded-lg p-3 border-2 border-blue-200">
              <p className="font-bold text-blue-900 text-sm mb-1">📅 Junio (Límite: 30 Jun)</p>
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• 15 Jun - 15 días antes</li>
                <li>• 23 Jun - 7 días antes</li>
                <li>• 2 Jul - 2 días después</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-3 border-2 border-orange-200">
              <p className="font-bold text-orange-900 text-sm mb-1">📅 Septiembre (Límite: 15 Sep)</p>
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• 1 Sep - 14 días antes</li>
                <li>• 8 Sep - 7 días antes</li>
                <li>• 17 Sep - 2 días después</li>
              </ul>
            </div>
            
            <div className="bg-white rounded-lg p-3 border-2 border-red-200">
              <p className="font-bold text-red-900 text-sm mb-1">📅 Diciembre (Límite: 15 Dic)</p>
              <ul className="text-xs text-slate-700 space-y-1">
                <li>• 1 Dic - 14 días antes</li>
                <li>• 8 Dic - 7 días antes</li>
                <li>• 17 Dic - 2 días después</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-green-100 border-2 border-green-300 rounded-lg p-3">
            <p className="text-xs text-green-800">
              ✅ <strong>Solo se envían a familias con pagos pendientes</strong> de ese mes específico
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Alert className="bg-blue-50 border-blue-300">
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
                  const currentSeason = getCurrentSeason();
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
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-red-600">{totalFamilies}</div>
              <p className="text-xs text-slate-600 mt-1">Familias con pagos pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-600">{totalPendingPayments}</div>
              <p className="text-xs text-slate-600 mt-1">Pagos pendientes</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600">{totalPendingAmount.toFixed(0)}€</div>
              <p className="text-xs text-slate-600 mt-1">Total pendiente</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Búsqueda y acciones masivas */}
      <div className="flex flex-col md:flex-row gap-3">
        <Input
          placeholder="Buscar familia o jugador..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1"
        />
        <div className="flex gap-2">
          <Button
            onClick={selectAll}
            variant="outline"
            size="sm"
          >
            <CheckCircle2 className="w-4 h-4 mr-2" />
            {selectedFamilies.length === filteredFamilies.length ? "Deseleccionar" : "Seleccionar"} todas
          </Button>
          <Button
            onClick={sendMassiveReminders}
            disabled={selectedFamilies.length === 0 || sendingMassive}
            className="bg-orange-600 hover:bg-orange-700 active:scale-95 transition-transform"
          >
            {sendingMassive ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enviando...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Enviar Masivo ({selectedFamilies.length})</>
            )}
          </Button>
        </div>
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
            <Card key={family.email} className="hover:shadow-lg transition-shadow">
              <CardHeader className="bg-slate-50 border-b">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 flex-1">
                    <input
                      type="checkbox"
                      checked={selectedFamilies.includes(family.email)}
                      onChange={() => toggleFamily(family.email)}
                      className="w-5 h-5 rounded border-slate-300"
                    />
                    <div className="flex-1">
                      <CardTitle className="text-base">{family.nombre_tutor}</CardTitle>
                      <p className="text-xs text-slate-600">{family.email}</p>
                      {family.telefono && <p className="text-xs text-slate-500">📱 {family.telefono}</p>}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-red-500 text-white mb-1">
                      {family.totalPendingPayments} pendientes
                    </Badge>
                    <p className="text-lg font-bold text-red-600">{family.totalFamilyDue.toFixed(0)}€</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <div className="space-y-3">
                  {family.jugadores.map(jugador => (
                    <div key={jugador.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      {jugador.foto_url ? (
                        <img src={jugador.foto_url} className="w-12 h-12 rounded-full object-cover" alt="" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-orange-500 flex items-center justify-center text-white font-bold">
                          {jugador.nombre.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1">
                        <p className="font-semibold text-slate-900">{jugador.nombre}</p>
                        <p className="text-xs text-slate-600">{jugador.deporte}</p>
                        {jugador.hasPendingPayments && (
                          <div className="mt-2 space-y-1">
                            {jugador.pendingMonths.map(m => (
                              <div key={m.mes} className="flex justify-between text-xs">
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
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-4 pt-4 border-t flex justify-between items-center">
                  <div>
                    <p className="text-sm font-semibold text-slate-700">Total familia:</p>
                    <p className="text-2xl font-bold text-red-600">{family.totalFamilyDue.toFixed(0)}€</p>
                  </div>
                  <div className="flex gap-2">
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
                        mensaje += `IBAN: ES82 0049 4447 38 2010604048\n`;
                        mensaje += `Banco: Santander\n`;
                        mensaje += `Beneficiario: CD Bustarviejo\n\n`;
                        mensaje += `Por favor, accede a la app y registra los pagos.\n\n`;
                        mensaje += `Atentamente,\nCD Bustarviejo`;

                        // Buscar o crear conversación
                        const allConvs = await base44.entities.PrivateConversation.list();
                        let conv = allConvs.find(c => 
                          c.participante_familia_email === family.email &&
                          c.participante_staff_email === 'sistema@cdbustarviejo.com'
                        );

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
                        await base44.integrations.Core.SendEmail({
                          from_name: "CD Bustarviejo",
                          to: family.email,
                          subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
                          body: mensaje
                        });

                        if (family.email_tutor_2) {
                          await base44.integrations.Core.SendEmail({
                            from_name: "CD Bustarviejo",
                            to: family.email_tutor_2,
                            subject: "Recordatorio de Pagos Pendientes - CD Bustarviejo",
                            body: mensaje
                          });
                        }

                        // 🆕 CREAR NOTIFICACIÓN PARA QUE APAREZCA EN CENTRO DE ALERTAS
                        await base44.entities.AppNotification.create({
                          usuario_email: family.email,
                          titulo: "💳 Recordatorio de Pagos",
                          mensaje: `Tienes pagos pendientes por ${family.totalFamilyDue}€. Revisa los detalles en Mensajes del Club.`,
                          tipo: "importante",
                          icono: "💳",
                          enlace: "ParentSystemMessages",
                          vista: false
                        });

                        if (family.email_tutor_2) {
                          await base44.entities.AppNotification.create({
                            usuario_email: family.email_tutor_2,
                            titulo: "💳 Recordatorio de Pagos",
                            mensaje: `Tienes pagos pendientes por ${family.totalFamilyDue}€. Revisa los detalles en Mensajes del Club.`,
                            tipo: "importante",
                            icono: "💳",
                            enlace: "ParentSystemMessages",
                            vista: false
                          });
                        }

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