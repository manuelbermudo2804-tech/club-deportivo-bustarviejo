import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook UNIVERSAL que obtiene TODOS los contadores de chats sin leer
 * Retorna estructura unificada para mostrar en AlertCenter y NotificationCenter
 */
export function useChatNotifications(user, enabled = true) {
  // Cargar conversaciones según rol del usuario
  const shouldLoadCoord = enabled && (user?.es_coordinador || (!user?.es_entrenador && !user?.es_tesorero && user?.role !== 'admin'));
  const shouldLoadAdmin = enabled && (user?.role === 'admin' || (!user?.es_entrenador && !user?.es_coordinador && !user?.es_tesorero));
  const shouldLoadStaff = enabled && (user?.es_entrenador || user?.es_coordinador || user?.role === 'admin');

  const { data: coordinatorConversations = [] } = useQuery({
    queryKey: ['coordinatorConversations', user?.email],
    queryFn: () => base44.entities.CoordinatorConversation.list(),
    enabled: shouldLoadCoord,
    refetchInterval: 15000,
  });

  const { data: adminConversations = [] } = useQuery({
    queryKey: ['adminConversations', user?.email],
    queryFn: () => base44.entities.AdminConversation.list(),
    enabled: shouldLoadAdmin,
    refetchInterval: 15000,
  });

  const { data: privateConversations = [] } = useQuery({
    queryKey: ['privateConversations', user?.email],
    queryFn: () => base44.entities.PrivateConversation.list(),
    enabled: enabled,
    refetchInterval: 20000,
  });

  const { data: staffMessages = [] } = useQuery({
    queryKey: ['staffMessages', user?.email],
    queryFn: () => base44.entities.StaffMessage.list('-created_date', 100),
    enabled: shouldLoadStaff,
    refetchInterval: 20000,
  });

  // Calcular contadores totales según rol
  const coordinatorUnread = coordinatorConversations.reduce((sum, c) => {
    if (user?.es_coordinador) return sum + (c.no_leidos_coordinador || 0);
    return sum + (c.no_leidos_padre || 0);
  }, 0);

  const adminUnread = adminConversations.reduce((sum, c) => {
    if (user?.role === 'admin') return sum + (c.no_leidos_admin || 0);
    return sum + (c.no_leidos_padre || 0);
  }, 0);

  const privateUnread = privateConversations.reduce((sum, c) => {
    if (user?.es_coordinador || user?.es_entrenador || user?.role === 'admin') {
      return sum + (c.no_leidos_staff || 0);
    }
    return sum + (c.no_leidos_familia || 0);
  }, 0);

  const staffUnread = staffMessages.filter((m) => {
    if (!user?.email || m.autor_email === user.email) return false;
    const destinatarios = m.staff_destinatarios || [];
    if (destinatarios.length === 0) return true;
    const soyCoord = user.es_coordinador === true;
    const soyCoach = user.es_entrenador === true;
    const soyAdmin = user.role === 'admin';
    return (soyCoord && destinatarios.includes('coordinator')) ||
           (soyCoach && destinatarios.includes('coach')) ||
           (soyAdmin && destinatarios.includes('admin'));
  }).length;

  return {
    // Contadores individuales
    coordinatorUnread,
    adminUnread,
    privateUnread,
    staffUnread,

    // Total
    totalUnread:
      coordinatorUnread + adminUnread + privateUnread + staffUnread,

    // Datos brutos para filtrado
    coordinatorConversations,
    adminConversations,
    privateConversations,
    staffMessages,

    // Array unificado para iteración
    items: [
      {
        source: 'coordinator',
        label: '🏟️ Coordinador',
        count: coordinatorUnread,
        link: 'FamilyChats',
        icon: '🏟️',
      },
      {
        source: 'admin',
        label: '🛡️ Administrador',
        count: adminUnread,
        link: 'ParentAdminChat',
        icon: '🛡️',
      },
      {
        source: 'private',
        label: '💬 Mensajes Privados',
        count: privateUnread,
        link: 'PrivateChat',
        icon: '💬',
      },
      {
        source: 'staff',
        label: '💼 Staff Chat',
        count: staffUnread,
        link: 'StaffChat',
        icon: '💼',
      },
    ].filter((item) => item.count > 0), // Solo mostrar si hay sin leer
  };
}