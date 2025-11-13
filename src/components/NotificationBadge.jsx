import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Componente para mostrar badge de notificaciones
 * - Actualiza el título de la pestaña con el contador
 * - Actualiza el badge de la PWA (si está instalada)
 */
export default function NotificationBadge() {
  const { data: user } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
    refetchInterval: 5000, // Actualizar cada 5 segundos
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    enabled: !!user,
  });

  useEffect(() => {
    if (!user) return;

    let unreadCount = 0;

    if (user.role === 'admin') {
      // Admin: contar mensajes de padres no leídos
      unreadCount = messages.filter(msg => 
        !msg.leido && msg.tipo === 'padre_a_grupo'
      ).length;
    } else {
      // Padres: contar mensajes del admin no leídos en sus grupos
      const myPlayers = players.filter(p => 
        p.email_padre === user.email || p.email_tutor_2 === user.email
      );
      const myGroupIds = myPlayers.map(p => p.deporte).filter(Boolean);
      
      unreadCount = messages.filter(msg => 
        !msg.leido && 
        msg.tipo === 'admin_a_grupo' && 
        myGroupIds.includes(msg.grupo_id || msg.deporte)
      ).length;
    }

    // Actualizar título de la pestaña
    const baseTitle = 'CD Bustarviejo';
    document.title = unreadCount > 0 ? `(${unreadCount}) ${baseTitle}` : baseTitle;

    // Actualizar badge de PWA (si está disponible)
    if ('setAppBadge' in navigator) {
      if (unreadCount > 0) {
        navigator.setAppBadge(unreadCount).catch(err => {
          console.log('Badge API not supported:', err);
        });
      } else {
        navigator.clearAppBadge().catch(err => {
          console.log('Badge API not supported:', err);
        });
      }
    }

    // Cleanup al desmontar
    return () => {
      document.title = baseTitle;
      if ('clearAppBadge' in navigator) {
        navigator.clearAppBadge().catch(() => {});
      }
    };
  }, [user, messages, players]);

  // Este componente no renderiza nada visible
  return null;
}