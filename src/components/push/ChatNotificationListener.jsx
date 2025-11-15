import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ChatNotificationListener({ user }) {
  const previousMessageCount = useRef(0);

  const { data: messages } = useQuery({
    queryKey: ['chatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    initialData: [],
    refetchInterval: 5000,
    enabled: !!user,
  });

  const { data: directMessages } = useQuery({
    queryKey: ['directMessages'],
    queryFn: () => base44.entities.DirectMessage.list(),
    initialData: [],
    refetchInterval: 5000,
    enabled: !!user,
  });

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

    // Mensajes directos no leídos
    const unreadDirectMessages = directMessages.filter(m => 
      m.destinatario_email === user.email && !m.leido
    );

    const totalUnread = unreadGroupMessages.length + unreadDirectMessages.length;

    // Si hay nuevos mensajes desde la última verificación
    if (totalUnread > previousMessageCount.current && previousMessageCount.current > 0) {
      const newMessages = totalUnread - previousMessageCount.current;
      
      // Notificación para mensajes de grupo urgentes
      if (unreadGroupMessages.length > 0) {
        const lastMessage = unreadGroupMessages[0];
        new Notification("💬 Mensaje Urgente del Club", {
          body: lastMessage.mensaje.substring(0, 100) + "...",
          icon: "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png",
          tag: 'group-chat',
          requireInteraction: true
        });
      }
      
      // Notificación para mensajes directos
      if (unreadDirectMessages.length > 0) {
        const lastDM = unreadDirectMessages[0];
        new Notification(`💬 Mensaje de ${lastDM.remitente_nombre}`, {
          body: lastDM.mensaje.substring(0, 100),
          icon: "https://www.cdbustarviejo.com/uploads/2/4/0/4/2404974/logo-cd-bustarviejo-cuadrado-xpeq_orig.png",
          tag: 'direct-message',
          requireInteraction: false
        });
      }
    }

    previousMessageCount.current = totalUnread;
  }, [messages, directMessages, user]);

  return null; // Este componente no renderiza nada
}