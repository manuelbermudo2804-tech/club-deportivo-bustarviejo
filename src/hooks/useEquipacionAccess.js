import { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Determina si el usuario puede acceder a la Tienda de Equipación.
 * Reglas:
 *  - Admin, entrenador o coordinador → siempre SÍ.
 *  - Resto → sólo si tiene al menos 1 jugador activo asociado a su email
 *    (como padre, segundo tutor, jugador adulto o menor con acceso).
 */
export default function useEquipacionAccess() {
  const [state, setState] = useState({
    loading: true,
    allowed: false,
    reason: null, // 'no_user' | 'no_active_player' | null
    user: null,
  });

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const user = await base44.auth.me().catch(() => null);
        if (!user) {
          if (!cancelled) setState({ loading: false, allowed: false, reason: "no_user", user: null });
          return;
        }

        // Roles de staff → siempre permitido
        const isStaff =
          user.role === "admin" ||
          user.es_entrenador === true ||
          user.es_coordinador === true;
        if (isStaff) {
          if (!cancelled) setState({ loading: false, allowed: true, reason: null, user });
          return;
        }

        // Comprobar jugadores activos vinculados al email del usuario
        const email = (user.email || "").toLowerCase();
        const queries = [
          base44.entities.Player.filter({ email_padre: email, activo: true }),
          base44.entities.Player.filter({ email_tutor_2: email, activo: true }),
          base44.entities.Player.filter({ email_jugador: email, activo: true }),
          base44.entities.Player.filter({ acceso_menor_email: email, activo: true }),
        ];
        const results = await Promise.all(queries.map((p) => p.catch(() => [])));
        const total = results.reduce((sum, list) => sum + (list?.length || 0), 0);

        if (!cancelled) {
          setState({
            loading: false,
            allowed: total > 0,
            reason: total > 0 ? null : "no_active_player",
            user,
          });
        }
      } catch (e) {
        if (!cancelled) setState({ loading: false, allowed: false, reason: "no_active_player", user: null });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}