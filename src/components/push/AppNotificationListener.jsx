import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function AppNotificationListener({ user }) {
  // Mantener un Set de IDs de notificaciones ya mostradas (persiste en localStorage)
  const [notifiedAppIds, setNotifiedAppIds] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('notifiedAppIds');
      return stored ? new Set(JSON.parse(stored)) : new Set();
    }
    return new Set();
  });

  // Notificaciones de la app - polling cada 30 segundos
  const { data: appNotifications = [] } = useQuery({
    queryKey: ['appNotificationsListener', user?.email],
    queryFn: async () => {
      if (!user?.email) return [];
      const all = await base44.entities.AppNotification.list('-created_date', 20);
      return all.filter(n => n.usuario_email === user.email);
    },
    initialData: [],
    refetchInterval: 30000,
    enabled: !!user?.email,
    staleTime: 25000,
  });

  // Procesar notificaciones de la app
  useEffect(() => {
    if (!user || !appNotifications || appNotifications.length === 0) return;

    try {
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
      const relevantNotifications = appNotifications.filter(n => {
        if (!n) return false;
        
        const notifDate = new Date(n.created_date);
        if (notifDate < fiveMinutesAgo) return false;

        // IGNORAR notificaciones de chat coordinador
        if (n.tipo === "coordinador_chat") return false;

        return true;
      });

      // Notificar solo las que NO hemos mostrado antes
      relevantNotifications.forEach(notif => {
        if (!notifiedAppIds.has(notif.id)) {
          console.log('🆕 Nueva notificación app detectada:', notif.id);
          showNotification(notif.titulo, notif.mensaje, notif.id, notif.tipo);
          
          // Agregar al Set de notificadas
          setNotifiedAppIds(prev => {
            const newSet = new Set(prev);
            newSet.add(notif.id);
            // Guardar en localStorage
            if (typeof window !== 'undefined') {
              localStorage.setItem('notifiedAppIds', JSON.stringify([...newSet]));
            }
            return newSet;
          });
        }
      });
    } catch (e) {
      console.log('AppNotificationListener error:', e);
    }
  }, [appNotifications, user]);

  const showNotification = (title, body, id, tipo) => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const emoji = tipo === "urgente" ? "🔴" : tipo === "importante" ? "⚠️" : "ℹ️";
        new Notification(`${emoji} ${title || 'CD Bustarviejo'}`, {
          body: (body || '').substring(0, 100),
          icon: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg",
          tag: id,
          requireInteraction: false
        });
      } catch (e) {
        console.log('Notification error:', e);
      }
    }
  };

  return null;
}