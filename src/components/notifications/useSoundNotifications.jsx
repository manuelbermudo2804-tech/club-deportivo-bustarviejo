import { useEffect, useRef } from 'react';

// Sonido sutil de notificación (beep corto)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi+K0/LTgjMGHm7A7+OZSA0PVqzn77BfGwc+ltzy0H8pBSh+zPDajzsIGGS56+qbUhELTKXh8bllHQU2jdT0zoU1Bx1rwO7mnEsPEFis5O+zYBoGPZTX8tGAKgUpf8zv3I4+CBhls+njnlQSC06n4fK7aB8FN4/V88mCNAYfbL/u5aFNDRBYr+Txs2IaBz2V2PLRgCsEKH/N79yOPQgYZbLo45xUEwtOqOHyumccBTiP1fPJgzQGHmy/7uWhTQwQWK/k8bJiGwc9ldjy0YArBSh/ze/cjj0IGGWy6OOcVBMLTqjh8rtoHAU4j9Xzy';

export function useSoundNotifications({ 
  dataKey, 
  enabled = true,
  pollInterval = 10000, // 10 segundos
  filter = () => true // función para filtrar qué items cuentan
}) {
  const previousCountRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    // Crear el audio una sola vez
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND);
      audioRef.current.volume = 0.3; // Volumen sutil
    }
  }, [enabled]);

  const checkForNewItems = (items) => {
    if (!enabled || !items) return;

    const filteredItems = items.filter(filter);
    const currentCount = filteredItems.length;

    // Inicializar si es la primera vez
    if (previousCountRef.current === null) {
      previousCountRef.current = currentCount;
      return;
    }

    // Si hay nuevos items, reproducir sonido
    if (currentCount > previousCountRef.current) {
      try {
        audioRef.current?.play().catch(() => {
          // Silenciar errores de autoplay
        });
      } catch (e) {
        // Ignorar errores
      }
    }

    previousCountRef.current = currentCount;
  };

  return { checkForNewItems };
}