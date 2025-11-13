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
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    enabled: !!user,
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    initialData: [],
    refetchInterval: 30000, // Check events every 30 seconds
  });

  useEffect(() => {
    if (!user) return;

    let unreadCount = 0;
    const isAdmin = user.role === 'admin';
    const isPlayer = user.role === 'jugador';

    // Count unread messages
    if (isAdmin) {
      messages.forEach(msg => {
        if (!msg.leido && (msg.tipo === 'padre_a_grupo' || msg.tipo === 'jugador_a_equipo')) {
          unreadCount++;
        }
      });
    } else if (isPlayer) {
      const myPlayer = players.find(p => p.id === user.jugador_id);
      if (myPlayer) {
        messages.forEach(msg => {
          if (!msg.leido && 
              msg.tipo === 'admin_a_grupo' && 
              (msg.grupo_id === myPlayer.deporte || msg.deporte === myPlayer.deporte)) {
            unreadCount++;
          }
        });
      }
    } else {
      // Parent
      const myPlayers = players.filter(p => 
        p.email_padre === user.email || p.email_tutor_2 === user.email
      );
      const myGroupIds = myPlayers.map(p => p.deporte);
      
      messages.forEach(msg => {
        if (!msg.leido && 
            msg.tipo === 'admin_a_grupo' && 
            myGroupIds.includes(msg.grupo_id || msg.deporte)) {
          unreadCount++;
        }
      });
    }

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
  }, [user, messages, players, events]);

  return null;
}