import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Bell, Check, AlertCircle, Calendar, CreditCard, MessageCircle, Megaphone, DollarSign, Clock, Trash2, AlertTriangle } from "lucide-react";
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
    refetchInterval: isOpen ? 15000 : false,
  });

  const { data: allNotifications } = useQuery({
    queryKey: ['appNotifications', user?.email],
    queryFn: async () => {
      const all = await base44.entities.AppNotification.list('-created_date');
      return all.filter(n => n.usuario_email === user?.email);
    },
    enabled: !!user?.email,
    initialData: [],
    refetchInterval: isOpen ? 10000 : false,
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date'),
    initialData: [],
    refetchInterval: isOpen ? 30000 : false,
  });

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list('-fecha_publicacion'),
    initialData: [],
    refetchInterval: isOpen ? 30000 : false,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-created_date'),
    initialData: [],
    refetchInterval: isOpen ? 30000 : false,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    refetchInterval: false,
  });

  const { data: reminders } = useQuery({
    queryKey: ['reminders'],
    queryFn: () => base44.entities.Reminder.list('-fecha_envio'),
    initialData: [],
    refetchInterval: isOpen ? 30000 : false,
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    initialData: [],
    refetchInterval: isOpen ? 30000 : false,
  });

  // Mensajes privados
  const { data: privateConversations = [] } = useQuery({
    queryKey: ['privateConversationsNotif'],
    queryFn: () => base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha'),
    initialData: [],
    refetchInterval: isOpen ? 15000 : false,
  });

  const markMessageAsReadMutation = useMutation({
    mutationFn: ({ id, message }) => base44.entities.ChatMessage.update(id, { ...message, leido: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['chatMessagesListener'] });
    },
  });

  const myPlayers = user ? players.filter(p => 
    p.email_padre === user.email || p.email_tutor_2 === user.email
  ) : [];

  const myGroupSports = [...new Set(myPlayers.map(p => p.deporte))];

  // Messages - last 30 days for history, 7 days for badge
  const unreadMessages = messages.filter(m => {
    if (!m.leido && m.tipo === "admin_a_grupo" && myGroupSports.includes(m.grupo_id || m.deporte)) {
      const daysAgo = Math.floor((new Date() - new Date(m.created_date)) / (1000 * 60 * 60 * 24));
      return daysAgo <= 30;
    }
    return false;
  });

  const unreadMessagesRecent = unreadMessages.filter(m => {
    const daysAgo = Math.floor((new Date() - new Date(m.created_date)) / (1000 * 60 * 60 * 24));
    return daysAgo <= 7;
  });

  const urgentMessages = unreadMessagesRecent.filter(m => m.prioridad === "Urgente");

  // App notifications - últimas 30 días, pero eliminar vistas después de 3 días
  const recentAppNotifications = (allNotifications || []).filter(n => {
    const daysAgo = Math.floor((new Date() - new Date(n.created_date)) / (1000 * 60 * 60 * 24));
    
    // Si fue vista, solo mostrar si tiene menos de 3 días desde que se vio
    if (n.vista && n.fecha_vista) {
      const daysSinceViewed = Math.floor((new Date() - new Date(n.fecha_vista)) / (1000 * 60 * 60 * 24));
      return daysSinceViewed <= 3;
    }
    
    // Si no fue vista, mostrar si tiene menos de 30 días
    return daysAgo <= 30;
  });

  const unviewedAppNotifications = recentAppNotifications.filter(n => !n.vista);

  // Callups - solo pendientes y futuras (desaparecen el día después del partido)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().split('T')[0];
  
  const pendingCallups = callups.filter(c => {
    if (!c.publicada || c.cerrada) return false;
    // Solo mostrar si el partido es hoy o en el futuro
    if (c.fecha_partido < todayStr) return false;
    
    return c.jugadores_convocados?.some(j => {
      const isMyPlayer = myPlayers.some(p => p.id === j.jugador_id);
      return isMyPlayer && j.confirmacion === "pendiente";
    });
  });

  // Announcements con lógica de horas en lugar de días
  const now = new Date();
  const recentAnnouncements = announcements.filter(a => {
    if (!a.publicado) return false;
    if (a.destinatarios_tipo !== "Todos" && !myGroupSports.includes(a.destinatarios_tipo)) return false;
    
    // Si tiene fecha de expiración, respetarla
    if (a.fecha_expiracion) {
      const expirationDate = new Date(a.fecha_expiracion);
      if (now > expirationDate) return false;
    }
    
    const publishedDate = new Date(a.fecha_publicacion);
    const diffMs = now - publishedDate;
    const diffHours = diffMs / (1000 * 60 * 60);
    
    // Anuncios urgentes: 24 horas
    if (a.prioridad === "Urgente") {
      return diffHours < 24;
    }
    
    // Anuncios importantes: 48 horas
    if (a.prioridad === "Importante") {
      return diffHours < 48;
    }
    
    // Anuncios normales: 72 horas
    return diffHours < 72;
  }).slice(0, 10);

  const urgentAnnouncements = recentAnnouncements.filter(a => a.prioridad === "Urgente");

  // Events - solo eventos futuros (desaparecen el día después de su fecha)
  const upcomingEvents = events.filter(e => {
    if (!e.publicado) return false;
    
    // Solo mostrar si el evento es hoy o en el futuro
    const eventDate = new Date(e.fecha);
    eventDate.setHours(0, 0, 0, 0);
    return eventDate >= today;
  });

  // Payments
  const pendingPayments = payments.filter(p => 
    myPlayers.some(player => player.id === p.jugador_id) && p.estado === "Pendiente"
  );

  // Payment reminders due soon
  const upcomingReminders = reminders.filter(r => {
    if (r.enviado) return false;
    const reminderDate = new Date(r.fecha_envio);
    const daysUntil = Math.ceil((reminderDate - new Date()) / (1000 * 60 * 60 * 24));
    return daysUntil >= 0 && daysUntil <= 3 && myPlayers.some(p => p.id === r.jugador_id);
  });

  // Conversaciones privadas con mensajes no leídos
  const unreadPrivateConversations = privateConversations.filter(conv => {
    if (!user) return false;
    // Si soy familia, mirar no_leidos_familia
    if (conv.participante_familia_email === user.email) {
      return (conv.no_leidos_familia || 0) > 0;
    }
    // Si soy staff (entrenador/coordinador/admin), mirar no_leidos_staff
    if (conv.participante_staff_email === user.email) {
      return (conv.no_leidos_staff || 0) > 0;
    }
    return false;
  });

  const totalUnreadPrivate = unreadPrivateConversations.reduce((sum, conv) => {
    if (conv.participante_familia_email === user?.email) {
      return sum + (conv.no_leidos_familia || 0);
    }
    if (conv.participante_staff_email === user?.email) {
      return sum + (conv.no_leidos_staff || 0);
    }
    return sum;
  }, 0);

  const criticalNotifications = urgentAnnouncements.length + pendingPayments.length;
  const totalNotifications = pendingCallups.length + pendingPayments.length + recentAnnouncements.length + unviewedAppNotifications.length + totalUnreadPrivate;

  const getNotificationIcon = (type) => {
    switch(type) {
      case "message": return MessageCircle;
      case "callup": return Bell;
      case "announcement": return Megaphone;
      case "payment": return CreditCard;
      case "reminder": return Clock;
      case "event": return Calendar;
      default: return Bell;
    }
  };

  const getNotificationColor = (type, priority) => {
    if (priority === "Urgente") return "text-red-600 bg-red-50";
    switch(type) {
      case "message": return "text-blue-600 bg-blue-50";
      case "callup": return "text-orange-600 bg-orange-50";
      case "announcement": return "text-purple-600 bg-purple-50";
      case "payment": return "text-green-600 bg-green-50";
      case "reminder": return "text-yellow-600 bg-yellow-50";
      case "event": return "text-indigo-600 bg-indigo-50";
      default: return "text-slate-600 bg-slate-50";
    }
  };

  const handleMarkAsRead = (message) => {
    markMessageAsReadMutation.mutate({ id: message.id, message });
  };

  const clearAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      // Marcar todas las AppNotifications como vistas
      const myNotifications = allNotifications.filter(n => n.usuario_email === user?.email && !n.vista);
      for (const notif of myNotifications) {
        await base44.entities.AppNotification.update(notif.id, {
          vista: true,
          fecha_vista: new Date().toISOString()
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appNotifications'] });
      toast.success("Todas las notificaciones marcadas como vistas");
      setIsOpen(false);
    },
  });

  const deleteAllNotificationsMutation = useMutation({
    mutationFn: async () => {
      // Eliminar todas las AppNotifications del usuario
      const myNotifications = allNotifications.filter(n => n.usuario_email === user?.email);
      for (const notif of myNotifications) {
        await base44.entities.AppNotification.delete(notif.id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appNotifications'] });
      toast.success("Todas las notificaciones eliminadas");
      setIsOpen(false);
    },
  });

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Marcar notificaciones como vistas inmediatamente al abrir el centro
  useEffect(() => {
    if (!isOpen || !user) return;

    const markAsViewed = async () => {
      const unviewed = allNotifications.filter(n => !n.vista && n.usuario_email === user.email);
      
      if (unviewed.length > 0) {
        for (const notif of unviewed) {
          await base44.entities.AppNotification.update(notif.id, {
            vista: true,
            fecha_vista: new Date().toISOString()
          });
        }
        
        // Invalidar inmediatamente
        queryClient.invalidateQueries({ queryKey: ['appNotifications'] });
      }
    };

    markAsViewed();
  }, [isOpen, user]);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative min-w-[44px] min-h-[44px]">
          <Bell className={`w-6 h-6 ${criticalNotifications > 0 ? 'animate-pulse text-red-600' : ''}`} />
          {totalNotifications > 0 && (
            <Badge className={`absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 ${criticalNotifications > 0 ? 'bg-red-500 animate-pulse' : 'bg-orange-500'} text-white text-xs`}>
              {totalNotifications > 9 ? "9+" : totalNotifications}
            </Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-orange-600" />
              Centro de Notificaciones
              {totalNotifications > 0 && (
                <Badge className="bg-orange-500 text-white">{totalNotifications}</Badge>
              )}
              {criticalNotifications > 0 && (
                <Badge className="bg-red-500 text-white animate-pulse">🔴 {criticalNotifications} urgentes</Badge>
              )}
            </div>
            {allNotifications.length > 0 && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => clearAllNotificationsMutation.mutate()}
                  disabled={clearAllNotificationsMutation.isPending}
                  title="Marcar todas como vistas"
                >
                  <Check className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  title="Limpiar todas"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        {showDeleteConfirm && (
          <Alert className="bg-red-50 border-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <p className="font-semibold mb-2">⚠️ ¿Eliminar todas las notificaciones?</p>
              <p className="text-sm mb-3">Esta acción no se puede deshacer. Solo usar en caso de error del sistema.</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    deleteAllNotificationsMutation.mutate();
                    setShowDeleteConfirm(false);
                  }}
                  disabled={deleteAllNotificationsMutation.isPending}
                >
                  Sí, eliminar todo
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="all" className="w-full">
          <TabsList className="w-full grid grid-cols-5 gap-1">
            <TabsTrigger value="all" className="text-xs">
              Todas ({totalNotifications})
            </TabsTrigger>

            <TabsTrigger value="callups" className="text-xs">
              🏆 ({pendingCallups.length})
            </TabsTrigger>
            <TabsTrigger value="payments" className="text-xs">
              💰 ({pendingPayments.length})
            </TabsTrigger>
            <TabsTrigger value="announcements" className="text-xs">
              📢 ({recentAnnouncements.length})
            </TabsTrigger>
            <TabsTrigger value="history" className="text-xs">
              📜
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-3 mt-4">
            {/* Critical Alerts */}
            {criticalNotifications > 0 && (
              <div className="p-3 bg-red-50 border-2 border-red-300 rounded-lg mb-4">
                <div className="flex items-center gap-2 text-red-900 font-bold mb-2">
                  <AlertCircle className="w-5 h-5 animate-pulse" />
                  Notificaciones Urgentes ({criticalNotifications})
                </div>
              </div>
            )}



            {/* Conversaciones Privadas No Leídas */}
            {unreadPrivateConversations.map(conv => (
              <Link key={conv.id} to={createPageUrl("ParentSystemMessages")} onClick={() => setIsOpen(false)}>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-orange-50 hover:opacity-80 transition-all border-2 border-orange-300">
                  <MessageCircle className="w-5 h-5 text-orange-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">💬 Mensajes del Sistema</p>
                    <p className="text-sm text-slate-700">{conv.ultimo_mensaje?.substring(0, 80)}...</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(conv.ultimo_mensaje_fecha), "dd MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                  <Badge className="bg-orange-500 text-white">{conv.no_leidos_familia}</Badge>
                </div>
              </Link>
            ))}

            {/* App Notifications */}
            {unviewedAppNotifications.map(notif => {
              const Icon = getNotificationIcon(notif.tipo?.includes("callup") || notif.tipo?.includes("convocatoria") ? "callup" : notif.tipo?.includes("pago") ? "payment" : notif.tipo?.includes("evaluacion") ? "event" : "message");
              // Determinar la URL de destino - usar enlace si existe, sino url_accion, sino Home
              const targetUrl = notif.enlace 
                ? (notif.enlace.startsWith('/') ? notif.enlace : createPageUrl(notif.enlace))
                : (notif.url_accion || createPageUrl("Home"));
              return (
                <Link key={notif.id} to={targetUrl} onClick={() => setIsOpen(false)}>
                  <div className={`flex items-start gap-3 p-3 rounded-lg hover:opacity-80 transition-all ${notif.prioridad === "urgente" ? "border-2 border-orange-300 bg-orange-50" : "bg-slate-50"}`}>
                    <Icon className={`w-5 h-5 mt-1 ${notif.prioridad === "urgente" ? "text-orange-600" : "text-blue-600"}`} />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{notif.titulo}</p>
                      <p className="text-sm text-slate-700">{notif.mensaje}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(notif.created_date), "dd MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}



            {/* Urgent Announcements */}
            {urgentAnnouncements.map(ann => (
              <Link key={ann.id} to={createPageUrl("Announcements")} onClick={() => setIsOpen(false)}>
                <div className={`flex items-start gap-3 p-3 rounded-lg hover:opacity-80 transition-all border-2 border-red-300 ${getNotificationColor("announcement", "Urgente")}`}>
                  <Megaphone className="w-5 h-5 text-red-600 mt-1 animate-pulse" />
                  <div className="flex-1">
                    <Badge className="bg-red-500 text-white text-xs mb-2 animate-pulse">🚨 Anuncio Urgente</Badge>
                    <p className="text-sm font-semibold text-slate-900">{ann.titulo}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(ann.fecha_publicacion), "dd MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}

            {/* Pending Payments */}
            {pendingPayments.map(payment => {
              const Icon = getNotificationIcon("payment");
              return (
                <Link key={payment.id} to={createPageUrl("ParentPayments")} onClick={() => setIsOpen(false)}>
                  <div className={`flex items-start gap-3 p-3 rounded-lg hover:opacity-80 transition-all ${getNotificationColor("payment")}`}>
                    <Icon className="w-5 h-5 text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">💰 Pago Pendiente</p>
                      <p className="text-sm text-slate-700">{payment.jugador_nombre} - {payment.mes}</p>
                      <p className="text-xs text-slate-500 mt-1">{payment.cantidad}€</p>
                    </div>
                    <Badge className="bg-red-500 text-white">Pagar</Badge>
                  </div>
                </Link>
              );
            })}

            {/* Upcoming Reminders */}
            {upcomingReminders.map(reminder => (
              <Link key={reminder.id} to={createPageUrl("ParentPayments")} onClick={() => setIsOpen(false)}>
                <div className={`flex items-start gap-3 p-3 rounded-lg hover:opacity-80 transition-all ${getNotificationColor("reminder")}`}>
                  <Clock className="w-5 h-5 text-yellow-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">⏰ Recordatorio de Pago Próximo</p>
                    <p className="text-sm text-slate-700">{reminder.jugador_nombre} - {reminder.mes_pago}</p>
                    <p className="text-xs text-slate-500 mt-1">Vence: {format(new Date(reminder.fecha_envio), "dd MMM", { locale: es })}</p>
                  </div>
                </div>
              </Link>
            ))}



            {/* Pending Callups */}
            {pendingCallups.map(callup => {
              const Icon = getNotificationIcon("callup");
              return (
                <Link key={callup.id} to={createPageUrl("ParentCallups")} onClick={() => setIsOpen(false)}>
                  <div className={`flex items-start gap-3 p-3 rounded-lg hover:opacity-80 transition-all ${getNotificationColor("callup")}`}>
                    <Icon className="w-5 h-5 text-orange-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">🏆 Convocatoria Pendiente</p>
                      <p className="text-sm text-slate-700">{callup.titulo}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(callup.fecha_partido), "dd 'de' MMMM", { locale: es })} - {callup.hora_partido}
                      </p>
                    </div>
                    <Badge className="bg-orange-500 text-white">Confirmar</Badge>
                  </div>
                </Link>
              );
            })}

            {/* Recent Announcements */}
            {recentAnnouncements.filter(a => a.prioridad !== "Urgente").map(ann => (
              <Link key={ann.id} to={createPageUrl("Announcements")} onClick={() => setIsOpen(false)}>
                <div className={`flex items-start gap-3 p-3 rounded-lg hover:opacity-80 transition-all ${getNotificationColor("announcement", ann.prioridad)}`}>
                  <Megaphone className="w-5 h-5 text-purple-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">📢 {ann.titulo}</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {format(new Date(ann.fecha_publicacion), "dd MMM, HH:mm", { locale: es })}
                    </p>
                  </div>
                </div>
              </Link>
            ))}

            {totalNotifications === 0 && (
              <div className="text-center py-12">
                <Check className="w-16 h-16 text-green-500 mx-auto mb-3" />
                <p className="text-slate-600 font-medium">¡Todo al día!</p>
                <p className="text-sm text-slate-500">No hay notificaciones pendientes</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-3 mt-4">
            <div className="text-sm text-slate-600 mb-4">
              Últimas 30 días • {recentAppNotifications.length + recentAnnouncements.length} notificaciones
            </div>
            
            {recentAppNotifications.map(notif => (
              <div key={notif.id} className={`flex items-start gap-3 p-3 rounded-lg ${notif.vista ? "bg-slate-50 opacity-60" : "bg-blue-50"}`}>
                <Bell className="w-5 h-5 text-blue-600 mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{notif.titulo}</p>
                  <p className="text-sm text-slate-700">{notif.mensaje}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {format(new Date(notif.created_date), "dd MMM, HH:mm", { locale: es })}
                  </p>
                </div>
                {notif.vista && <Badge variant="outline" className="text-xs">Vista</Badge>}
              </div>
            ))}



            {recentAnnouncements.map(ann => (
              <div key={ann.id} className="flex items-start gap-3 p-3 bg-purple-50 rounded-lg">
                <Megaphone className="w-5 h-5 text-purple-600 mt-1" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">{ann.titulo}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {format(new Date(ann.fecha_publicacion), "dd MMM, HH:mm", { locale: es })}
                  </p>
                </div>
              </div>
            ))}

            {recentAppNotifications.length === 0 && recentAnnouncements.length === 0 && (
              <div className="text-center py-12">
                <Bell className="w-16 h-16 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600">Sin notificaciones en los últimos 30 días</p>
              </div>
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
                <Link key={callup.id} to={createPageUrl("ParentCallups")} onClick={() => setIsOpen(false)}>
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
                <Link key={payment.id} to={createPageUrl("ParentPayments")} onClick={() => setIsOpen(false)}>
                  <div className="flex items-start gap-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                    <CreditCard className="w-5 h-5 text-green-600 mt-1" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{payment.jugador_nombre}</p>
                      <p className="text-sm text-slate-700">{payment.mes} - {payment.cantidad}€</p>
                      <p className="text-xs text-slate-500 mt-1">{payment.temporada}</p>
                    </div>
                    <Badge className="bg-red-500 text-white">Pagar</Badge>
                  </div>
                </Link>
              ))
            )}
          </TabsContent>

          <TabsContent value="announcements" className="space-y-3 mt-4">
            {recentAnnouncements.length === 0 ? (
              <div className="text-center py-12">
                <Megaphone className="w-16 h-16 text-purple-500 mx-auto mb-3" />
                <p className="text-slate-600">No hay anuncios recientes</p>
              </div>
            ) : (
              recentAnnouncements.map(ann => (
                <Link key={ann.id} to={createPageUrl("Announcements")} onClick={() => setIsOpen(false)}>
                  <div className={`flex items-start gap-3 p-3 rounded-lg hover:opacity-80 transition-all ${ann.prioridad === "Urgente" ? "bg-red-50 border-2 border-red-300" : "bg-purple-50"}`}>
                    <Megaphone className={`w-5 h-5 mt-1 ${ann.prioridad === "Urgente" ? "text-red-600" : "text-purple-600"}`} />
                    <div className="flex-1">
                      {ann.prioridad === "Urgente" && (
                        <Badge className="bg-red-500 text-white text-xs mb-2">🚨 Urgente</Badge>
                      )}
                      <p className="text-sm font-semibold text-slate-900">{ann.titulo}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {format(new Date(ann.fecha_publicacion), "dd MMM, HH:mm", { locale: es })}
                      </p>
                    </div>
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