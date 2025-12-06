import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Hook para polling adaptativo inteligente
 * - 5s cuando chat activo y usuario escribiendo
 * - 15s cuando chat visible pero inactivo
 * - 60s cuando pestaña en background
 */
export default function useAdaptivePolling({ 
  queryKeys = [], 
  isActive = false,
  isTyping = false 
}) {
  const queryClient = useQueryClient();
  const intervalRef = useRef(null);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    // Detectar visibilidad de la pestaña
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
      updatePollingInterval();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    const updatePollingInterval = () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }

      let interval;
      
      if (!isVisibleRef.current) {
        // Pestaña en background: 30s
        interval = 30000;
      } else if (isActive && isTyping) {
        // Usuario activo escribiendo: 2s (ultra-rápido como WhatsApp)
        interval = 2000;
      } else if (isActive) {
        // Chat abierto pero no escribiendo: 5s (muy rápido)
        interval = 5000;
      } else {
        // Chat cerrado o inactivo: 20s
        interval = 20000;
      }

      intervalRef.current = setInterval(() => {
        queryKeys.forEach(key => {
          queryClient.invalidateQueries({ queryKey: key });
        });
      }, interval);
    };

    updatePollingInterval();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isActive, isTyping, queryClient, queryKeys]);

  // Función para forzar refresh inmediato
  const forceRefresh = () => {
    queryKeys.forEach(key => {
      queryClient.invalidateQueries({ queryKey: key });
    });
  };

  return { forceRefresh };
}