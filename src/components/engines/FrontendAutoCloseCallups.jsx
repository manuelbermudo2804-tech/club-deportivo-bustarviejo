import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Reemplaza la automatización "Auto-cierre convocatorias pasadas".
 * Se ejecuta UNA VEZ cuando un admin abre la app.
 * Cierra convocatorias de partidos ya pasados y borra borradores viejos.
 * 0 créditos de automatización.
 */
export default function FrontendAutoCloseCallups() {
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const run = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const allCallups = await base44.entities.Convocatoria.filter(
          { cerrada: false },
          "-fecha_partido",
          200
        );

        let closed = 0;
        let deleted = 0;

        for (const c of allCallups) {
          if (!c.fecha_partido || c.fecha_partido >= today) continue;
          if (c.estado_convocatoria === "cancelada") continue;

          if (!c.publicada) {
            await base44.entities.Convocatoria.delete(c.id);
            deleted++;
          } else {
            await base44.entities.Convocatoria.update(c.id, { cerrada: true });
            closed++;
          }
        }

        // Limpiar ProximoPartido jugados de hace +7 días
        const allProximos = await base44.entities.ProximoPartido.list("-updated_date", 200);
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const cutoff = sevenDaysAgo.toISOString().split("T")[0];
        let proximosCleaned = 0;

        for (const p of allProximos) {
          if (p.jugado && p.fecha_iso && p.fecha_iso < cutoff) {
            await base44.entities.ProximoPartido.delete(p.id);
            proximosCleaned++;
          }
        }

        if (closed || deleted || proximosCleaned) {
          console.log(
            `[FrontendAutoClose] Cerradas: ${closed}, Borradas: ${deleted}, Próximos limpiados: ${proximosCleaned}`
          );
        }
      } catch (err) {
        console.error("[FrontendAutoClose] Error:", err);
      }
    };

    // Ejecutar con retraso para no bloquear el primer render
    const t = setTimeout(run, 8000);
    return () => clearTimeout(t);
  }, []);

  return null;
}