import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Componente que invoca la función backend de cierre automático de renovaciones.
 * Se ejecuta UNA vez al montar (no se repite en frontend para evitar duplicados).
 * La lógica principal ahora está en functions/autoCloseRenewals.
 */
export default function AutomaticRenewalClosure() {
  const queryClient = useQueryClient();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const run = async () => {
      try {
        const user = await base44.auth.me();
        // Solo admins ejecutan el cierre
        if (user?.role !== 'admin') return;

        const { data } = await base44.functions.invoke('autoCloseRenewals', {});
        if (data?.processed > 0) {
          console.log(`🔒 [AutomaticRenewalClosure] ${data.processed} jugadores procesados por backend`);
          queryClient.invalidateQueries({ queryKey: ['players'] });
          queryClient.invalidateQueries({ queryKey: ['allPlayers'] });
        }
      } catch (error) {
        // Silencioso: no bloquear la app por esto
        console.error('[AutomaticRenewalClosure] Error:', error);
      }
    };

    run();
  }, [queryClient]);

  return null;
}