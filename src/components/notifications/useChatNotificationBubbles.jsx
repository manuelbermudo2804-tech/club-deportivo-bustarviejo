import { useState, useEffect } from 'react';

/**
 * Hook para las BURBUJAS (parte superior)
 * DESACTIVADO - Sistema antiguo eliminado
 * TODO: Reimplementar con nuevo sistema last_read_at
 */
export function useChatNotificationBubbles(user) {
  const [counts, setCounts] = useState({});

  useEffect(() => {
    if (!user?.email) {
      setCounts({});
      return;
    }

    // TODO: Implementar nuevo sistema last_read_at
    setCounts({});

  }, [user?.email]);

  return {
    staffBubble: 0,
    coordinatorBubble: 0,
    coachBubble: 0,
    coordinatorForFamilyBubble: 0,
    coachForFamilyBubble: 0,
    systemMessagesBubble: 0,
    adminBubble: 0,
    hasAnyUnread: false
  };
}