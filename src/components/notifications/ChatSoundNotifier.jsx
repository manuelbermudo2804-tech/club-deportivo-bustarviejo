import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useSoundNotifications } from './useSoundNotifications';

export default function ChatSoundNotifier({ user, chatType = 'all' }) {
  const { data: messages } = useQuery({
    queryKey: ['chat-messages', chatType],
    queryFn: async () => {
      if (chatType === 'coordinator') {
        const convs = await base44.entities.CoordinatorConversation.filter({ 
          resuelta: false 
        }, '-updated_date', 100);
        return convs;
      } else if (chatType === 'coach') {
        return await base44.entities.ChatMessage.list('-created_date', 100);
      } else if (chatType === 'admin') {
        return await base44.entities.AdminConversation.filter({ 
          resuelta: false 
        }, '-updated_date', 100);
      } else if (chatType === 'staff') {
        return await base44.entities.StaffMessage.list('-created_date', 100);
      }
      return [];
    },
    refetchInterval: 10000, // 10 segundos
    enabled: !!user
  });

  const { checkForNewItems } = useSoundNotifications({
    dataKey: `chat-${chatType}`,
    enabled: true,
    filter: (item) => {
      // Solo notificar mensajes no leídos del usuario actual
      if (chatType === 'coordinator' || chatType === 'admin') {
        return item.updated_date && new Date(item.updated_date) > new Date(Date.now() - 60000);
      }
      return !item.leido_por?.some(l => l.email === user?.email);
    }
  });

  useEffect(() => {
    if (messages) {
      checkForNewItems(messages);
    }
  }, [messages, checkForNewItems]);

  return null; // Componente invisible
}