import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Hook UNIFICADO para que cualquier pantalla del staff (admin, entrenador, coordinador)
 * obtenga la lista completa de jugadores de forma fiable.
 *
 * Resuelve el problema histórico de que cada pantalla pedía los jugadores de manera diferente:
 * unas vía SDK directo (que con RLS limita al entrenador-padre), otras vía getStaffPlayers,
 * y a veces fallaban silenciosamente.
 *
 * Centraliza:
 *  - Detección del rol staff (admin / entrenador / coordinador)
 *  - Llamada a la función backend `getStaffPlayers` (con service role) para bypassear RLS
 *  - Fallback al SDK normal si la función falla
 *  - Filtros opcionales (onlyActive)
 *
 * @param {object} user - Usuario actual (de base44.auth.me())
 * @param {object} [options]
 * @param {boolean} [options.onlyActive=false] - Devolver solo jugadores con activo !== false
 * @param {boolean} [options.enabled=true] - Habilitar la query
 * @param {string}  [options.queryKeyExtra] - Sufijo para diferenciar queryKeys entre pantallas
 * @returns React Query result con `data` = array de jugadores
 */
export function useStaffPlayers(user, { onlyActive = false, enabled = true, queryKeyExtra = "" } = {}) {
  return useQuery({
    queryKey: ["staff-players", user?.email || "anon", onlyActive, queryKeyExtra],
    queryFn: async () => {
      const isStaff = !!(user && (user.role === "admin" || user.es_entrenador || user.es_coordinador));
      let list = [];
      if (isStaff) {
        try {
          const { data } = await base44.functions.invoke("getStaffPlayers", {});
          list = data?.players || [];
        } catch (e) {
          console.error("[useStaffPlayers] getStaffPlayers falló, usando fallback SDK:", e);
          try {
            list = (await base44.entities.Player.list()) || [];
          } catch {
            list = [];
          }
        }
      } else {
        try {
          list = (await base44.entities.Player.list()) || [];
        } catch {
          list = [];
        }
      }
      return onlyActive ? list.filter((p) => p.activo !== false) : list;
    },
    enabled: enabled && !!user,
    staleTime: 30_000,
    refetchOnMount: "always",
    initialData: [],
  });
}

/**
 * Helper para obtener TODAS las categorías que un usuario gestiona como staff.
 * Combina `categorias_entrena` + `categorias_coordina` (algunos staff son ambos).
 *
 * @param {object} user
 * @returns {string[]} Lista única de nombres de categoría
 */
export function getStaffCategories(user) {
  if (!user) return [];
  const set = new Set([
    ...(user.categorias_entrena || []),
    ...(user.categorias_coordina || []),
  ]);
  return Array.from(set).filter(Boolean);
}