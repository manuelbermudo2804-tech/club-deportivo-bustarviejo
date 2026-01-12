import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

/**
 * Hook UNIVERSAL que obtiene TODOS los contadores de chats sin leer
 * Retorna estructura unificada para mostrar en AlertCenter y NotificationCenter
 */
export function useChatNotifications(enabled = true) {
  // Cargar todas las conversaciones en paralelo
  const { data: coordinatorConversations = [] } = useQuery({
    queryKey: ['coordinatorConversations'],
    queryFn: () => base44.entities.CoordinatorConversation.list(),
    enabled: enabled,
    refetchInterval: 3000,
  });

  const { data: adminConversations = [] } = useQuery({
    queryKey: ['adminConversations'],
    queryFn: () => base44.entities.AdminConversation.list(),
    enabled: enabled,
    refetchInterval: 3000,
  });

  const { data: privateConversations = [] } = useQuery({
    queryKey: ['privateConversations'],
    queryFn: () => base44.entities.PrivateConversation.list(),
    enabled: enabled,
    refetchInterval: 3000,
  });

  const { data: staffMessages = [] } = useQuery({
    queryKey: ['staffMessages'],
    queryFn: () => base44.entities.StaffMessage.list('-created_date', 500),
    enabled: enabled,
    refetchInterval: 3000,
  });

  // Calcular contadores totales
  const coordinatorUnread = coordinatorConversations.reduce(
    (sum, c) => sum + (c.no_leidos_padre || c.no_leidos_coordinador || 0),
    0
  );

  const adminUnread = adminConversations.reduce(
    (sum, c) => sum + (c.no_leidos_padre || c.no_leidos_admin || 0),
    0
  );

  const privateUnread = privateConversations.reduce(
    (sum, c) => sum + (c.no_leidos_familia || c.no_leidos_staff || 0),
    0
  );

  const staffUnread = staffMessages.filter(
    (m) => !m.leido_por?.some((lp) => lp.email === base44.auth.me()?.email)
  ).length;

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