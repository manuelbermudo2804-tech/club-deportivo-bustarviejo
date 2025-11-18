import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Send, CheckCircle2, Calendar, Mail, Loader2, RefreshCw, AlertCircle, MessageCircle, Zap, FileDown, User } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format, addDays, subDays } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import IndividualReminderDialog from "../components/reminders/IndividualReminderDialog";
import PaymentStatsDashboard from "../components/reminders/PaymentStatsDashboard";

const CLUB_IBAN = "ES82 0049 4447 38 2010604048";
const CLUB_BANK = "Banco Santander";

const generatePaymentReference = (playerName, playerCategory) => {
  if (!playerName || !playerCategory) return "";
  const categoryCode = playerCategory.split(' ')[1] || "CLUB"; // e.g., "Cadete A" -> "A", "Benjamín" -> "CLUB"
  const cleanName = playerName.trim().replace(/\s+/g, '_').toUpperCase();
  return `${categoryCode}-${cleanName}`;
};

const getCurrentSeason = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1;
  return month >= 9 ? `${year}/${year + 1}` : `${year - 1}/${year}`;
};

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const [sendingReminder, setSendingReminder] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedReminder, setSelectedReminder] = useState(null);
  const [selectedPlayer, setSelectedPlayer] = useState(null);

  const { data: reminders, isLoading } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.Reminder.list('-fecha_envio'),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['reminders'] });
    await queryClient.invalidateQueries({ queryKey: ['payments'] });
    await queryClient.invalidateQueries({ queryKey: ['players'] });
    toast.success("Datos actualizados");
    setIsRefreshing(false);
  };

  const handleSendIndividualReminder = async (data) => {
    try {
      const payment = payments.find(p => p.id === data.paymentId);
      const player = players.find(p => p.id === data.playerId);
      
      if (data.method === 'email' || data.method === 'both') {
        if (player.email_padre) {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: player.email_padre,
            subject: `Recordatorio de Pago - ${payment.mes}`,
            body: data.message
          });
        }
        if (player.email_tutor_2) {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: player.email_tutor_2,
            subject: `Recordatorio de Pago - ${payment.mes}`,
            body: data.message
          });
        }
      }
      
      if (data.method === 'chat' || data.method === 'both') {
        await base44.entities.ChatMessage.create({
          remitente_email: "admin@cdbustarviejo.com",
          remitente_nombre: "Administración CD Bustarviejo",
          mensaje: data.message,
          prioridad: "Importante",
          tipo: "admin_a_grupo",
          deporte: player.deporte,
          grupo_id: player.deporte,
          leido: false
        });
      }
      
      toast.success("✅ Recordatorio enviado correctamente");
    } catch (error) {
      console.error("Error sending individual reminder:", error);
      throw error;
    }
  };

  const exportPaymentsPDF = () => {
    const pendingPayments = payments.filter(p => p.estado !== "Pagado");
    const dataByPlayer = {};
    
    pendingPayments.forEach(payment => {
      if (!dataByPlayer[payment.jugador_id]) {
        const player = players.find(p => p.id === payment.jugador_id);
        dataByPlayer[payment.jugador_id] = {
          nombre: payment.jugador_nombre,
          deporte: player?.deporte,
          email: player?.email_padre,
          pagos: []
        };
      }
      dataByPlayer[payment.jugador_id].pagos.push(payment);
    });
    
    const csvContent = [
      ['Jugador', 'Categoría', 'Email', 'Periodo', 'Cantidad', 'Estado', 'Vencimiento'].join(','),
      ...Object.values(dataByPlayer).flatMap(player => 
        player.pagos.map(pago => 
          [
            player.nombre,
            player.deporte || '',
            player.email || '',
            pago.mes,
            `${pago.cantidad}€`,
            pago.estado,
            `30 de ${pago.mes}`
          ].join(',')
        )
      )
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pagos_pendientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    
    toast.success("📄 Reporte exportado correctamente");
  };

  // Generar recordatorios escalonados automáticamente
  const generateStaggeredReminders = async () => {
    setIsGenerating(true);
    
    try {
      const pendingPayments = payments.filter(p => p.estado === "Pendiente");
      let created = 0;
      
      for (const payment of pendingPayments) {
        const player = players.find(pl => pl.id === payment.jugador_id);
        if (!player?.email_padre) continue;
        
        // Calcular fecha límite según el mes
        const monthMap = { "Junio": 6, "Septiembre": 9, "Diciembre": 12 };
        const limitDate = new Date(2025, monthMap[payment.mes] - 1, 15);
        
        // Definir fechas de recordatorio
        const reminderDates = [
          { date: subDays(limitDate, 15), type: "15 días antes" },
          { date: subDays(limitDate, 7), type: "7 días antes" },
          { date: subDays(limitDate, 3), type: "3 días antes" },
          { date: addDays(limitDate, 1), type: "1 día después" }
        ];
        
        for (const reminder of reminderDates) {
          // Verificar si ya existe este recordatorio
          const exists = reminders.find(r => 
            r.pago_id === payment.id && 
            r.tipo_recordatorio === reminder.type
          );
          
          if (!exists) {
            await base44.entities.Reminder.create({
              pago_id: payment.id,
              jugador_id: payment.jugador_id,
              jugador_nombre: payment.jugador_nombre,
              email_padre: player.email_padre,
              tipo_recordatorio: reminder.type,
              fecha_envio: format(reminder.date, 'yyyy-MM-dd'),
              enviado: false,
              enviado_chat: false,
              mes_pago: payment.mes,
              temporada: payment.temporada,
              cantidad: payment.cantidad
            });
            created++;
          }
        }
      }
      
      await queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success(`✅ ${created} recordatorios generados automáticamente`);
    } catch (error) {
      console.error("Error generating reminders:", error);
      toast.error("Error al generar recordatorios");
    }
    
    setIsGenerating(false);
  };

  const sendReminderEmail = async (reminder) => {
    if (!reminder.email_padre) {
      toast.error("No hay email configurado para este jugador");
      return;
    }

    setSendingReminder(reminder.id);

    try {
      const payment = payments.find(p => p.id === reminder.pago_id);
      if (payment && payment.estado === "Pagado") {
        toast.info("Este pago ya está marcado como pagado");
        setSendingReminder(null);
        return;
      }

      const player = players.find(p => p.id === reminder.jugador_id);
      const reference = generatePaymentReference(reminder.jugador_nombre, player?.deporte);
      const hasJustificante = payment?.justificante_url;
      
      // Determinar nivel de urgencia de forma profesional
      const urgencyText = {
        "15 días antes": "Recordatorio",
        "7 días antes": "Recordatorio importante",
        "3 días antes": "Recordatorio urgente",
        "1 día después": "Pago vencido - Accion requerida"
      };

      const daysText = {
        "15 días antes": "15 días",
        "7 días antes": "7 días",
        "3 días antes": "3 días",
        "1 día después": "Fecha límite superada"
      };

      const subject = hasJustificante 
        ? `${urgencyText[reminder.tipo_recordatorio]} - Pago en revisión - CF Bustarviejo`
        : `${urgencyText[reminder.tipo_recordatorio]} de pago - CF Bustarviejo`;

      const body = hasJustificante ? `
Estimada familia de ${reminder.jugador_nombre},

Le informamos que su pago correspondiente al mes de ${reminder.mes_pago} se encuentra en estado de revisión.

Hemos recibido correctamente su justificante de pago y nuestro equipo administrativo está procediendo con su verificación. Le confirmaremos la validación del pago en breve.

Detalles del pago:
════════════════════════════════════════
Jugador: ${reminder.jugador_nombre}
Mes: ${reminder.mes_pago}
Temporada: ${reminder.temporada}
Importe: ${reminder.cantidad} euros
Estado actual: En revisión
Fecha límite: 15 de ${reminder.mes_pago}
${reminder.tipo_recordatorio !== "1 día después" ? `Tiempo restante: ${daysText[reminder.tipo_recordatorio]}` : 'Estado: Fecha límite superada'}
════════════════════════════════════════

Si tiene alguna consulta sobre el estado de su pago, no dude en contactar con nosotros a través de los medios indicados al final de este mensaje.

Agradecemos su colaboración.


Atentamente,

Club de Fútbol Bustarviejo
Equipo de Administración

════════════════════════════════════════
Datos de contacto:
════════════════════════════════════════
Email: C.D.BUSTARVIEJO@HOTMAIL.ES
Email alternativo: CDBUSTARVIEJO@GMAIL.COM
Ubicación: Bustarviejo, Madrid

Temporada ${reminder.temporada}
      ` : `
Estimada familia de ${reminder.jugador_nombre},

Le recordamos que tiene pendiente el pago de la inscripción correspondiente al mes de ${reminder.mes_pago}.

Detalles del pago:
════════════════════════════════════════
Jugador: ${reminder.jugador_nombre}
Mes: ${reminder.mes_pago}
Temporada: ${reminder.temporada}
Importe: ${reminder.cantidad} euros
Fecha límite: 15 de ${reminder.mes_pago}
${reminder.tipo_recordatorio !== "1 día después" ? `Tiempo restante: ${daysText[reminder.tipo_recordatorio]}` : 'Estado: Fecha límite superada'}
Estado: Pendiente de pago
════════════════════════════════════════

Datos bancarios para realizar el pago:
────────────────────────────────────────
IBAN: ${CLUB_IBAN}
Banco: ${CLUB_BANK}
Beneficiario: CD Bustarviejo
Concepto (IMPORTANTE): ${reference}
Importe: ${reminder.cantidad} euros

⚠️ Es fundamental que indique el concepto exacto en la transferencia para poder identificar su pago correctamente.
────────────────────────────────────────

Instrucciones para completar el pago:
────────────────────────────────────────
1. Realice la transferencia bancaria con los datos indicados arriba
2. Acceda a la aplicación del club
3. Navegue a la sección "Mis Pagos"
4. Localice el pago correspondiente a ${reminder.mes_pago}
5. Suba el justificante de pago (foto o PDF del comprobante)

Es importante completar ambos pasos (pago y justificante) para que podamos procesar correctamente su inscripción.


Atentamente,

Club de Fútbol Bustarviejo
Equipo de Administración

════════════════════════════════════════
Datos de contacto:
════════════════════════════════════════
Email: C.D.BUSTARVIEJO@HOTMAIL.ES
Email alternativo: CDBUSTARVIEJO@GMAIL.COM
Ubicación: Bustarviejo, Madrid

Temporada ${reminder.temporada}
      `;

      await base44.integrations.Core.SendEmail({
        from_name: "CF Bustarviejo",
        to: reminder.email_padre,
        subject: subject,
        body: body
      });

      await base44.entities.Reminder.update(reminder.id, {
        ...reminder,
        enviado: true,
        fecha_enviado: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success(`✅ Recordatorio enviado con datos bancarios`);
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Error al enviar el recordatorio");
    }

    setSendingReminder(null);
  };

  const sendChatReminder = async (reminder) => {
    try {
      const player = players.find(p => p.id === reminder.jugador_id);
      if (!player?.deporte) {
        toast.error("No se pudo identificar el grupo del jugador");
        return;
      }

      const payment = payments.find(p => p.id === reminder.pago_id);
      const hasJustificante = payment?.justificante_url;

      const urgencyEmoji = {
        "15 días antes": "📅",
        "7 días antes": "⚠️",
        "3 días antes": "🔴",
        "1 día después": "🚨"
      };

      const mensaje = hasJustificante ? 
        `${urgencyEmoji[reminder.tipo_recordatorio]} RECORDATORIO DE PAGO - ${reminder.mes_pago}\n\nFamilia de ${reminder.jugador_nombre}: Su justificante está en revisión. Pronto confirmaremos su pago.\n\nFecha límite: 15 de ${reminder.mes_pago}` :
        `${urgencyEmoji[reminder.tipo_recordatorio]} RECORDATORIO DE PAGO - ${reminder.mes_pago}\n\nFamilia de ${reminder.jugador_nombre}: Recuerde realizar el pago de ${reminder.cantidad}€ y subir el justificante en la app.\n\nFecha límite: 15 de ${reminder.mes_pago}\n\nApp → Mis Pagos → ${reminder.mes_pago}`;

      await base44.entities.ChatMessage.create({
        remitente_email: "admin@cdbustarviejo.com",
        remitente_nombre: "Administración CF Bustarviejo",
        mensaje: mensaje,
        prioridad: reminder.tipo_recordatorio === "3 días antes" || reminder.tipo_recordatorio === "1 día después" ? "Urgente" : "Importante",
        tipo: "admin_a_grupo",
        deporte: player.deporte,
        categoria: "",
        grupo_id: player.deporte,
        leido: false,
        archivos_adjuntos: []
      });

      await base44.entities.Reminder.update(reminder.id, {
        ...reminder,
        enviado_chat: true,
        fecha_enviado_chat: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success("💬 Mensaje enviado al chat del grupo");
    } catch (error) {
      console.error("Error sending chat reminder:", error);
      toast.error("Error al enviar mensaje al chat");
    }
  };

  const sendTodayReminders = async () => {
    const today = new Date().toISOString().split('T')[0];
    const todayReminders = reminders.filter(r => 
      r.fecha_envio === today && 
      !r.enviado &&
      r.email_padre
    );

    if (todayReminders.length === 0) {
      toast.info("No hay recordatorios programados para hoy");
      return;
    }

    toast.info(`📤 Enviando ${todayReminders.length} recordatorios...`);

    for (const reminder of todayReminders) {
      await sendReminderEmail(reminder);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Enviar al chat si es 7 días antes o menos
      if (["7 días antes", "3 días antes", "1 día después"].includes(reminder.tipo_recordatorio) && !reminder.enviado_chat) {
        await sendChatReminder(reminder);
        await new Promise(resolve => setTimeout(resolve, 300));
      }
    }

    toast.success("✅ Todos los recordatorios de hoy han sido enviados");
  };

  const paymentsWithoutJustificante = reminders.filter(r => {
    const payment = payments.find(p => p.id === r.pago_id);
    return !payment?.justificante_url && payment?.estado !== "Pagado";
  }).length;

  const paymentsInReview = reminders.filter(r => {
    const payment = payments.find(p => p.id === r.pago_id);
    return payment?.estado === "En revisión";
  }).length;

  const paidPayments = reminders.filter(r => {
    const payment = payments.find(p => p.id === r.pago_id);
    return payment?.estado === "Pagado";
  }).length;

  const todayDate = new Date().toISOString().split('T')[0];
  const dueToday = reminders.filter(r => r.fecha_envio === todayDate && !r.enviado).length;

  const statusEmojis = {
    "Pagado": "🟢",
    "En revisión": "🟠",
    "Pendiente": "🔴"
  };

  const typeColors = {
    "15 días antes": "bg-blue-100 text-blue-700",
    "7 días antes": "bg-orange-100 text-orange-700",
    "3 días antes": "bg-red-100 text-red-700",
    "1 día después": "bg-purple-100 text-purple-700",
    "Manual": "bg-slate-100 text-slate-700"
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <IndividualReminderDialog
        isOpen={!!selectedReminder}
        onClose={() => {
          setSelectedReminder(null);
          setSelectedPlayer(null);
        }}
        payment={selectedReminder}
        player={selectedPlayer}
        onSend={handleSendIndividualReminder}
      />
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Recordatorios de Pago</h1>
          <p className="text-slate-600 mt-1">Sistema automático con datos bancarios incluidos</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Button
            onClick={exportPaymentsPDF}
            variant="outline"
            className="shadow-lg"
          >
            <FileDown className="w-5 h-5 mr-2" />
            Exportar CSV
          </Button>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="shadow-lg"
          >
            <RefreshCw className={`w-5 h-5 mr-2 ${isRefreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button
            onClick={generateStaggeredReminders}
            disabled={isGenerating}
            className="bg-green-600 hover:bg-green-700 shadow-lg"
          >
            <Zap className={`w-5 h-5 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
            Generar Automáticos
          </Button>
          <Button
            onClick={sendTodayReminders}
            disabled={dueToday === 0}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          >
            <Send className="w-5 h-5 mr-2" />
            Enviar de Hoy ({dueToday})
          </Button>
        </div>
      </div>

      {/* Statistics Dashboard */}
      <PaymentStatsDashboard 
        payments={payments} 
        players={players} 
        currentSeason={getCurrentSeason()} 
      />

      {/* Información del Sistema Automático */}
      <Card className="border-2 border-blue-300 shadow-lg bg-gradient-to-br from-blue-50 to-blue-100">
        <CardHeader className="border-b border-blue-200">
          <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            📅 Calendario de Recordatorios Automáticos
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-4 space-y-4">
          <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
            <p className="font-bold text-blue-900 mb-3">📌 Fechas de Vencimiento por Periodo:</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
              <div className="bg-blue-50 rounded p-3">
                <p className="font-bold text-blue-800">Junio</p>
                <p className="text-blue-600">Vence: 30 de Junio</p>
              </div>
              <div className="bg-blue-50 rounded p-3">
                <p className="font-bold text-blue-800">Septiembre</p>
                <p className="text-blue-600">Vence: 15 de Septiembre</p>
              </div>
              <div className="bg-blue-50 rounded p-3">
                <p className="font-bold text-blue-800">Diciembre</p>
                <p className="text-blue-600">Vence: 15 de Diciembre</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border-2 border-green-200">
            <p className="font-bold text-green-900 mb-3">🔔 Recordatorios que se Generan Automáticamente:</p>
            <div className="space-y-2 text-sm">
              <div className="flex items-start gap-3 p-2 bg-blue-50 rounded">
                <span className="text-lg">📅</span>
                <div>
                  <p className="font-semibold text-blue-900">15 días antes del vencimiento</p>
                  <p className="text-blue-700">• Email automático con datos bancarios</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 bg-orange-50 rounded">
                <span className="text-lg">⚠️</span>
                <div>
                  <p className="font-semibold text-orange-900">7 días antes del vencimiento</p>
                  <p className="text-orange-700">• Email con datos bancarios</p>
                  <p className="text-orange-700">• Mensaje al chat del grupo</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 bg-red-50 rounded">
                <span className="text-lg">🔴</span>
                <div>
                  <p className="font-semibold text-red-900">3 días antes del vencimiento</p>
                  <p className="text-red-700">• Email urgente con datos bancarios</p>
                  <p className="text-red-700">• Mensaje urgente al chat del grupo</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-2 bg-purple-50 rounded">
                <span className="text-lg">🚨</span>
                <div>
                  <p className="font-semibold text-purple-900">1 día después del vencimiento</p>
                  <p className="text-purple-700">• Email de pago vencido</p>
                  <p className="text-purple-700">• Mensaje al chat del grupo</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4 border-2 border-orange-300">
            <p className="font-bold text-orange-900 mb-2">💡 Cómo Funciona:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-orange-800">
              <li>Haz clic en "Generar Automáticos" para crear todos los recordatorios</li>
              <li>El sistema programa 4 recordatorios por cada pago pendiente</li>
              <li>Los recordatorios se envían automáticamente en sus fechas programadas</li>
              <li>También puedes enviar recordatorios manuales desde la tabla</li>
              <li>Todos los emails incluyen IBAN, concepto de pago e instrucciones</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Sin Justificante
              </CardTitle>
              <div className="p-2 rounded-xl bg-red-500 bg-opacity-10">
                <Bell className="w-5 h-5 text-red-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {paymentsWithoutJustificante}
            </div>
            <p className="text-xs text-slate-500 mt-1">🔴 Urgente - Sin justificante cargado</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                En Revisión
              </CardTitle>
              <div className="p-2 rounded-xl bg-orange-500 bg-opacity-10">
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {paymentsInReview}
            </div>
            <p className="text-xs text-slate-500 mt-1">🟠 Justificante recibido, pendiente verificar</p>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Pagados Confirmados
              </CardTitle>
              <div className="p-2 rounded-xl bg-green-500 bg-opacity-10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {paidPayments}
            </div>
            <p className="text-xs text-slate-500 mt-1">🟢 Pagos verificados y confirmados</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-none shadow-lg bg-white">
        <CardHeader className="border-b border-slate-100">
          <CardTitle className="text-xl">Todos los Recordatorios</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : reminders.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500 text-lg mb-2">No hay recordatorios registrados</p>
              <p className="text-slate-400 text-sm mb-4">Haz clic en "Generar Automáticos" para crearlos</p>
              <Button onClick={generateStaggeredReminders} disabled={isGenerating}>
                <Zap className="w-4 h-4 mr-2" />
                Generar Recordatorios
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Fecha Envío</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Justificante</TableHead>
                    <TableHead>Estado Pago</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Chat</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminders.map((reminder) => {
                    const payment = payments.find(p => p.id === reminder.pago_id);
                    const isPaid = payment?.estado === "Pagado";
                    const hasJustificante = payment?.justificante_url;

                    return (
                      <TableRow key={reminder.id} className={`hover:bg-slate-50 ${isPaid ? 'opacity-60' : ''}`}>
                        <TableCell className="font-medium">{reminder.jugador_nombre}</TableCell>
                        <TableCell>
                          <Badge className={typeColors[reminder.tipo_recordatorio]}>
                            {reminder.tipo_recordatorio}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {reminder.mes_pago} - {reminder.cantidad}€
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(reminder.fecha_envio + 'T00:00:00'), 'dd MMM', { locale: es })}
                        </TableCell>
                        <TableCell>
                          {reminder.email_padre ? (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[120px]">{reminder.email_padre}</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Sin email</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {hasJustificante ? (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              ✅ Subido
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700 text-xs">
                              ❌ Sin subir
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {payment ? (
                            <Badge className={
                              payment.estado === "Pagado" ? "bg-green-100 text-green-700" :
                              payment.estado === "En revisión" ? "bg-orange-100 text-orange-700" :
                              "bg-red-100 text-red-700"
                            }>
                              <span className="mr-1">{statusEmojis[payment.estado]}</span>
                              {payment.estado}
                            </Badge>
                          ) : (
                            <Badge className="bg-red-100 text-red-700">
                              <span className="mr-1">🔴</span>
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {reminder.enviado ? (
                            <Badge className="bg-green-100 text-green-700 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Enviado
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-100 text-slate-700 text-xs">
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {reminder.enviado_chat ? (
                            <Badge className="bg-blue-100 text-blue-700 text-xs">
                              <MessageCircle className="w-3 h-3 mr-1" />
                              Enviado
                            </Badge>
                          ) : ["7 días antes", "3 días antes", "1 día después"].includes(reminder.tipo_recordatorio) ? (
                            <Badge className="bg-slate-100 text-slate-700 text-xs">
                              Pendiente
                            </Badge>
                          ) : (
                            <span className="text-xs text-slate-400">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-1 justify-end">
                            {!isPaid && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setSelectedReminder(payment);
                                  setSelectedPlayer(players.find(p => p.id === reminder.jugador_id));
                                }}
                                title="Enviar recordatorio personalizado"
                              >
                                <User className="w-4 h-4 text-purple-600" />
                              </Button>
                            )}
                            {!reminder.enviado && !isPaid && reminder.email_padre && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendReminderEmail(reminder)}
                                disabled={sendingReminder === reminder.id}
                                title="Enviar email con datos bancarios"
                              >
                                {sendingReminder === reminder.id ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Mail className="w-4 h-4 text-orange-600" />
                                )}
                              </Button>
                            )}
                            {!reminder.enviado_chat && !isPaid && ["7 días antes", "3 días antes", "1 día después"].includes(reminder.tipo_recordatorio) && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => sendChatReminder(reminder)}
                                title="Enviar al chat del grupo"
                              >
                                <MessageCircle className="w-4 h-4 text-blue-600" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}