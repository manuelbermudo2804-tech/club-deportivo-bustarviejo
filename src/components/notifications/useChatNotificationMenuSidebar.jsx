import { useState, useEffect } from 'react';
import { UnifiedChatNotificationStore } from './UnifiedChatNotificationStore';

/**
 * Hook para el MENÚ LATERAL (avisos)
 * 
 * CRÍTICO: Lee del MISMO estado que las burbujas
 * No tiene lógica propia - es un espejo del estado global
 */
export function useChatNotificationMenuSidebar(user) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!user?.email) return;

    // Inicializar
    UnifiedChatNotificationStore.initUser(user.email);

    // Suscribirse a cambios - EXACTAMENTE el mismo que burbujas
    const unsubscribe = UnifiedChatNotificationStore.subscribe(
      user.email,
      (state) => {
        setCounts(state);
      }
    );

    return unsubscribe;
  }, [user?.email]);

  return {
    staffCount: counts.staff || 0,
    coordinatorCount: counts.coordinator || 0,
    coachCount: counts.coach || 0,
    coordinatorForFamilyCount: counts.coordinatorForFamily || 0,
    coachForFamilyCount: counts.coachForFamily || 0,
    systemMessagesCount: counts.systemMessages || 0,
    adminCount: counts.admin || 0,
  };
}