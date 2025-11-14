import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Check, X, AlertCircle, Calendar, CreditCard, MessageCircle, Users } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NotificationCenter() {
  const [user, setUser] = useState(null);
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  const { data: messages } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date'),
    initialData: [],
  });

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-fecha_publicacion'),
    initialData: [],
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    initialData: [],
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  const markMessageAsReadMutation = useMutation({
    mutationFn: ({ id, message }) => base44.entities.ChatMessage.update(id, { ...message, leido: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
    },
  });

  const myPlayers = user ? players.filter(p => 
    p.email_padre === user.email || p.email_tutor_2 === user.email
  ) : [];

  const myGroupSports = [...new Set(myPlayers.map(p => p.deporte))];

  // Filter notifications
  const unreadMessages = messages.filter(m => 
    !m.leido && m.tipo === "admin_a_grupo" && myGroupSports.includes(m.grupo_id || m.deporte)
  );

  const today = new Date().toISOString().split('T')[0];
  const pendingCallups = callups.filter(c => {
    if (!c.publicada || c.fecha_partido < today || c.cerrada) return false;
    return c.jugadores_convocados?.some(j => {
      const isMyPlayer = myPlayers.some(p => p.id === j.jugador_id);
      return isMyPlayer && j.confirmacion === "pendiente";
    });
  });

  const recentAnnouncements = announcements.filter(a => {
    if (!a.publicado) return false;
    const daysAgo = Math.floor((new Date() - new Date(a.fecha_publicacion)) / (1000 * 60 * 60 * 24));
    return daysAgo <= 7;
  }).slice(0, 10);

  const pendingPayments = payments.filter(p => 
    myPlayers.some(player => player.id === p.jugador_id) && p.estado === "Pendiente"
  );

  const totalNotifications = unreadMessages.length + pendingCallups.length + pendingPayments.length;

  const getNotificationIcon = (type) => {
    switch(type) {
      case "message": return MessageCircle;
      case "callup": return Bell;
      case "announcement": return AlertCircle;
      case "payment": return CreditCard;
      default: return Bell;
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === "Urgente") return "text-red-600";
    switch(type) {
      case "message": return "text-blue-600";
      case "callup": return "text-orange-600";
      case "announcement": return "text-purple-600";
      case "payment": return "text-green-600";
      default: return "text-slate-600";
    }
  };

  const handleMarkAsRead = (message) => {
    markMessageAsReadMutation.mutate({ id: message.id, message });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {totalNotifications > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs">
              {totalNotifications > 9 ? "9+" : totalNotifications}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-600" />
            Centro de Notificaciones
            {totalNotifications > 0 && (
              <Badge className="bg-red-500 text-white">{totalNotifications}</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="all" className="flex-1">
              Todas ({totalNotifications})
            </TabsTrigger>
            <TabsTrigger value="messages" className="flex-1">
              Mensajes ({unreadMessages.length})
            </TabsTrigger>
            <TabsTrigger value="callups" className="flex-1">
              Convocatorias ({pendingCallups.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex-1">
              Pagos ({pendingPayments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-4">
            {/* Unread Messages */}
            {unreadMessages.map(msg => {
              const Icon = getNotificationIcon("message");
              return (
                <div key={msg.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors">
                  <Icon className={`w-5 h-5 ${getNotificationColor("message", msg.prioridad)} mt-1`} />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-sm font-semibold text-slate-900">{msg.remitente_nombre}</p>
                      {msg.prioridad === "Urgente" && (
                        <Badge className="bg-red-500 text-white text-xs">Urgente</Badge>
                      )}
                    </div>
                    <p className="text-sm text-slate-700">{msg.mensaje.substring(0, 100)}...</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(msg.created_date), "dd MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleMarkAsRead(msg)}
                  >
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              );
            })}

            {/* Pending Callups */}
            {pendingCallups.map(callup => {
              const Icon = getNotificationIcon("callup");
              return (
                <Link key={callup.id} to={createPageUrl("ParentCallups")}>
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
                    <Icon className={`w-5 h-5 ${getNotificationColor("callup")} mt-1`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">Convocatoria Pendiente</p>
                      <p className="text-sm text-slate-700">{callup.titulo}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(callup.fecha_partido), "dd 'de' MMMM", { locale: es })} - {callup.hora_partido}
                      </p>
                    </div>
                    <Badge className="bg-orange-500 text-white">¡Confirmar!</Badge>
                  </div>
                </Link>
              );
            })}

            {/* Pending Payments */}
            {pendingPayments.map(payment => {
              const Icon = getNotificationIcon("payment");
              return (
                <Link key={payment.id} to={createPageUrl("ParentPayments")}>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                    <Icon className={`w-5 h-5 ${getNotificationColor("payment")} mt-1`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">Pago Pendiente</p>
                      <p className="text-sm text-slate-700">{payment.jugador_nombre} - {payment.mes}</p>
                      <p className="text-xs text-slate-500 mt-1">{payment.cantidad}€</p>
                    </div>
                    <Badge className="bg-green-500 text-white">Pagar</Badge>
                  </div>
                </Link>
              );
            })}

            {totalNotifications === 0 && (
              <div className="text-center py-12">
                <Check className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <p className="text-slate-600">¡Todo al día! No hay notificaciones pendientes</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="messages" className="space-y-3 mt-4">
            {unreadMessages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircle className="w-16 h-16 text-blue-500 mx-auto mb-3" />
                <p className="text-slate-600">No hay mensajes sin leer</p>
              </div>
            ) : (
              unreadMessages.map(msg => (
                <div key={msg.id} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                  <MessageCircle className="w-5 h-5 text-blue-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{msg.remitente_nombre}</p>
                    <p className="text-sm text-slate-700">{msg.mensaje}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(msg.created_date), "dd MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleMarkAsRead(msg)}>
                    <Check className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="callups" className="space-y-3 mt-4">
            {pendingCallups.length === 0 ? (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-orange-500 mx-auto mb-3" />
                <p className="text-slate-600">No hay convocatorias pendientes</p>
              </div>
            ) : (
              pendingCallups.map(callup => (
                <Link key={callup.id} to={createPageUrl("ParentCallups")}>
                  <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
                    <Bell className="w-5 h-5 text-orange-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{callup.titulo}</p>
                      <p className="text-sm text-slate-700">{callup.categoria}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(callup.fecha_partido), "dd 'de' MMMM", { locale: es })} - {callup.hora_partido}
                      </p>
                    </div>
                    <Badge className="bg-orange-500 text-white">Confirmar</Badge>
                  </div>
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="payments" className="space-y-3 mt-4">
            {pendingPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <p className="text-slate-600">No hay pagos pendientes</p>
              </div>
            ) : (
              pendingPayments.map(payment => (
                <Link key={payment.id} to={createPageUrl("ParentPayments")}>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                    <CreditCard className="w-5 h-5 text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{payment.jugador_nombre}</p>
                      <p className="text-sm text-slate-700">{payment.mes} - {payment.cantidad}€</p>
                      <p className="text-xs text-slate-500 mt-1">{payment.temporada}</p>
                    </div>
                    <Badge className="bg-green-500 text-white">Pagar</Badge>
                  </div>
                </Link>
              ))
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}