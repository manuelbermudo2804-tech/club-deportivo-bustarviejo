import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { getNextSeason } from "@/components/dorsales/dorsalHelpers";

/**
 * Cuenta jugadores ACTIVOS sin dorsal asignado en la temporada siguiente.
 * Solo se ejecuta para admins. Se refresca cada 5 min y al volver a la app.
 */
export default function useDorsalPending(isAdmin) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;

    const load = async () => {
      try {
        const seasons = await base44.entities.SeasonConfig.list();
        const activa = seasons.find((s) => s.activa);
        const current = activa?.temporada || "2025-2026";
        const next = getNextSeason(current);

        const [players, assignments] = await Promise.all([
          base44.entities.Player.filter({ activo: true }, "-updated_date", 500),
          base44.entities.DorsalAssignment.filter({ temporada: next, estado: "asignado" }),
        ]);

        const assignedIds = new Set(assignments.map((a) => a.jugador_id));
        const pendientes = players.filter((p) => !assignedIds.has(p.id)).length;

        if (!cancelled) setCount(pendientes);
      } catch {
        if (!cancelled) setCount(0);
      }
    };

    load();
    const interval = setInterval(load, 5 * 60 * 1000); // cada 5 min
    const onVis = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVis);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [isAdmin]);

  return count;
}