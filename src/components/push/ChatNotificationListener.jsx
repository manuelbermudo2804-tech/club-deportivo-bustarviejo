import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ChatNotificationListener({ user }) {
  const lastSeenMessageId = useRef(null);

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessagesListener'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 5000,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || !messages || messages.length === 0) return;

    try {
      // Filtrar mensajes relevantes
      const relevantMessages = messages.filter(m => {
        if (!m || m.leido) return false;
        if (m.remitente_email === user.email) return false;
        
        if (user.role === "admin") {
          return m.tipo === "padre_a_grupo";
        }
        
        if (user.es_entrenador) {
          const categoriesCoached = user.categorias_entrena || [];
          return m.tipo === "padre_a_grupo" && categoriesCoached.includes(m.grupo_id || m.deporte);
        }
        
        return m.tipo === "admin_a_grupo";
      });

      const latestMessage = relevantMessages[0];
      if (latestMessage && latestMessage.id !== lastSeenMessageId.current) {
        // Solo mostrar notificación si hay permiso
        if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
          try {
            const emoji = latestMessage.prioridad === "Urgente" ? "🔴" : "💬";
            new Notification(`${emoji} ${latestMessage.remitente_nombre || 'CD Bustarviejo'}`, {
              body: (latestMessage.mensaje || '').substring(0, 100),
              icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg"
            });
          } catch (e) {
            console.log('Notification error:', e);
          }
        }
        lastSeenMessageId.current = latestMessage.id;
      }
    } catch (e) {
      console.log('ChatNotificationListener error:', e);
    }
  }, [messages, user]);

  return null;
}