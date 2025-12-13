import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Componente que ejecuta el cierre automático de renovaciones
 * cuando se alcanza la fecha límite configurada
 */
export default function AutomaticRenewalClosure() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const checkAndClosePendingRenewals = async () => {
      try {
        // Obtener configuración activa
        const configs = await base44.entities.SeasonConfig.list();
        const activeConfig = configs.find(c => c.activa === true);

        if (!activeConfig || !activeConfig.permitir_renovaciones || !activeConfig.fecha_limite_renovaciones) {
          return;
        }

        const fechaLimite = new Date(activeConfig.fecha_limite_renovaciones);
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        fechaLimite.setHours(0, 0, 0, 0);

        // Si ya pasó la fecha límite
        if (hoy > fechaLimite) {
          console.log('🔒 [AutomaticRenewalClosure] Fecha límite alcanzada, procesando jugadores pendientes...');

          // Obtener jugadores pendientes de esta temporada
          const allPlayers = await base44.entities.Player.list();
          const pendientes = allPlayers.filter(p => 
            p.estado_renovacion === "pendiente" && 
            p.temporada_renovacion === activeConfig.temporada
          );

          if (pendientes.length > 0) {
            console.log(`⚠️ [AutomaticRenewalClosure] ${pendientes.length} jugadores sin renovar`);

            // Marcar como "no_renueva" y desactivar
            for (const player of pendientes) {
              await base44.entities.Player.update(player.id, {
                estado_renovacion: "no_renueva",
                activo: false,
                fecha_renovacion: new Date().toISOString(),
                observaciones: `${player.observaciones || ''}\n[Sistema] No renovado antes de fecha límite (${fechaLimite.toLocaleDateString('es-ES')})`.trim()
              });
            }

            // Notificar al admin
            await base44.integrations.Core.SendEmail({
              from_name: "CD Bustarviejo - Sistema de Renovaciones",
              to: "cdbustarviejo@gmail.com",
              subject: `🔒 Cierre Automático de Renovaciones - ${pendientes.length} jugadores no renovados`,
              body: `
Se ha alcanzado la fecha límite de renovaciones (${fechaLimite.toLocaleDateString('es-ES')}).

El sistema ha procesado automáticamente ${pendientes.length} jugador(es) que no renovaron:

${pendientes.map(p => `• ${p.nombre} (${p.deporte}) - Familia: ${p.email_padre}`).join('\n')}

Estos jugadores han sido marcados como "no_renueva" y desactivados.

Puedes reactivarlos manualmente desde el Dashboard de Renovaciones si alguna familia contacta.

Temporada: ${activeConfig.temporada}
              `
            });

            console.log('✅ [AutomaticRenewalClosure] Proceso completado, admin notificado');
            
            queryClient.invalidateQueries({ queryKey: ['players'] });
            queryClient.invalidateQueries({ queryKey: ['allPlayers'] });
          }
        }
      } catch (error) {
        console.error('[AutomaticRenewalClosure] Error:', error);
      }
    };

    // Ejecutar al montar y luego cada 6 horas
    checkAndClosePendingRenewals();
    const interval = setInterval(checkAndClosePendingRenewals, 6 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, [queryClient]);

  return null;
}