import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Send, CheckCircle2, Calendar, Mail, Loader2, RefreshCw, AlertCircle } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const [sendingReminder, setSendingReminder] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

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

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['reminders'] });
    await queryClient.invalidateQueries({ queryKey: ['payments'] });
    toast.success("Datos actualizados");
    setIsRefreshing(false);
  };

  const sendReminderEmail = async (reminder) => {
    if (!reminder.email_padre) {
      toast.error("No hay email configurado para este jugador");
      return;
    }

    setSendingReminder(reminder.id);

    try {
      // Verificar estado del pago
      const payment = payments.find(p => p.id === reminder.pago_id);
      if (payment && payment.estado === "Pagado") {
        toast.info("Este pago ya está marcado como pagado");
        setSendingReminder(null);
        return;
      }

      // Verificar si tiene justificante subido
      const hasJustificante = payment?.justificante_url;

      const subject = hasJustificante 
        ? `⚠️ URGENTE: Pago en Revisión - CF Bustarviejo - ${reminder.mes_pago}`
        : `🔴 RECORDATORIO URGENTE: Pago Pendiente - CF Bustarviejo - ${reminder.mes_pago}`;

      const body = hasJustificante ? `
Estimada familia de ${reminder.jugador_nombre},

⚠️ RECORDATORIO IMPORTANTE ⚠️

Su pago correspondiente a ${reminder.mes_pago} está EN REVISIÓN.
Hemos recibido su justificante pero aún está pendiente de verificación.

• Jugador: ${reminder.jugador_nombre}
• Mes: ${reminder.mes_pago}
• Temporada: ${reminder.temporada}
• Cantidad: ${reminder.cantidad}€
• Estado: En Revisión
• Fecha límite: 15 de ${reminder.mes_pago}

Si tiene alguna duda sobre el estado de su pago, por favor contacte con nosotros.

Gracias por su colaboración.

Atentamente,
CF Bustarviejo
📧 C.D.BUSTARVIEJO@HOTMAIL.ES | CDBUSTARVIEJO@GMAIL.COM
      ` : `
Estimada familia de ${reminder.jugador_nombre},

🔴 RECORDATORIO URGENTE 🔴

Le recordamos que tiene pendiente el pago correspondiente a:

• Jugador: ${reminder.jugador_nombre}
• Mes: ${reminder.mes_pago}
• Temporada: ${reminder.temporada}
• Cantidad: ${reminder.cantidad}€
• FECHA LÍMITE: 15 de ${reminder.mes_pago}
• Estado: PENDIENTE - Sin justificante cargado

⚠️ Es importante que realice el pago Y suba el justificante en la aplicación lo antes posible.

Puede realizar el pago mediante:
- Transferencia bancaria a nuestra cuenta

⚡ IMPORTANTE: Debe subir el justificante de pago en la aplicación para que podamos verificarlo.

Acceda a la app → Mis Pagos → Busque el pago de ${reminder.mes_pago} → Suba el justificante

Gracias por su colaboración.

Atentamente,
CF Bustarviejo
📧 C.D.BUSTARVIEJO@HOTMAIL.ES | CDBUSTARVIEJO@GMAIL.COM
      `;

      await base44.integrations.Core.SendEmail({
        from_name: "CF Bustarviejo",
        to: reminder.email_padre,
        subject: subject,
        body: body
      });

      // Incrementar número de envíos y actualizar última fecha
      const numeroEnvio = (reminder.numero_envio || 0) + 1;
      await base44.entities.Reminder.update(reminder.id, {
        ...reminder,
        numero_envio: numeroEnvio,
        ultimo_envio: new Date().toISOString(),
        enviado: true,
        fecha_enviado: reminder.fecha_enviado || new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success(`Recordatorio enviado (envío #${numeroEnvio})`);
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Error al enviar el recordatorio");
    }

    setSendingReminder(null);
  };

  const sendAllPending = async () => {
    const today = new Date().toISOString().split('T')[0];
    
    // Enviar a todos los que NO tienen justificante o están en revisión
    const pendingReminders = reminders.filter(r => {
      const payment = payments.find(p => p.id === r.pago_id);
      const isPendingOrInReview = !payment || payment.estado !== "Pagado";
      return r.email_padre && isPendingOrInReview;
    });

    if (pendingReminders.length === 0) {
      toast.info("No hay recordatorios pendientes para enviar");
      return;
    }

    toast.info(`Enviando ${pendingReminders.length} recordatorios...`);

    for (const reminder of pendingReminders) {
      await sendReminderEmail(reminder);
      // Pequeña pausa entre envíos
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    toast.success("Todos los recordatorios han sido enviados");
  };

  // Calcular estadísticas considerando el justificante
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

  const statusEmojis = {
    "Pagado": "🟢",
    "En revisión": "🟠",
    "Pendiente": "🔴"
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Recordatorios de Pago</h1>
          <p className="text-slate-600 mt-1">Sistema de notificaciones automáticas y manuales</p>
        </div>
        <div className="flex gap-3">
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
            onClick={sendAllPending}
            disabled={paymentsWithoutJustificante + paymentsInReview === 0}
            className="bg-orange-600 hover:bg-orange-700 shadow-lg"
          >
            <Send className="w-5 h-5 mr-2" />
            Enviar a Todos Pendientes
          </Button>
        </div>
      </div>

      {/* Alerta de Información */}
      <Alert className="bg-blue-50 border-blue-300 border-2">
        <AlertCircle className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>📅 Fechas Límite de Pago: Día 15 de cada mes</strong>
          <div className="mt-2 space-y-1 text-sm">
            <p>• <strong>Junio:</strong> Primer pago (pago único o 1er plazo) - Límite: 15 de Junio</p>
            <p>• <strong>Septiembre:</strong> Segundo pago (solo 3 meses) - Límite: 15 de Septiembre</p>
            <p>• <strong>Diciembre:</strong> Tercer pago (solo 3 meses) - Límite: 15 de Diciembre</p>
          </div>
          <p className="mt-3 text-sm">
            💡 <strong>Los recordatorios se pueden enviar TODOS LOS DÍAS</strong> hasta que el padre/tutor suba el justificante de pago.
          </p>
        </AlertDescription>
      </Alert>

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
              <p className="text-slate-400 text-sm">Los recordatorios se generan automáticamente con los pagos</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Jugador</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Fecha Límite</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Justificante</TableHead>
                    <TableHead>Estado Pago</TableHead>
                    <TableHead>Envíos</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminders.map((reminder) => {
                    const payment = payments.find(p => p.id === reminder.pago_id);
                    const isPaid = payment?.estado === "Pagado";
                    const hasJustificante = payment?.justificante_url;
                    const isOverdue = new Date() > new Date(`2025-${reminder.mes_pago === 'Junio' ? '06' : reminder.mes_pago === 'Septiembre' ? '09' : '12'}-15`);

                    return (
                      <TableRow key={reminder.id} className={`hover:bg-slate-50 ${isPaid ? 'opacity-60' : ''}`}>
                        <TableCell className="font-medium">{reminder.jugador_nombre}</TableCell>
                        <TableCell className="text-sm">
                          {reminder.mes_pago} - {reminder.cantidad}€
                        </TableCell>
                        <TableCell className="text-sm">
                          <div className="flex items-center gap-1">
                            <span>15 de {reminder.mes_pago}</span>
                            {isOverdue && !isPaid && (
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                Vencido
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {reminder.email_padre ? (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <Mail className="w-3 h-3" />
                              <span className="truncate max-w-[150px]">{reminder.email_padre}</span>
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
                          <div className="text-sm">
                            {reminder.numero_envio ? (
                              <div>
                                <Badge variant="outline" className="text-xs">
                                  {reminder.numero_envio} {reminder.numero_envio === 1 ? 'envío' : 'envíos'}
                                </Badge>
                                {reminder.ultimo_envio && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    Último: {format(new Date(reminder.ultimo_envio), 'dd/MM', { locale: es })}
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">Sin envíos</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {!isPaid && reminder.email_padre && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendReminderEmail(reminder)}
                              disabled={sendingReminder === reminder.id}
                              title={hasJustificante ? "Enviar recordatorio (justificante en revisión)" : "Enviar recordatorio urgente (sin justificante)"}
                            >
                              {sendingReminder === reminder.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className={`w-4 h-4 ${!hasJustificante ? 'text-red-600' : 'text-orange-600'}`} />
                              )}
                            </Button>
                          )}
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