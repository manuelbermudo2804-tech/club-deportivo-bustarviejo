import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ChatNotificationListener({ user }) {
  const previousMessageCount = useRef(0);
  const lastSeenMessageId = useRef(null);

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date'),
    initialData: [],
    refetchInterval: 15000, // Check every 15 seconds
    refetchOnWindowFocus: true,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || messages.length === 0) return;

    // Filtrar mensajes relevantes para este usuario
    const relevantMessages = messages.filter(m => {
      if (m.leido) return false;
      if (m.remitente_email === user.email) return false; // No notificar propios mensajes
      
      // Para admins: mensajes de padres urgentes
      if (user.role === "admin") {
        return m.tipo === "padre_a_grupo";
      }
      
      // Para entrenadores: mensajes de padres en sus categorías
      if (user.es_entrenador) {
        const categoriesCoached = user.categorias_entrena || [];
        return m.tipo === "padre_a_grupo" && categoriesCoached.includes(m.grupo_id || m.deporte);
      }
      
      // Para padres: mensajes del admin/entrenador en sus grupos
      return m.tipo === "admin_a_grupo";
    });

    // Verificar si hay mensajes nuevos
    const latestMessage = relevantMessages[0];
    if (latestMessage && latestMessage.id !== lastSeenMessageId.current) {
      // Mostrar notificación local si tenemos permiso
      if (Notification.permission === 'granted') {
        const prioridadEmoji = latestMessage.prioridad === "Urgente" ? "🔴" : 
                               latestMessage.prioridad === "Importante" ? "🟠" : "💬";
        
        new Notification(`${prioridadEmoji} ${latestMessage.remitente_nombre || 'CD Bustarviejo'}`, {
          body: latestMessage.mensaje.substring(0, 100) + (latestMessage.mensaje.length > 100 ? "..." : ""),
          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
          tag: `chat-${latestMessage.id}`,
          requireInteraction: latestMessage.prioridad === "Urgente",
          vibrate: [200, 100, 200]
        });
      }
      
      lastSeenMessageId.current = latestMessage.id;
    }

    previousMessageCount.current = relevantMessages.length;
  }, [messages, user]);

  return null;
}