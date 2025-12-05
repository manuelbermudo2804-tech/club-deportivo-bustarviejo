import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ChatNotificationListener({ user }) {
  const lastSeenChatId = useRef(null);
  const lastSeenPrivateId = useRef(null);

  console.log('🎯 ChatNotificationListener montado, user:', user?.email);

  // Mensajes de grupo
  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chatMessagesListener'],
    queryFn: async () => {
      console.log('📡 Fetching mensajes grupo...');
      const result = await base44.entities.ChatMessage.list('-created_date', 20);
      console.log('📨 Mensajes grupo recibidos:', result?.length);
      return result;
    },
    initialData: [],
    refetchInterval: 10000,
    enabled: !!user,
  });

  // Mensajes privados (para entrenadores/coordinadores/admin)
  const { data: privateMessages = [] } = useQuery({
    queryKey: ['privateMessagesListener'],
    queryFn: async () => {
      if (!user?.role === "admin" && !user?.es_entrenador && !user?.es_coordinador) {
        return [];
      }
      console.log('📡 Fetching mensajes privados...');
      const result = await base44.entities.PrivateMessage.list('-created_date', 20);
      console.log('📨 Mensajes privados recibidos:', result?.length);
      return result;
    },
    initialData: [],
    refetchInterval: 10000,
    enabled: !!user && (user.role === "admin" || user.es_entrenador || user.es_coordinador),
  });

  // Procesar mensajes de grupo
  useEffect(() => {
    if (!user || !chatMessages || chatMessages.length === 0) return;

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const relevantMessages = chatMessages.filter(m => {
        if (!m) return false;
        if (m.remitente_email === user.email) return false;
        
        const msgDate = new Date(m.created_date);
        if (msgDate < fiveMinutesAgo) return false;
        
        if (user.role === "admin") {
          return m.tipo === "padre_a_grupo";
        }
        
        if (user.es_entrenador || user.es_coordinador) {
          const categoriesCoached = user.categorias_entrena || [];
          return m.tipo === "padre_a_grupo" && categoriesCoached.includes(m.grupo_id || m.deporte);
        }
        
        return m.tipo === "admin_a_grupo";
      });

      const latestMessage = relevantMessages[0];
      
      if (latestMessage && latestMessage.id !== lastSeenChatId.current) {
        console.log('🔔 Nuevo mensaje grupo:', latestMessage.mensaje?.substring(0, 30));
        showNotification(latestMessage.remitente_nombre, latestMessage.mensaje, latestMessage.id, latestMessage.prioridad);
        lastSeenChatId.current = latestMessage.id;
      }
    } catch (e) {
      console.log('ChatNotificationListener chat error:', e);
    }
  }, [chatMessages, user]);

  // Procesar mensajes privados
  useEffect(() => {
    if (!user || !privateMessages || privateMessages.length === 0) return;
    if (user.role !== "admin" && !user.es_entrenador && !user.es_coordinador) return;

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const relevantMessages = privateMessages.filter(m => {
        if (!m) return false;
        if (m.remitente_email === user.email) return false;
        
        const msgDate = new Date(m.created_date);
        if (msgDate < fiveMinutesAgo) return false;
        
        // Solo mensajes de padres a entrenadores/admin
        return m.remitente_tipo === "padre";
      });

      console.log('🔍 Mensajes privados relevantes:', relevantMessages.length);
      
      const latestMessage = relevantMessages[0];
      
      if (latestMessage && latestMessage.id !== lastSeenPrivateId.current) {
        console.log('🔔 Nuevo mensaje privado:', latestMessage.mensaje?.substring(0, 30));
        showNotification(`📩 ${latestMessage.remitente_nombre}`, latestMessage.mensaje, latestMessage.id);
        lastSeenPrivateId.current = latestMessage.id;
      }
    } catch (e) {
      console.log('ChatNotificationListener private error:', e);
    }
  }, [privateMessages, user]);

  const showNotification = (title, body, id, priority) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const emoji = priority === "Urgente" ? "🔴" : "💬";
        new Notification(`${emoji} ${title || 'CD Bustarviejo'}`, {
          body: (body || '').substring(0, 100),
          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
          tag: id,
          requireInteraction: false
        });
        console.log('✅ Notificación enviada');
      } catch (e) {
        console.log('❌ Notification error:', e);
      }
    }
  };

  return null;
}