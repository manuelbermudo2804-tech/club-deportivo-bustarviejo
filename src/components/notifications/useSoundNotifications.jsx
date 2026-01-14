import { useEffect, useRef } from 'react';

// Sonido sutil de notificación (beep corto)
const NOTIFICATION_SOUND = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBi+K0/LTgjMGHm7A7+OZSA0PVqzn77BfGwc+ltzy0H8pBSh+zPDajzsIGGS56+qbUhELTKXh8bllHQU2jdT0zoU1Bx1rwO7mnEsPEFis5O+zYBoGPZTX8tGAKgUpf8zv3I4+CBhls+njnlQSC06n4fK7aB8FN4/V88mCNAYfbL/u5aFNDRBYr+Txs2IaBz2V2PLRgCsEKH/N79yOPQgYZbLo45xUEwtOqOHyumccBTiP1fPJgzQGHmy/7uWhTQwQWK/k8bJiGwc9ldjy0YArBSh/ze/cjj0IGGWy6OOcVBMLTqjh8rtoHAU4j9Xzy';

export function useSoundNotifications({ 
  enabled = true,
  filter = () => true // función para filtrar qué items cuentan
}) {
  const previousIdsRef = useRef(new Set());
  const audioRef = useRef(null);

  useEffect(() => {
    if (!enabled) return;

    // Crear el audio una sola vez
    if (!audioRef.current) {
      audioRef.current = new Audio(NOTIFICATION_SOUND);
      audioRef.current.volume = 0.5; // Volumen audible
    }
  }, [enabled]);

  const checkForNewItems = (items) => {
    if (!enabled || !items) return;

    const filteredItems = items.filter(filter);
    const currentIds = new Set(filteredItems.map(item => item.id));

    // Inicializar si es la primera vez
    if (previousIdsRef.current.size === 0) {
      previousIdsRef.current = currentIds;
      return;
    }

    // Detectar IDs nuevos que no estaban antes
    const newItems = [...currentIds].filter(id => !previousIdsRef.current.has(id));

    // Si hay items nuevos, reproducir sonido
    if (newItems.length > 0) {
      console.log('🔔 Nuevo mensaje detectado, reproduciendo sonido');
      try {
        audioRef.current?.play().catch((e) => {
          console.log('Autoplay bloqueado:', e);
        });
      } catch (e) {
        console.error('Error reproduciendo sonido:', e);
      }
    }

    previousIdsRef.current = currentIds;
  };

  return { checkForNewItems };
}