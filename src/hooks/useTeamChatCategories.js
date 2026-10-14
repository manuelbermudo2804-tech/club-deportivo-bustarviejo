import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Equipos cuyos chats ve el usuario: el coordinador ve todos los del club;
// el entrenador, los que entrena.
export default function useTeamChatCategories(user) {
  const isCoordinator = user?.es_coordinador === true;
  const { data: clubCats = [] } = useQuery({
    queryKey: ["clubTeamCategories"],
    queryFn: async () => {
      const players = await base44.entities.Player.filter({ activo: true }, "-created_date", 1000);
      return [...new Set(players.map((p) => p.categoria_principal || p.deporte).filter(Boolean))].sort();
    },
    enabled: isCoordinator,
    staleTime: 10 * 60_000,
  });
  const own = user?.es_entrenador ? user?.categorias_entrena || [] : [];
  return [...new Set([...own, ...(isCoordinator ? clubCats : [])])];
}