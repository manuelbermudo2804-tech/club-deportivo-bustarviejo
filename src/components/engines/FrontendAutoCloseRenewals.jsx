import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Reemplaza la automatización "Cierre automático renovaciones".
 * Se ejecuta UNA VEZ cuando un admin abre la app.
 * Si la fecha límite de renovaciones ha pasado, marca jugadores pendientes como no_renueva.
 * 0 créditos de automatización.
 */
export default function FrontendAutoCloseRenewals() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      try {
        const configs = await base44.entities.SeasonConfig.filter({ activa: true });
        const activeConfig = configs[0];
        if (!activeConfig?.permitir_renovaciones || !activeConfig?.fecha_limite_renovaciones) return;

        const fechaLimite = new Date(activeConfig.fecha_limite_renovaciones);
        const hoy = new Date();
        fechaLimite.setHours(0, 0, 0, 0);
        hoy.setHours(0, 0, 0, 0);

        if (hoy <= fechaLimite) return;

        const pendientes = await base44.entities.Player.filter({
          estado_renovacion: "pendiente",
          temporada_renovacion: activeConfig.temporada,
        });

        if (pendientes.length === 0) return;

        for (const player of pendientes) {
          await base44.entities.Player.update(player.id, {
            estado_renovacion: "no_renueva",
            activo: false,
            fecha_renovacion: new Date().toISOString(),
            observaciones: `${player.observaciones || ""}\n[Sistema] No renovado antes de fecha límite (${fechaLimite.toLocaleDateString("es-ES")})`.trim(),
          });
        }

        console.log(`[FrontendAutoCloseRenewals] ${pendientes.length} jugadores marcados como no_renueva`);
      } catch (err) {
        console.error("[FrontendAutoCloseRenewals] Error:", err);
      }
    };

    const t = setTimeout(run, 12000);
    return () => clearTimeout(t);
  }, []);

  return null;
}