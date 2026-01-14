import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSoundNotifications } from './useSoundNotifications';

export default function AnnouncementSoundNotifier({ user }) {
  const { data: announcements } = useQuery({
    queryKey: ['announcements-sound'],
    queryFn: () => base44.entities.Announcement.list('-created_date', 50),
    refetchInterval: 10000,
    enabled: !!user
  });

  const { checkForNewItems } = useSoundNotifications({
    dataKey: 'announcements',
    enabled: true,
    filter: (announcement) => {
      // Solo anuncios urgentes/importantes no leídos de las últimas 24h
      const isUrgent = announcement.prioridad === 'Urgente' || announcement.prioridad === 'Importante';
      const isRecent = new Date(announcement.created_date) > new Date(Date.now() - 24 * 60 * 60 * 1000);
      const isUnread = !announcement.leido_por?.some(l => l.email === user?.email);
      return isUrgent && isRecent && isUnread && announcement.publicado;
    }
  });

  useEffect(() => {
    if (announcements) {
      checkForNewItems(announcements);
    }
  }, [announcements, checkForNewItems]);

  return null;
}