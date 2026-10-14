import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

// Refresca una consulta al instante cuando cambia la entidad (tiempo real, sin sondeo)
export default function useLiveRefetch(entityName, queryKey, enabled = true) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const unsub = base44.entities[entityName].subscribe(() => {
      qc.invalidateQueries({ queryKey });
    });
    return unsub;
  }, [entityName, enabled]);
}