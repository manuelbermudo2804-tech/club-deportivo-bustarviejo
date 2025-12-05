import React, { useState, useEffect, useCallback, useRef } from "react";
import { AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import ToastNotification from "./ToastNotification";

const MAX_TOASTS = 3;
const CHECK_INTERVAL = 30000; // 30 segundos

export default function ToastContainer({ user, isAdmin, isCoach }) {
  const [toasts, setToasts] = useState([]);
  const [shownIds, setShownIds] = useState(() => {
    // Recuperar IDs ya mostrados de sessionStorage
    const saved = sessionStorage.getItem('shownToastIds');
    return saved ? JSON.parse(saved) : [];
  });
  const lastCheckRef = useRef({
    messages: null,
    callups: null,
    announcements: null,
    payments: null
  });

  // Cargar preferencias del usuario (solo staff puede personalizar, padres reciben todo)
  const isStaff = isAdmin || isCoach || user?.es_coordinador || user?.es_tesorero;
  
  const { data: preferences } = useQuery({
    queryKey: ['notificationPrefs', user?.email],
    queryFn: async () => {
      // Si no es staff, siempre recibe todas las notificaciones
      if (!isStaff) {
        return {
          notif_mensajes: true,
          notif_convocatorias: true,
          notif_pagos: true,
          notif_anuncios: true,
          notif_eventos: true
        };
      }
      const prefs = await base44.entities.NotificationPreference.list();
      return prefs.find(p => p.usuario_email === user?.email) || {
        notif_mensajes: true,
        notif_convocatorias: true,
        notif_pagos: true,
        notif_anuncios: true,
        notif_eventos: true
      };
    },
    enabled: !!user?.email,
    staleTime: 60000,
  });

  // Cargar jugadores del usuario
  const { data: players } = useQuery({
    queryKey: ['myPlayers', user?.email],
    queryFn: () => base44.entities.Player.list(),
    enabled: !!user?.email && !isAdmin,
    staleTime: 60000,
  });

  const myPlayers = user && players ? players.filter(p => 
    p.email_padre === user.email || p.email_tutor_2 === user.email
  ) : [];
  const myGroupSports = [...new Set(myPlayers.map(p => p.deporte))];

  // Polling para detectar nuevos items
  const { data: messages } = useQuery({
    queryKey: ['toastMessages'],
    queryFn: () => base44.entities.ChatMessage.list('-created_date', 10),
    enabled: !!user && preferences?.notif_mensajes !== false,
    refetchInterval: CHECK_INTERVAL,
  });

  const { data: callups } = useQuery({
    queryKey: ['toastCallups'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date', 5),
    enabled: !!user && preferences?.notif_convocatorias !== false,
    refetchInterval: CHECK_INTERVAL,
  });

  const { data: announcements } = useQuery({
    queryKey: ['toastAnnouncements'],
    queryFn: () => base44.entities.Announcement.list('-created_date', 5),
    enabled: !!user && preferences?.notif_anuncios !== false,
    refetchInterval: CHECK_INTERVAL,
  });

  const addToast = useCallback((toast) => {
    const id = `${toast.type}-${Date.now()}-${Math.random()}`;
    const newToast = { ...toast, id };
    
    setToasts(prev => {
      const updated = [newToast, ...prev].slice(0, MAX_TOASTS);
      return updated;
    });
    
    // Guardar ID para no mostrarlo de nuevo
    setShownIds(prev => {
      const updated = [...prev, toast.sourceId].slice(-100); // Mantener últimos 100
      sessionStorage.setItem('shownToastIds', JSON.stringify(updated));
      return updated;
    });
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Detectar nuevos mensajes
  useEffect(() => {
    if (!messages || !user || preferences?.notif_mensajes === false) return;

    messages.forEach(msg => {
      // Evitar mostrar mensajes ya vistos
      if (shownIds.includes(msg.id)) return;
      if (msg.leido) return;
      // No mostrar mis propios mensajes
      if (msg.remitente_email === user.email) return;
      
      // Verificar si el mensaje es relevante para el usuario
      let isRelevant = false;
      if (isAdmin) {
        isRelevant = msg.tipo === "padre_a_grupo";
      } else if (isCoach) {
        const categoriesCoached = user.categorias_entrena || [];
        isRelevant = msg.tipo === "padre_a_grupo" && categoriesCoached.includes(msg.grupo_id || msg.deporte);
      } else {
        isRelevant = msg.tipo === "admin_a_grupo" && myGroupSports.includes(msg.grupo_id || msg.deporte);
      }

      if (isRelevant) {
        // Solo mostrar si es reciente (últimos 2 minutos para evitar spam al recargar)
        const msgDate = new Date(msg.created_date);
        const twoMinAgo = new Date(Date.now() - 2 * 60 * 1000);
        if (msgDate > twoMinAgo) {
          addToast({
            type: "message",
            sourceId: msg.id,
            title: msg.prioridad === "Urgente" ? "🚨 Mensaje Urgente" : "💬 Nuevo Mensaje",
            message: `${msg.remitente_nombre}: ${msg.mensaje.substring(0, 60)}${msg.mensaje.length > 60 ? '...' : ''}`,
            extra: msg.grupo_id || msg.deporte,
            duration: msg.prioridad === "Urgente" ? 10000 : 6000
          });
        }
      }
    });
  }, [messages, user, isAdmin, isCoach, myGroupSports, preferences, shownIds, addToast]);

  // Detectar nuevas convocatorias
  useEffect(() => {
    if (!callups || !user || preferences?.notif_convocatorias === false) return;

    const today = new Date().toISOString().split('T')[0];
    
    callups.forEach(callup => {
      if (shownIds.includes(callup.id)) return;
      if (!callup.publicada || callup.cerrada) return;
      if (callup.fecha_partido < today) return;

      // Verificar si tiene jugadores del usuario convocados
      const hasPendingPlayer = callup.jugadores_convocados?.some(j => {
        const isMyPlayer = myPlayers.some(p => p.id === j.jugador_id);
        return isMyPlayer && j.confirmacion === "pendiente";
      });

      if (hasPendingPlayer || isAdmin || isCoach) {
        // Solo mostrar si es reciente (últimos 10 minutos)
        const pubDate = new Date(callup.fecha_publicacion || callup.created_date);
        const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000);
        if (pubDate > tenMinAgo) {
          addToast({
            type: "callup",
            sourceId: callup.id,
            title: "🏆 Nueva Convocatoria",
            message: callup.titulo,
            extra: `${callup.fecha_partido} - ${callup.hora_partido}`,
            duration: 10000
          });
        }
      }
    });
  }, [callups, user, myPlayers, isAdmin, isCoach, preferences, shownIds, addToast]);

  // Detectar nuevos anuncios - DESACTIVADO temporalmente para reducir spam
  // Los usuarios ven los anuncios en el dashboard de todas formas
  /*
  useEffect(() => {
    if (!announcements || !user || preferences?.notif_anuncios === false) return;

    announcements.forEach(ann => {
      if (shownIds.includes(ann.id)) return;
      if (!ann.publicado) return;
      if (ann.created_by === user.email) return;
      
      const isRelevant = ann.destinatarios_tipo === "Todos" || 
        myGroupSports.includes(ann.destinatarios_tipo) ||
        isAdmin || isCoach;

      if (isRelevant) {
        const pubDate = new Date(ann.fecha_publicacion);
        const oneMinAgo = new Date(Date.now() - 60 * 1000);
        if (pubDate > oneMinAgo) {
          addToast({
            type: "announcement",
            sourceId: ann.id,
            title: ann.prioridad === "Urgente" ? "🚨 Anuncio Urgente" : "📢 Nuevo Anuncio",
            message: ann.titulo,
            duration: ann.prioridad === "Urgente" ? 8000 : 5000
          });
        }
      }
    });
  }, [announcements, user, myGroupSports, isAdmin, isCoach, preferences, shownIds, addToast]);
  */

  if (!user) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] space-y-3 max-w-sm w-full pointer-events-none lg:top-4 lg:right-4">
      <div className="pointer-events-auto space-y-3">
        <AnimatePresence mode="popLayout">
          {toasts.map(toast => (
            <ToastNotification
              key={toast.id}
              toast={toast}
              onDismiss={dismissToast}
              isAdmin={isAdmin}
              isCoach={isCoach}
            />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}