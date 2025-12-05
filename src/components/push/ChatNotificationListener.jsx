import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function ChatNotificationListener({ user }) {
  const lastSeenChatId = useRef(null);
  const lastSeenPrivateId = useRef(null);
  const [userCategories, setUserCategories] = useState([]);

  // Obtener categorías del usuario (para padres, basado en sus hijos)
  useEffect(() => {
    if (!user) return;
    
    const fetchCategories = async () => {
      try {
        if (user.role === "admin" || user.es_entrenador || user.es_coordinador) {
          setUserCategories(user.categorias_entrena || []);
        } else {
          // Para padres, obtener categorías de sus hijos
          const players = await base44.entities.Player.list();
          const myPlayers = players.filter(p => 
            p.email_padre === user.email || p.email_tutor_2 === user.email
          );
          const categories = [...new Set(myPlayers.map(p => p.deporte).filter(Boolean))];
          setUserCategories(categories);
        }
      } catch (e) {
        console.log('Error fetching categories:', e);
      }
    };
    fetchCategories();
  }, [user]);

  // Mensajes de grupo
  const { data: chatMessages = [] } = useQuery({
    queryKey: ['chatMessagesListener'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 30),
    initialData: [],
    refetchInterval: 2000,
    enabled: !!user,
  });

  // Mensajes privados
  const { data: privateMessages = [] } = useQuery({
    queryKey: ['privateMessagesListener'],
    queryFn: () => base44.entities.PrivateMessage.list('-created_date', 30),
    initialData: [],
    refetchInterval: 2000,
    enabled: !!user,
  });

  // Procesar mensajes de grupo
  useEffect(() => {
    if (!user || !chatMessages || chatMessages.length === 0) return;

    console.log('📨 Procesando mensajes grupo. Total:', chatMessages.length, 'User:', user.email, 'Role:', user.role, 'esEntrenador:', user.es_entrenador, 'esCoordinador:', user.es_coordinador);

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const relevantMessages = chatMessages.filter(m => {
        if (!m || m.remitente_email === user.email) return false;
        
        const msgDate = new Date(m.created_date);
        if (msgDate < fiveMinutesAgo) return false;

        const msgCategory = m.grupo_id || m.deporte;

        // ADMIN: recibe mensajes de padres de cualquier grupo
        if (user.role === "admin") {
          return m.tipo === "padre_a_grupo";
        }
        
        // ENTRENADOR/COORDINADOR: recibe mensajes de padres de sus categorías
        if (user.es_entrenador || user.es_coordinador) {
          if (m.tipo === "padre_a_grupo") {
            const coachCategories = user.categorias_entrena || [];
            return coachCategories.includes(msgCategory);
          }
        }
        
        // PADRES: reciben mensajes admin_a_grupo de las categorías de sus hijos
        if (m.tipo === "admin_a_grupo") {
          return userCategories.includes(msgCategory);
        }
        
        return false;
      });

      console.log('🔍 Mensajes relevantes grupo:', relevantMessages.length, 'lastSeenId:', lastSeenChatId.current);

      const latestMessage = relevantMessages[0];
      
      if (latestMessage && latestMessage.id !== lastSeenChatId.current) {
        console.log('🆕 Nuevo mensaje detectado:', latestMessage.id);
        showNotification(latestMessage.remitente_nombre, latestMessage.mensaje, latestMessage.id, latestMessage.prioridad);
        lastSeenChatId.current = latestMessage.id;
      }
    } catch (e) {
      console.log('ChatNotificationListener chat error:', e);
    }
  }, [chatMessages, user, userCategories]);

  // Procesar mensajes privados
  useEffect(() => {
    if (!user || !privateMessages || privateMessages.length === 0) return;

    console.log('📩 Procesando mensajes privados. Total:', privateMessages.length, 'User:', user.email);

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const relevantMessages = privateMessages.filter(m => {
        if (!m || m.remitente_email === user.email) return false;
        
        const msgDate = new Date(m.created_date);
        if (msgDate < fiveMinutesAgo) return false;
        
        // Verificar si el usuario es participante de esta conversación
        const isParticipant = m.participantes?.includes(user.email) || 
                              m.destinatario_email === user.email ||
                              m.conversation_id?.includes(user.email);
        
        console.log('📩 Mensaje:', m.id, 'de:', m.remitente_email, 'participantes:', m.participantes, 'isParticipant:', isParticipant);
        
        if (isParticipant) return true;
        
        // Fallback: Para entrenadores/coordinadores/admin que reciben de padres
        if (user.role === "admin" || user.es_entrenador || user.es_coordinador) {
          if (m.remitente_tipo === "padre" || m.staff_email === user.email) return true;
        }
        
        // Fallback: Para padres que reciben de staff
        if (m.remitente_tipo === "entrenador" || m.remitente_tipo === "admin" || m.remitente_tipo === "coordinador") {
          if (m.padre_email === user.email) return true;
        }
        
        return false;
      });
      
      console.log('📩 Mensajes privados relevantes:', relevantMessages.length);
      
      const latestMessage = relevantMessages[0];
      
      if (latestMessage && latestMessage.id !== lastSeenPrivateId.current) {
        console.log('🆕 Nuevo mensaje privado detectado:', latestMessage.id);
        showNotification(`📩 ${latestMessage.remitente_nombre}`, latestMessage.mensaje, latestMessage.id);
        lastSeenPrivateId.current = latestMessage.id;
      }
    } catch (e) {
      console.log('ChatNotificationListener private error:', e);
    }
  }, [privateMessages, user]);

  const showNotification = (title, body, id, priority) => {
    console.log('🔔 showNotification llamada:', { title, body: body?.substring(0, 30), id });
    console.log('🔔 Notification.permission:', typeof window !== 'undefined' ? Notification?.permission : 'N/A');
    
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const emoji = priority === "Urgente" ? "🔴" : "💬";
        new Notification(`${emoji} ${title || 'CD Bustarviejo'}`, {
          body: (body || '').substring(0, 100),
          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
          tag: id,
          requireInteraction: false
        });
        console.log('✅ Notificación creada');
      } catch (e) {
        console.log('❌ Notification error:', e);
      }
    } else {
      console.log('⚠️ Notificaciones NO habilitadas o no soportadas');
    }
  };

  return null;
}