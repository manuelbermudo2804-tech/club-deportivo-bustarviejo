import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

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

  // Staff messages (rol staff/admin/coordinador/entrenador)
  const { data: staffMessages = [] } = useQuery({
    queryKey: ["staffMessages-unified"],
    queryFn: () => base44.entities.StaffMessage.list("-created_date", 500),
    initialData: [],
    enabled: enabled && !!user && (isAdmin || isCoach || isCoordinator),
    staleTime: 30000,
    refetchInterval: enabled ? 30000 : false,
  });

  // Conversaciones de Coordinador
  const { data: coordConvs = [] } = useQuery({
    queryKey: ["coordConversations-unified"],
    queryFn: () => base44.entities.CoordinatorConversation.list("-updated_date", 200),
    initialData: [],
    enabled: enabled && !!user,
    staleTime: 30000,
    refetchInterval: enabled ? 30000 : false,
  });

  // Conversaciones de Admin
  const { data: adminConvs = [] } = useQuery({
    queryKey: ["adminConversations-unified"],
    queryFn: () => base44.entities.AdminConversation.list("-updated_date", 200),
    initialData: [],
    enabled: enabled && !!user,
    staleTime: 30000,
    refetchInterval: enabled ? 30000 : false,
  });

  // Mensajes de grupos entrenador↔familia
  const { data: groupMessages = [] } = useQuery({
    queryKey: ["groupMessages-unified"],
    queryFn: () => base44.entities.ChatMessage.list("-created_date", 1000),
    initialData: [],
    enabled: enabled && !!user,
    staleTime: 20000,
    refetchInterval: enabled ? 20000 : false,
  });

  // Conversaciones privadas
  const { data: privateConvs = [] } = useQuery({
    queryKey: ["privateConversations-unified"],
    queryFn: () => base44.entities.PrivateConversation.list("-ultimo_mensaje_fecha", 300),
    initialData: [],
    enabled: enabled && !!user,
    staleTime: 30000,
    refetchInterval: enabled ? 30000 : false,
  });

  // Jugadores del usuario (para familias/jugadores)
  const { data: players = [] } = useQuery({
    queryKey: ["players-unified", user?.email],
    queryFn: async () => {
      const all = await base44.entities.Player.list();
      return all.filter(
        (p) =>
          p.activo === true &&
          (p.email_padre === user?.email || p.email_tutor_2 === user?.email || p.email_jugador === user?.email)
      );
    },
    initialData: [],
    enabled: enabled && !!user,
    staleTime: 60000,
  });

  const items = useMemo(() => {
    if (!user) return [];

    const results = [];

    // 1) Staff
    if (isAdmin || isCoach || isCoordinator) {
      const staffUnread = staffMessages.filter(
        (m) => m.autor_email !== user.email && (!m.leido_por || !m.leido_por.some((lp) => lp.email === user.email))
      ).length;
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