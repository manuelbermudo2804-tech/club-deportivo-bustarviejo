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
import { toast } from "sonner";
import { useUnifiedNotifications } from "./notifications/useUnifiedNotifications";

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

  const [messages, setMessages] = useState([]);
  const [allNotifications, setAllNotifications] = useState([]);
  const [callups, setCallups] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [payments, setPayments] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [events, setEvents] = useState([]);
  const [privateConversations, setPrivateConversations] = useState([]);

  const { data: players = [] } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
  });

  // Real-time subscriptions
  useEffect(() => {
    if (!isOpen || !user) return;

    const unsubscribers = [];

    // Messages - Solo últimos 50 (no 200)
    const loadMessages = async () => {
      try {
        const msgs = await base44.entities.ChatMessage.list('-created_date', 50);
        setMessages(msgs);
      } catch (e) {
        console.error('[NotificationCenter] Error loading messages:', e);
      }
    };
    loadMessages();
    const unsubMsg = base44.entities.ChatMessage.subscribe((event) => {
      try {
        if (event.type === 'create') setMessages(prev => [event.data, ...prev].slice(0, 50));
        else if (event.type === 'update') setMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        else if (event.type === 'delete') setMessages(prev => prev.filter(m => m.id !== event.id));
      } catch (e) {
        console.error('[NotificationCenter] Error in message subscription:', e);
      }
    });
    unsubscribers.push(unsubMsg);

    // AppNotifications - Solo últimas 50
    const loadNotifs = async () => {
      try {
        const all = await base44.entities.AppNotification.filter({ usuario_email: user.email }, '-created_date', 50);
        setAllNotifications(all);
      } catch (e) {
        console.error('[NotificationCenter] Error loading notifications:', e);
      }
    };
    loadNotifs();
    const unsubNotif = base44.entities.AppNotification.subscribe((event) => {
      try {
        if (event.type === 'create' && event.data.usuario_email === user.email) {
          setAllNotifications(prev => [event.data, ...prev].slice(0, 50));
        } else if (event.type === 'update' && event.data.usuario_email === user.email) {
          setAllNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
        } else if (event.type === 'delete') {
          setAllNotifications(prev => prev.filter(n => n.id !== event.id));
        }
      } catch (e) {
        console.error('[NotificationCenter] Error in notification subscription:', e);
      }
    });
    unsubscribers.push(unsubNotif);

    // Callups - Solo últimas 50
    const loadCallups = async () => {
      try {
        const c = await base44.entities.Convocatoria.list('-created_date', 50);
        setCallups(c);
      } catch (e) {
        console.error('[NotificationCenter] Error loading callups:', e);
      }
    };
    loadCallups();
    let lastCallupUpdate = 0;
    const unsubCall = base44.entities.Convocatoria.subscribe((event) => {
      const nowT = Date.now();
      if (nowT - lastCallupUpdate < 1000) return;
      lastCallupUpdate = nowT;
      try {
        if (event.type === 'create') setCallups(prev => [event.data, ...prev].slice(0, 50));
        else if (event.type === 'update') setCallups(prev => prev.map(c => c.id === event.id ? event.data : c));
        else if (event.type === 'delete') setCallups(prev => prev.filter(c => c.id !== event.id));
      } catch (e) {
        console.error('[NotificationCenter] Error in callup subscription:', e);
      }
    });
    unsubscribers.push(unsubCall);

    // Announcements - Solo últimas 50
    const loadAnn = async () => {
      try {
        const a = await base44.entities.Announcement.list('-fecha_publicacion', 50);
        setAnnouncements(a);
      } catch (e) {
        console.error('[NotificationCenter] Error loading announcements:', e);
      }
    };
    loadAnn();
    let lastAnnUpdate = 0;
    const unsubAnn = base44.entities.Announcement.subscribe((event) => {
      const nowA = Date.now();
      if (nowA - lastAnnUpdate < 1000) return;
      lastAnnUpdate = nowA;
      try {
        if (event.type === 'create') setAnnouncements(prev => [event.data, ...prev].slice(0, 50));
        else if (event.type === 'update') setAnnouncements(prev => prev.map(a => a.id === event.id ? event.data : a));
        else if (event.type === 'delete') setAnnouncements(prev => prev.filter(a => a.id !== event.id));
      } catch (e) {
        console.error('[NotificationCenter] Error in announcement subscription:', e);
      }
    });
    unsubscribers.push(unsubAnn);

    // Payments - Solo últimos 50
    const loadPay = async () => {
      try {
        const p = await base44.entities.Payment.list('-created_date', 50);
        setPayments(p);
      } catch (e) {
        console.error('[NotificationCenter] Error loading payments:', e);
      }
    };
    loadPay();
    const unsubPay = base44.entities.Payment.subscribe((event) => {
      try {
        if (event.type === 'create') setPayments(prev => [event.data, ...prev].slice(0, 50));
        else if (event.type === 'update') setPayments(prev => prev.map(p => p.id === event.id ? event.data : p));
        else if (event.type === 'delete') setPayments(prev => prev.filter(p => p.id !== event.id));
      } catch (e) {
        console.error('[NotificationCenter] Error in payment subscription:', e);
      }
    });
    unsubscribers.push(unsubPay);

    // Reminders
    const loadRem = async () => {
      const r = await base44.entities.Reminder.list('-fecha_envio');
      setReminders(r);
    };
    loadRem();
    const unsubRem = base44.entities.Reminder.subscribe((event) => {
      if (event.type === 'create') setReminders(prev => [event.data, ...prev]);
      else if (event.type === 'update') setReminders(prev => prev.map(r => r.id === event.id ? event.data : r));
      else if (event.type === 'delete') setReminders(prev => prev.filter(r => r.id !== event.id));
    });
    unsubscribers.push(unsubRem);

    // Events - Solo últimos 50
    const loadEv = async () => {
      try {
        const e = await base44.entities.Event.list('-fecha', 50);
        setEvents(e);
      } catch (e) {
        console.error('[NotificationCenter] Error loading events:', e);
      }
    };
    loadEv();
    let lastEvUpdate = 0;
    const unsubEv = base44.entities.Event.subscribe((event) => {
      const nowE = Date.now();
      if (nowE - lastEvUpdate < 1000) return;
      lastEvUpdate = nowE;
      try {
        if (event.type === 'create') setEvents(prev => [event.data, ...prev].slice(0, 50));
        else if (event.type === 'update') setEvents(prev => prev.map(e => e.id === event.id ? event.data : e));
        else if (event.type === 'delete') setEvents(prev => prev.filter(e => e.id !== event.id));
      } catch (e) {
        console.error('[NotificationCenter] Error in event subscription:', e);
      }
    });
    unsubscribers.push(unsubEv);

    // Private Conversations - Solo últimas 50
    const loadPriv = async () => {
      try {
        const pc = await base44.entities.PrivateConversation.list('-ultimo_mensaje_fecha', 50);
        setPrivateConversations(pc);
      } catch (e) {
        console.error('[NotificationCenter] Error loading private conversations:', e);
      }
    };
    loadPriv();
    let lastPrivUpdate = 0;
    const unsubPriv = base44.entities.PrivateConversation.subscribe((event) => {
      const nowP = Date.now();
      if (nowP - lastPrivUpdate < 1000) return;
      lastPrivUpdate = nowP;
      try {
        if (event.type === 'create') setPrivateConversations(prev => [event.data, ...prev].slice(0, 50));
        else if (event.type === 'update') setPrivateConversations(prev => prev.map(p => p.id === event.id ? event.data : p));
        else if (event.type === 'delete') setPrivateConversations(prev => prev.filter(p => p.id !== event.id));
      } catch (e) {
        console.error('[NotificationCenter] Error in private conversation subscription:', e);
      }
    });
    unsubscribers.push(unsubPriv);

    return () => {
      unsubscribers.forEach((unsub, idx) => {
        try {
          if (unsub && typeof unsub === 'function') unsub();
        } catch (e) {
          console.error(`[NotificationCenter] Error in unsubscriber ${idx}:`, e);
        }
      });
    };
  }, [isOpen, user]);



  const isAdmin = user?.role === 'admin';
  const isCoordinator = user?.es_coordinador === true;
  const isCoach = user?.es_entrenador === true;
  const isPlayer = user?.es_jugador === true || user?.tipo_panel === 'jugador_adulto';
  const isFamily = !!user && !isAdmin && !isCoach && !isCoordinator && !isPlayer;

  const { notifications } = useUnifiedNotifications(user);
  const chatUnread = (
    (notifications?.unreadStaffMessages || 0) +
    (notifications?.unreadCoordinatorMessages || 0) +
    (notifications?.unreadCoachMessages || 0) +
    (notifications?.unreadSystemMessages || 0) +
    (notifications?.unreadCoordinatorForStaff || 0) +
    (notifications?.unreadCoachForStaff || 0)
  );

  const chatItems = [
    // STAFF - para admin/coordinadores/entrenadores
    ((isAdmin || isCoach || isCoordinator) && (notifications?.unreadStaffMessages || 0) > 0) ? { source: 'staff', label: 'Chat Staff', count: notifications.unreadStaffMessages, link: 'StaffChat' } : null,
    
    // COORDINADOR - para familias (mensajes del coordinador) y coordinadores (mensajes de familias)
    (isCoordinator && (notifications?.unreadCoordinatorForStaff || 0) > 0) ? { source: 'coordinator', label: 'Familias - Coordinador', count: notifications.unreadCoordinatorForStaff, link: 'CoordinatorChat' } : null,
    (isFamily && (notifications?.unreadCoordinatorMessages || 0) > 0) ? { source: 'coordinator', label: 'Coordinador (1-a-1)', count: notifications.unreadCoordinatorMessages, link: 'ParentCoordinatorChat' } : null,
    
    // ENTRENADOR - para familias (mensajes del entrenador) y entrenadores (mensajes de familias)
    (isCoach && (notifications?.unreadCoachForStaff || 0) > 0) ? { source: 'coach', label: 'Familias - Entrenador', count: notifications.unreadCoachForStaff, link: 'CoachParentChat' } : null,
    (isFamily && (notifications?.unreadCoachMessages || 0) > 0) ? { source: 'coach', label: 'Chat Equipo (Grupal)', count: notifications.unreadCoachMessages, link: 'ParentCoachChat' } : null,
    
    // SYSTEM MESSAGES - solo para familias
    (isFamily && (notifications?.unreadSystemMessages || 0) > 0) ? { source: 'system', label: 'Mensajes del Club', count: notifications.unreadSystemMessages, link: 'ParentSystemMessages' } : null,
  ].filter(Boolean);

  const markMessageAsReadMutation = useMutation({
    mutationFn: ({ id, message }) => base44.entities.ChatMessage.update(id, { ...message, leido: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages'] });
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['chatMessagesListener'] });
    },
  });

  const myPlayers = user ? players.filter(p => 
    p.email_padre === user.email || p.email_tutor_2 === user.email || p.email_jugador === user.email
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

  // Payments (evitar duplicados: si hay Pago Único para jugador+temporada, ignorar las 3 cuotas)
  const myPlayerIds = new Set(myPlayers.map(p => p.id));
  const nonDeletedPayments = payments.filter(p => myPlayerIds.has(p.jugador_id) && p.is_deleted !== true);

  // Mapear si existe Pago Único por jugador+temporada
  const hasUniqueByPlayerSeason = new Set();
  nonDeletedPayments.forEach(p => {
    const tipo = (p.tipo_pago || '').toLowerCase();
    if ((tipo.includes('único') || tipo.includes('unico')) && p.temporada) {
      hasUniqueByPlayerSeason.add(`${p.jugador_id}__${p.temporada}`);
    }
  });

  const pendingPayments = nonDeletedPayments.filter(p => {
    if (p.estado !== 'Pendiente') return false;
    const key = `${p.jugador_id}__${p.temporada}`;
    if (hasUniqueByPlayerSeason.has(key)) {
      // Solo mantener el registro de Pago Único
      const tipo = (p.tipo_pago || '').toLowerCase();
      return (tipo.includes('único') || tipo.includes('unico'));
    }
    return true;
  });

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
  const coachCategories = user ? (user.categorias_entrena || []) : [];
  const unreadFromParentsForCoach = (user && (user.es_entrenador || user.es_coordinador || user.role === 'admin')) ? messages.filter(m => 
    m.tipo === 'padre_a_grupo' &&
    (coachCategories.includes(m.deporte) || coachCategories.includes(m.grupo_id)) &&
    (!m.leido_por || !m.leido_por.some(lp => lp.email === user.email))
  ).length : 0;

  // Contador simétrico para familias: mensajes de entrenador sin leer (badge en Centro)
  // CRÍTICO: Usar === true para validación booleana estricta
  const myGroupSportsSet = new Set(myGroupSports);
  const unreadFromCoachForFamily = (!user || user.role === 'admin' || user.es_entrenador === true || user.es_coordinador === true) ? 0 : messages.filter(m =>
    m.tipo === 'entrenador_a_grupo' &&
    (myGroupSportsSet.has(m.deporte) || myGroupSportsSet.has(m.grupo_id)) &&
    (!m.leido_por || !m.leido_por.some(lp => lp.email === user.email))
  ).length;

  const totalNotifications = pendingCallups.length + pendingPayments.length + recentAnnouncements.length + unviewedAppNotifications.length + chatUnread;

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



            {/* Chats unificados por fuente */}
            {chatItems?.length > 0 && chatItems.map((item) => (
              <Link key={item.source} to={createPageUrl(item.link)} onClick={() => setIsOpen(false)}>
                <div className="flex items-start gap-3 p-3 rounded-lg bg-slate-50 hover:opacity-80 transition-all border">
                  <MessageCircle className="w-5 h-5 text-slate-600 mt-1" />
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900">{item.label}</p>
                  </div>
                  <Badge className="bg-slate-800 text-white">{item.count}</Badge>
                </div>
              </Link>
            ))}

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