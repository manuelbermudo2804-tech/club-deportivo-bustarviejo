import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ChatNotificationListener({ user }) {
  const previousMessageCount = useRef(0);

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
    refetchInterval: 30000,
    enabled: !!user,
  });

  // DirectMessage entity doesn't exist, so we skip it
  const directMessages = [];

  useEffect(() => {
    if (!user || Notification.permission !== 'granted') return;

    // Chat de grupo - mensajes no leídos para el usuario
    const unreadGroupMessages = messages.filter(m => {
      if (m.leido) return false;
      
      // Para admins: mensajes de padres
      if (user.role === "admin") {
        return m.tipo === "padre_a_grupo" && m.prioridad === "Urgente";
      }
      
      // Para entrenadores: mensajes de padres en sus categorías
      if (user.es_entrenador) {
        const categoriesCoached = user.categorias_entrena || [];
        return m.tipo === "padre_a_grupo" && categoriesCoached.includes(m.grupo_id || m.deporte);
      }
      
      // Para padres: mensajes del admin/entrenador
      return m.tipo === "admin_a_grupo";
    });

    const totalUnread = unreadGroupMessages.length;

    // Si hay nuevos mensajes desde la última verificación
    if (totalUnread > previousMessageCount.current && previousMessageCount.current > 0) {
      const newMessages = totalUnread - previousMessageCount.current;
      
      if (unreadGroupMessages.length > 0) {
        const lastMessage = unreadGroupMessages[0];
        new Notification("💬 Mensaje Urgente del Club", {
          body: lastMessage.mensaje.substring(0, 100) + "...",
          icon: "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png",
          tag: 'group-chat',
          requireInteraction: true
        });
      }
    }

    previousMessageCount.current = totalUnread;
  }, [messages, user]);

  return null; // Este componente no renderiza nada
}