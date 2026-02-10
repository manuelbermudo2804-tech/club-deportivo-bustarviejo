import { useMemo, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useStaffCounters } from "../chats/useChatCounters";

// Unifica contadores de chats para todos los roles
// Devuelve { total, items: [{source, label, count, link, subtitle?}] }
export default function useUnreadChats(enabled = true) {
  // Usuario actual
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === "admin";
  const isCoordinator = user?.es_coordinador === true;
  const isCoach = user?.es_entrenador === true;
  const isPlayer = user?.es_jugador === true || user?.tipo_panel === "jugador_adulto";
  const isFamily = !!user && !isAdmin && !isCoach && !isCoordinator && !isPlayer;

  // Staff counters via ChatCounter (lighter, avoids rate limits)
  const { total: staffTotal } = useStaffCounters({ refetchOnFocus: true });

  // Conversaciones de Coordinador - Real-time
  const [coordConvs, setCoordConvs] = useState([]);

  useEffect(() => {
    if (!enabled || !user) return;

    const loadInitial = async () => {
      const convs = await base44.entities.CoordinatorConversation.list("-updated_date", 100);
      setCoordConvs(convs);
    };
    loadInitial();

    const unsubscribe = base44.entities.CoordinatorConversation.subscribe((event) => {
      if (event.type === 'create') setCoordConvs(prev => [event.data, ...prev]);
      else if (event.type === 'update') setCoordConvs(prev => prev.map(c => c.id === event.id ? event.data : c));
      else if (event.type === 'delete') setCoordConvs(prev => prev.filter(c => c.id !== event.id));
    });

    return unsubscribe;
  }, [enabled, user]);

  // Conversaciones de Admin - Real-time (solo cuando aplica: admin o familia/jugador)
  const [adminConvs, setAdminConvs] = useState([]);

  useEffect(() => {
    if (!enabled || !user) return;
    if (!isAdmin && !isFamily && !isPlayer) return;

    const loadInitial = async () => {
      const convs = await base44.entities.AdminConversation.list("-updated_date", 200);
      setAdminConvs(convs);
    };
    loadInitial();

    const unsubscribe = base44.entities.AdminConversation.subscribe((event) => {
      if (event.type === 'create') setAdminConvs(prev => [event.data, ...prev]);
      else if (event.type === 'update') setAdminConvs(prev => prev.map(c => c.id === event.id ? event.data : c));
      else if (event.type === 'delete') setAdminConvs(prev => prev.filter(c => c.id !== event.id));
    });

    return unsubscribe;
  }, [enabled, user, isAdmin, isFamily, isPlayer]);

  // CRÍTICO: NO cargar aquí - esto duplica ChatNotificationSync + NotificationCenter
  // Solo usar para contadores, no para datos crudos
  const [groupMessages, setGroupMessages] = useState([]);

  useEffect(() => {
    if (!enabled || !user) return;

    // SOLO cargar los últimos 50 mensajes para contadores
    const loadInitial = async () => {
      try {
        const messages = await base44.entities.ChatMessage.list("-created_date", 50);
        setGroupMessages(messages);
      } catch (e) {
        console.error('[useUnreadChats] Error loading group messages:', e);
      }
    };
    loadInitial();

    const unsubscribe = base44.entities.ChatMessage.subscribe((event) => {
      try {
        if (event.type === 'create') setGroupMessages(prev => [event.data, ...prev].slice(0, 50));
        else if (event.type === 'update') setGroupMessages(prev => prev.map(m => m.id === event.id ? event.data : m));
        else if (event.type === 'delete') setGroupMessages(prev => prev.filter(m => m.id !== event.id));
      } catch (e) {
        console.error('[useUnreadChats] Error in group message subscription:', e);
      }
    });

    return () => {
      try {
        unsubscribe();
      } catch (e) {
        console.error('[useUnreadChats] Error unsubscribing from group messages:', e);
      }
    };
  }, [enabled, user]);

  // Conversaciones privadas - Real-time (máximo 50)
  const [privateConvs, setPrivateConvs] = useState([]);

  useEffect(() => {
    if (!enabled || !user) return;

    const loadInitial = async () => {
      try {
        const convs = await base44.entities.PrivateConversation.list("-ultimo_mensaje_fecha", 50);
        setPrivateConvs(convs);
      } catch (e) {
        console.error('[useUnreadChats] Error loading private conversations:', e);
      }
    };
    loadInitial();

    const unsubscribe = base44.entities.PrivateConversation.subscribe((event) => {
      try {
        if (event.type === 'create') setPrivateConvs(prev => [event.data, ...prev].slice(0, 50));
        else if (event.type === 'update') setPrivateConvs(prev => prev.map(c => c.id === event.id ? event.data : c));
        else if (event.type === 'delete') setPrivateConvs(prev => prev.filter(c => c.id !== event.id));
      } catch (e) {
        console.error('[useUnreadChats] Error in private conversation subscription:', e);
      }
    });

    return () => {
      try {
        unsubscribe();
      } catch (e) {
        console.error('[useUnreadChats] Error unsubscribing from private conversations:', e);
      }
    };
  }, [enabled, user]);

  // Jugadores del usuario (para familias/jugadores)
  // CRÍTICO: Resetear estados cuando cambia user (evitar data leak de usuario anterior)
  useEffect(() => {
    if (!user) {
      setCoordConvs([]);
      setAdminConvs([]);
      setGroupMessages([]);
      setPrivateConvs([]);
    }
  }, [user?.email]);

  const { data: players = [] } = useQuery({
    queryKey: ["players-unified", user?.email],
    queryFn: async () => {
      try {
        // Filtrar al cargar, no después (optimiza base de datos)
        const all = await base44.entities.Player.filter({
          activo: true,
          $or: [
            { email_padre: user?.email },
            { email_tutor_2: user?.email },
            { email_jugador: user?.email }
          ]
        }, '-created_date', 100);
        return all;
      } catch (e) {
        console.error('[useUnreadChats] Error loading players:', e);
        return [];
      }
    },
    initialData: [],
    enabled: enabled && !!user,
    staleTime: 60000,
  });

  const items = useMemo(() => {
    if (!user) return [];

    const results = [];

    // 1) Staff (usar contadores para minimizar llamadas)
    if (isAdmin || isCoach || isCoordinator) {
      const staffUnread = staffTotal || 0;
      if (staffUnread > 0) {
        results.push({ source: "staff", label: "Staff", count: staffUnread, link: "StaffChat" });
      }
    }

    // 2) Coordinador
    if (isCoordinator) {
      const coordUnread = coordConvs.reduce((sum, c) => sum + (c.no_leidos_coordinador || 0), 0);
      if (coordUnread > 0) {
        results.push({ source: "coordinator", label: "Coordinador", count: coordUnread, link: "CoordinatorChat" });
      }
    }
    // Familia: mensajes desde coordinador
    if (isFamily || isPlayer) {
      const myCoordUnread = coordConvs
        .filter((c) => c.padre_email === user.email)
        .reduce((sum, c) => sum + (c.no_leidos_padre || 0), 0);
      if (myCoordUnread > 0) {
        results.push({ source: "coordinator", label: "Coordinador", count: myCoordUnread, link: "ParentCoordinatorChat" });
      }
    }

    // 3) Admin
    if (isAdmin) {
      const unreadAdmin = adminConvs.reduce((sum, c) => sum + (c.no_leidos_admin || 0), 0);
      if (unreadAdmin > 0) {
        results.push({ source: "admin", label: "Administrador", count: unreadAdmin, link: "AdminChat" });
      }
    } else if (isFamily || isPlayer) {
      const unreadParentAdmin = adminConvs
        .filter((c) => c.padre_email === user.email)
        .reduce((sum, c) => sum + (c.no_leidos_padre || 0), 0);
      if (unreadParentAdmin > 0) {
        results.push({ source: "admin", label: "Administrador", count: unreadParentAdmin, link: "ParentAdminChat" });
      }
    }

    // 4) Entrenador↔Familia (grupos)
    if (isCoach || isCoordinator || isAdmin) {
      const coachCategories = user?.categorias_entrena || [];
      
      // Contar mensajes de padres hacia el entrenador (padre_a_grupo)
      const fromParents = groupMessages.filter((m) => {
        if (m.tipo !== "padre_a_grupo") return false;
        
        // Verificar si el mensaje ya fue leído por este usuario
        const isRead = m.leido_por?.some((lp) => lp.email === user.email);
        if (isRead) return false;
        
        // Admin ve todos los mensajes
        if (isAdmin) return true;
        
        // Entrenador/Coordinador: verificar si pertenece a su categoría
        const msgCategory = m.deporte || m.grupo_id;
        return coachCategories.some(cat => 
          cat === msgCategory || 
          msgCategory?.toLowerCase().includes(cat?.toLowerCase()) ||
          cat?.toLowerCase().includes(msgCategory?.toLowerCase())
        );
      }).length;
      
      if (fromParents > 0) {
        results.push({ source: "families", label: "Familias", count: fromParents, link: "CoachParentChat" });
      }
    }

    if (isFamily || isPlayer) {
      const myGroupIds = new Set(players.map((p) => p.deporte));
      
      // Mensajes del entrenador hacia familias (entrenador_a_grupo)
      const fromCoach = groupMessages.filter(
        (m) =>
          m.tipo === "entrenador_a_grupo" &&
          (!m.leido_por || !m.leido_por.some((lp) => lp.email === user.email)) &&
          (myGroupIds.has(m.grupo_id) || myGroupIds.has(m.deporte))
      ).length;
      
      if (fromCoach > 0) {
        results.push({ source: "coach", label: "Entrenador", count: fromCoach, link: "ParentCoachChat" });
      }
    }

    // 5) Privados
    if (isFamily || isPlayer) {
      const priv = privateConvs
        .filter((c) => c.participante_familia_email === user.email)
        .reduce((sum, c) => sum + (c.no_leidos_familia || 0), 0);
      if (priv > 0) {
        results.push({ source: "private", label: "Privados", count: priv, link: "ParentSystemMessages" });
      }
    } else if (isCoach || isCoordinator || isAdmin) {
      const privStaff = privateConvs
        .filter((c) => c.participante_staff_email === user.email)
        .reduce((sum, c) => sum + (c.no_leidos_staff || 0), 0);
      if (privStaff > 0) {
        results.push({ source: "private", label: "Privados", count: privStaff, link: isAdmin ? "DirectMessages" : "ParentDirectMessages" });
      }
    }

    return results;
  }, [user, isAdmin, isCoach, isCoordinator, isPlayer, isFamily, staffMessages, coordConvs, adminConvs, groupMessages, privateConvs, players]);

  const total = useMemo(() => items.reduce((s, it) => s + (it.count || 0), 0), [items]);

  return { total, items };
}