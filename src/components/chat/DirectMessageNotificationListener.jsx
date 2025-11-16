import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

export default function DirectMessageNotificationListener({ user }) {
  const { data: messages } = useQuery({
    queryKey: ['directMessages'],
    queryFn: () => base44.entities.DirectMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 5000,
  });

  useEffect(() => {
    if (!user) return;

    const unreadMessages = messages.filter(
      m => m.destinatario_email === user.email && !m.leido
    );

    if (unreadMessages.length > 0) {
      const latestMessage = unreadMessages[0];
      const messageTime = new Date(latestMessage.created_date);
      const now = new Date();
      const diffInSeconds = (now - messageTime) / 1000;

      // Solo notificar si el mensaje es reciente (menos de 10 segundos)
      if (diffInSeconds < 10) {
        toast.info(`💬 Nuevo mensaje de ${latestMessage.remitente_nombre}`, {
          description: latestMessage.mensaje.substring(0, 50) + (latestMessage.mensaje.length > 50 ? '...' : ''),
          duration: 5000,
        });

        // Enviar notificación push si está disponible
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification(`Mensaje de ${latestMessage.remitente_nombre}`, {
            body: latestMessage.mensaje.substring(0, 100),
            icon: '/logo.png',
            badge: '/logo.png',
            tag: 'direct-message'
          });
        }
      }
    }
  }, [messages, user]);

  return null;
}