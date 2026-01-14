import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSoundNotifications } from './useSoundNotifications';

export default function CallupSoundNotifier({ user }) {
  const { data: callups } = useQuery({
    queryKey: ['callups-sound'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date', 50),
    refetchInterval: 10000,
    enabled: !!user && user.role !== 'admin'
  });

  const { checkForNewItems } = useSoundNotifications({
    dataKey: 'callups',
    enabled: true,
    filter: (callup) => {
      // Solo convocatorias publicadas de las últimas 24h sin confirmar
      if (!callup.publicada) return false;
      const isRecent = new Date(callup.created_date) > new Date(Date.now() - 24 * 60 * 60 * 1000);
      const needsConfirmation = callup.jugadores_convocados?.some(j => 
        (j.email_padre === user?.email || j.email_jugador === user?.email) && 
        j.confirmacion === 'pendiente'
      );
      return isRecent && needsConfirmation;
    }
  });

  useEffect(() => {
    if (callups) {
      checkForNewItems(callups);
    }
  }, [callups, checkForNewItems]);

  return null;
}