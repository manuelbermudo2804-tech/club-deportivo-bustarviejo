import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ChatNotificationListener({ user }) {
  const lastSeenMessageId = useRef(null);

  console.log('🎯 ChatNotificationListener montado, user:', user?.email);

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessagesListener'],
    queryFn: async () => {
      console.log('📡 Fetching mensajes...');
      const result = await base44.entities.ChatMessage.list('-created_date');
      console.log('📨 Mensajes recibidos:', result?.length);
      return result;
    },
    initialData: [],
    refetchInterval: 5000,
    enabled: !!user,
  });

  useEffect(() => {
    if (!user || !messages || messages.length === 0) return;

    try {
      console.log('🔍 Procesando mensajes, total:', messages.length);
      console.log('👤 Usuario:', user.email, 'Admin:', user.role === "admin", 'Entrenador:', user.es_entrenador);
      
      // Mostrar los últimos 3 mensajes para debug
      messages.slice(0, 3).forEach((m, i) => {
        console.log(`📩 Mensaje ${i}:`, m.tipo, m.remitente_email, m.created_date);
      });
      
      // Filtrar mensajes relevantes - NO FILTRAR POR LEIDO para detectar nuevos
      const relevantMessages = messages.filter(m => {
        if (!m) return false;
        if (m.remitente_email === user.email) return false;
        
        // Mensajes de los últimos 5 minutos
        const msgDate = new Date(m.created_date);
        const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
        if (msgDate < fiveMinutesAgo) return false;
        
        if (user.role === "admin") {
          return m.tipo === "padre_a_grupo";
        }
        
        if (user.es_entrenador) {
          const categoriesCoached = user.categorias_entrena || [];
          return m.tipo === "padre_a_grupo" && categoriesCoached.includes(m.grupo_id || m.deporte);
        }
        
        return m.tipo === "admin_a_grupo";
      });
      
      console.log('✅ Mensajes relevantes encontrados:', relevantMessages.length);

      const latestMessage = relevantMessages[0];
      
      if (latestMessage && latestMessage.id !== lastSeenMessageId.current) {
        console.log('🔔 Nuevo mensaje detectado:', latestMessage.mensaje?.substring(0, 50));
        
        // Intentar notificación del navegador
        if (typeof window !== 'undefined' && 'Notification' in window) {
          if (Notification.permission === 'granted') {
            try {
              const emoji = latestMessage.prioridad === "Urgente" ? "🔴" : "💬";
              new Notification(`${emoji} ${latestMessage.remitente_nombre || 'CD Bustarviejo'}`, {
                body: (latestMessage.mensaje || '').substring(0, 100),
                icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
                tag: latestMessage.id,
                requireInteraction: false
              });
              console.log('✅ Notificación enviada');
            } catch (e) {
              console.log('❌ Notification error:', e);
            }
          } else {
            console.log('⚠️ Permiso de notificaciones:', Notification.permission);
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