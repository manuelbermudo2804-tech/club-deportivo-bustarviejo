import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function NotificationBadge() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: async () => {
      const all = await base44.entities.Player.list();
      // CRÍTICO: Solo jugadores activos
      return all.filter(p => p.activo === true);
    },
    initialData: [],
    enabled: !!user,
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    initialData: [],
    refetchInterval: 30000,
  });

  // NUEVOS: datos de chats para contadores
  const { data: nbChatMessages = [] } = useQuery({
    queryKey: ['nb-chatmessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    refetchInterval: 5000,
  });
  const { data: nbCoachMessages = [] } = useQuery({
    queryKey: ['nb-coachmessages'],
    queryFn: () => base44.entities.CoachMessage.list(),
    refetchInterval: 5000,
  });
  const { data: nbStaffMessages = [] } = useQuery({
    queryKey: ['nb-staffmessages'],
    queryFn: () => base44.entities.StaffMessage.list(),
    refetchInterval: 5000,
  });
  const { data: nbCoordConvs = [] } = useQuery({
    queryKey: ['nb-coordConvs'],
    queryFn: () => base44.entities.CoordinatorConversation.list(),
    refetchInterval: 5000,
  });
  const { data: nbPrivateConvs = [] } = useQuery({
    queryKey: ['nb-privateConvs'],
    queryFn: () => base44.entities.PrivateConversation.list(),
    refetchInterval: 5000,
  });

  const computedChatUnread = (() => {
    if (!user) return 0;
    const myEmail = user.email;
    if (user.role === 'admin') {
      return nbStaffMessages.filter(m => m.autor_email !== myEmail && (!m.leido_por || !m.leido_por.some(lp => lp.email === myEmail))).length;
    }
    if (user.es_coordinador) {
      const staffUnread = nbStaffMessages.filter(m => m.autor_email !== myEmail && (!m.leido_por || !m.leido_por.some(lp => lp.email === myEmail))).length;
      const convUnread = nbCoordConvs.reduce((s,c) => s + (c.no_leidos_coordinador || 0), 0);
      return staffUnread + convUnread;
    }
    if (user.es_entrenador) {
      const staffUnread = nbStaffMessages.filter(m => m.autor_email !== myEmail && (!m.leido_por || !m.leido_por.some(lp => lp.email === myEmail))).length;
      const fromParents = nbCoachMessages.filter(m => m.autor === 'padre' && !m.leido_entrenador).length;
      return staffUnread + fromParents;
    }
    // Padre / jugador
    const myPlayersLocal = players.filter(p => p.email_padre === myEmail || p.email_tutor_2 === myEmail || p.email_jugador === myEmail);
    const groupIds = myPlayersLocal.map(p => p.deporte);
    const coachMsgs = nbChatMessages.filter(m => m.tipo === 'entrenador_a_grupo' && (!m.leido_por || !m.leido_por.some(lp => lp.email === myEmail)) && groupIds.includes(m.grupo_id || m.deporte)).length;
    const coordUnread = nbCoordConvs.filter(c => c.padre_email === myEmail).reduce((s,c)=> s + (c.no_leidos_padre || 0), 0);
    const privateUnread = nbPrivateConvs.filter(c => c.participante_familia_email === myEmail).reduce((s,c)=> s + (c.no_leidos_familia || 0), 0);
    return coachMsgs + coordUnread + privateUnread;
  })();

  const { data: announcements } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.list(),
    initialData: [],
    refetchInterval: 30000,
  });

  const { data: appNotifications } = useQuery({
    queryKey: ['appNotifications', user?.email],
    queryFn: async () => {
      const all = await base44.entities.AppNotification.list();
      return all.filter(n => n.usuario_email === user?.email && !n.vista);
    },
    initialData: [],
    refetchInterval: 10000,
    enabled: !!user?.email,
  });

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!user) return;

    let unreadCount = computedChatUnread;
    const isAdmin = user.role === 'admin';
    const isPlayer = user.role === 'jugador';

    // Chat counts consolidados por computedChatUnread

    // Count new events (published in the last 24 hours and not notified yet)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    events.forEach(event => {
      if (event.publicado && !event.notificado && event.created_date) {
        const eventCreated = new Date(event.created_date);
        if (eventCreated > oneDayAgo) {
          unreadCount++;
        }
      }
    });

    // Count new announcements (published in the last 24 hours)
    announcements.forEach(announcement => {
      if (announcement.publicado && announcement.created_date) {
        const announcementCreated = new Date(announcement.created_date);
        if (announcementCreated > oneDayAgo) {
          unreadCount++;
        }
      }
    });

    // Count unread app notifications
    unreadCount += appNotifications.length;

    // Count pending callups (only for parents and players)
    if (!isAdmin) {
      const today = new Date().toISOString().split('T')[0];
      if (isPlayer) {
        const myPlayer = players.find(p => p.email_jugador === user.email);
        if (myPlayer) {
          callups.forEach(callup => {
            if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
              const myConfirmation = callup.jugadores_convocados?.find(j => j.jugador_id === myPlayer.id);
              if (myConfirmation && myConfirmation.confirmacion === "pendiente") {
                unreadCount++;
              }
            }
          });
        }
      } else {
        // Parent
        const myPlayers = players.filter(p => 
          p.email_padre === user.email || p.email_tutor_2 === user.email
        );
        callups.forEach(callup => {
          if (callup.publicada && callup.fecha_partido >= today && !callup.cerrada) {
            callup.jugadores_convocados?.forEach(jugador => {
              const isMyPlayer = myPlayers.some(p => p.id === jugador.jugador_id);
              if (isMyPlayer && jugador.confirmacion === "pendiente") {
                unreadCount++;
              }
            });
          }
        });
      }
    }

    // Update document title
    if (unreadCount > 0) {
      document.title = `(${unreadCount}) CD Bustarviejo`;
    } else {
      document.title = 'CD Bustarviejo';
    }

    // Update PWA badge (if supported)
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount).catch(err => {
          console.log('Badge API not supported', err);
        });
      } else {
        navigator.clearAppBadge().catch(err => {
          console.log('Badge API not supported', err);
        });
      }
    }

    // Cleanup on unmount
    return () => {
      document.title = 'CD Bustarviejo';
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    };
  }, [user, messages, players, events, announcements, appNotifications, callups]);

  return null;
}