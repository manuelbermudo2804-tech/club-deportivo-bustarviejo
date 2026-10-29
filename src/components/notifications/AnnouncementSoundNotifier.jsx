import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { playerBelongsToUser } from '@/components/utils/playerBelongsToUser';
import { playerAllCategories } from '@/components/utils/playerCategoryFilter';
import { useSoundNotifications } from './useSoundNotifications';
import useLiveRefetch from '@/hooks/useLiveRefetch';

export default function AnnouncementSoundNotifier({ user }) {
  const { data: announcements } = useQuery({
    queryKey: ['announcements-sound'],
    queryFn: () => base44.entities.Announcement.list('-created_date', 50),
    staleTime: 5 * 60000,
    enabled: !!user
  });
  useLiveRefetch('Announcement', ['announcements-sound'], !!user);
  const { data: players = [] } = useQuery({
    queryKey: ['announcement-sound-players', user?.email],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!user?.email,
    staleTime: 60_000,
  });
  const categories = [...new Set(players.filter(p => playerBelongsToUser(p, user?.email)).flatMap(p => playerAllCategories(p)))];
  const email = String(user?.email || '').toLowerCase();

  const { checkForNewItems } = useSoundNotifications({
    dataKey: 'announcements',
    enabled: true,
    filter: (announcement) => {
      // Solo anuncios urgentes/importantes no leídos de las últimas 24h
      const isUrgent = announcement.prioridad === 'Urgente' || announcement.prioridad === 'Importante';
      const isRecent = new Date(announcement.created_date) > new Date(Date.now() - 24 * 60 * 60 * 1000);
      const isUnread = !announcement.leido_por?.some(l => l.email === user?.email);
      const targetedEmails = Array.isArray(announcement.destinatarios_emails)
        ? announcement.destinatarios_emails.map(e => String(e || '').toLowerCase().trim()).filter(Boolean)
        : String(announcement.destinatarios_emails || '').split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
      const recipientMatch = targetedEmails.length
        ? targetedEmails.includes(email)
        : (!announcement.destinatarios_tipo || announcement.destinatarios_tipo === 'Todos' || categories.includes(announcement.destinatarios_tipo));
      return isUrgent && isRecent && isUnread && announcement.publicado && recipientMatch;
    }
  });

  useEffect(() => {
    if (announcements) {
      checkForNewItems(announcements);
    }
  }, [announcements, checkForNewItems]);

  return null;
}