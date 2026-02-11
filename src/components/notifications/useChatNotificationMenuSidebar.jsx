import { useState, useEffect } from 'react';

/**
 * Hook para el MENÚ LATERAL (avisos)
 * 
 * TEMPORAL: Retorna 0s hasta implementar nuevo sistema
 */
export function useChatNotificationMenuSidebar(user) {
  return {
    staffCount: 0,
    coordinatorCount: 0,
    coachCount: 0,
    coordinatorForFamilyCount: 0,
    coachForFamilyCount: 0,
    systemMessagesCount: 0,
    adminCount: 0,
  };
}