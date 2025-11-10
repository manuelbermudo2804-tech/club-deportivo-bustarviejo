import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Bell, Send, CheckCircle2, Calendar, Mail, Loader2 } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

export default function RemindersPage() {
  const queryClient = useQueryClient();
  const [sendingReminder, setSendingReminder] = useState(null);

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

      const subject = `Recordatorio de Pago - CF Bustarviejo - ${reminder.mes_pago}`;
      const body = `
Estimada familia de ${reminder.jugador_nombre},

Le recordamos que tiene pendiente el pago correspondiente a:

• Mes: ${reminder.mes_pago}
• Temporada: ${reminder.temporada}
• Cantidad: ${reminder.cantidad}€
• Vencimiento: Día 30 de ${reminder.mes_pago}

Puede realizar el pago mediante:
- Bizum al número del club
- Transferencia bancaria a nuestra cuenta

Por favor, no olvide subir el justificante de pago en la aplicación.

Gracias por su colaboración.

Atentamente,
CF Bustarviejo
      `;

      await base44.integrations.Core.SendEmail({
        from_name: "CF Bustarviejo",
        to: reminder.email_padre,
        subject: subject,
        body: body
      });

      // Marcar recordatorio como enviado
      await base44.entities.Reminder.update(reminder.id, {
        ...reminder,
        enviado: true,
        fecha_enviado: new Date().toISOString()
      });

      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success("Recordatorio enviado correctamente");
    } catch (error) {
      console.error("Error sending reminder:", error);
      toast.error("Error al enviar el recordatorio");
    }

    setSendingReminder(null);
  };

  const sendAllPending = async () => {
    const today = new Date().toISOString().split('T')[0];
    const pendingReminders = reminders.filter(r => 
      !r.enviado && 
      r.fecha_envio <= today &&
      r.email_padre
    );

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

  const pendingCount = reminders.filter(r => !r.enviado).length;
  const todayDate = new Date().toISOString().split('T')[0];
  const dueToday = reminders.filter(r => !r.enviado && r.fecha_envio <= todayDate).length;

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Recordatorios de Pago</h1>
          <p className="text-slate-600 mt-1">Gestión automática de notificaciones</p>
        </div>
        <Button
          onClick={sendAllPending}
          disabled={dueToday === 0}
          className="bg-orange-600 hover:bg-orange-700 shadow-lg"
        >
          <Send className="w-5 h-5 mr-2" />
          Enviar Pendientes ({dueToday})
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Recordatorios Pendientes
              </CardTitle>
              <div className="p-2 rounded-xl bg-amber-500 bg-opacity-10">
                <Bell className="w-5 h-5 text-amber-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {pendingCount}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Para Enviar Hoy
              </CardTitle>
              <div className="p-2 rounded-xl bg-orange-500 bg-opacity-10">
                <Calendar className="w-5 h-5 text-orange-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {dueToday}
            </div>
          </CardContent>
        </Card>

        <Card className="border-none shadow-lg bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-slate-600">
                Enviados
              </CardTitle>
              <div className="p-2 rounded-xl bg-green-500 bg-opacity-10">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900">
              {reminders.filter(r => r.enviado).length}
            </div>
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
              <p className="text-slate-500">No hay recordatorios registrados</p>
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
                    <TableHead>Estado Pago</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reminders.map((reminder) => {
                    const payment = payments.find(p => p.id === reminder.pago_id);
                    const isPaid = payment?.estado === "Pagado";
                    const isPast = reminder.fecha_envio < todayDate;

                    return (
                      <TableRow key={reminder.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">{reminder.jugador_nombre}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-xs">
                            {reminder.tipo_recordatorio}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {reminder.mes_pago} - {reminder.cantidad}€
                        </TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(reminder.fecha_envio + 'T00:00:00'), 'dd MMM yyyy', { locale: es })}
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
                          {isPaid ? (
                            <Badge className="bg-green-100 text-green-700">
                              Pagado
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-100 text-amber-700">
                              Pendiente
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {reminder.enviado ? (
                            <Badge className="bg-green-100 text-green-700">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Enviado
                            </Badge>
                          ) : isPast ? (
                            <Badge className="bg-red-100 text-red-700">
                              Atrasado
                            </Badge>
                          ) : (
                            <Badge className="bg-blue-100 text-blue-700">
                              Programado
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {!reminder.enviado && !isPaid && reminder.email_padre && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => sendReminderEmail(reminder)}
                              disabled={sendingReminder === reminder.id}
                            >
                              {sendingReminder === reminder.id ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                              ) : (
                                <Send className="w-4 h-4" />
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