import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useChatUnreadCounts } from "../chat/useChatUnreadCounts";

// Unifica contadores de chats usando exclusivamente chatGetUnreadCounts (last_read_* y User.chat_last_read)
// Devuelve { total, items: [{source, label, count, link}] }
export default function useUnreadChats(enabled = true) {
  const { data: user } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = user?.role === "admin";
  const isCoordinator = user?.es_coordinador === true;
  const isCoach = user?.es_entrenador === true;
  const isPlayer = user?.es_jugador === true || user?.tipo_panel === "jugador_adulto";
  const isFamily = !!user && !isAdmin && !isCoach && !isCoordinator && !isPlayer;

  const { counts } = useChatUnreadCounts(user);

  const items = useMemo(() => {
    if (!enabled || !user) return [];

    const results = [];
    const teamTotal = Object.values(counts.team_chats || {}).reduce((s, v) => s + (v || 0), 0);

    // Staff / técnicos
    if (isAdmin || isCoach || isCoordinator) {
      if ((counts.staff || 0) > 0) results.push({ source: "staff", label: "Staff", count: counts.staff, link: "StaffChat" });
      if (teamTotal > 0) results.push({ source: "familias", label: "Familias", count: teamTotal, link: "CoachParentChat" });
      if ((counts.coordinator || 0) > 0 && isCoordinator) results.push({ source: "coordinator", label: "Coordinador", count: counts.coordinator, link: "CoordinatorChat" });
      if ((counts.admin || 0) > 0 && isAdmin) results.push({ source: "admin", label: "Administrador", count: counts.admin, link: "AdminChat" });
    }

    // Familias / jugadores
    if (isFamily || isPlayer) {
      if (teamTotal > 0) results.push({ source: "coach", label: "Entrenador", count: teamTotal, link: "ParentCoachChat" });
      if ((counts.coordinator || 0) > 0) results.push({ source: "coordinator", label: "Coordinador", count: counts.coordinator, link: "ParentCoordinatorChat" });
      if ((counts.admin || 0) > 0) results.push({ source: "admin", label: "Administrador", count: counts.admin, link: "ParentAdminChat" });
      if ((counts.system || 0) > 0) results.push({ source: "private", label: "Privados", count: counts.system, link: "ParentSystemMessages" });
    }

    return results;
  }, [enabled, user, isAdmin, isCoach, isCoordinator, isPlayer, isFamily, counts]);

  const total = useMemo(() => counts?.total || 0, [counts?.total]);

  return { total, items };
}