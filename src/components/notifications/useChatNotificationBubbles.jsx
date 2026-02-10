import { useState, useEffect } from 'react';
import { UnifiedChatNotificationStore } from './UnifiedChatNotificationStore';

/**
 * Hook para las BURBUJAS (parte superior)
 * 
 * Características:
 * - Lee del estado unificado GLOBAL
 * - Se actualiza en tiempo real
 * - NO se limpia al entrar en otros chats
 * - SOLO se limpia cuando el usuario abre ESE chat específico
 */
export function useChatNotificationBubbles(user) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!user?.email) {
      // CRÍTICO: Limpiar al logout
      UnifiedChatNotificationStore.reset();
      setCounts({});
      return;
    }

    UnifiedChatNotificationStore.initUser(user.email);
    const unsubscribe = UnifiedChatNotificationStore.subscribe(
      user.email,
      (state) => {
        setCounts(state);
      }
    );

    return () => {
      unsubscribe();
      // Limpiar al desmontar
      UnifiedChatNotificationStore.resetUser(user.email);
    };
  }, [user?.email]);

  return {
    staffBubble: counts.staff || 0,
    coordinatorBubble: counts.coordinator || 0,
    coachBubble: counts.coach || 0,
    coordinatorForFamilyBubble: counts.coordinatorForFamily || 0,
    coachForFamilyBubble: counts.coachForFamily || 0,
    systemMessagesBubble: counts.systemMessages || 0,
    adminBubble: counts.admin || 0,
    hasAnyUnread: Object.values(counts).some(c => c > 0)
  };
}