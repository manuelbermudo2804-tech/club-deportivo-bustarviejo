import { base44 } from "@/api/base44Client";

// Registra en cada jugador de la familia que se le ha enviado un recordatorio
// de pago manual: actualiza la fecha y suma +1 al contador.
// `family.jugadores` es el array de jugadores con pagos pendientes (cada uno con .id).
export async function registrarRecordatorioEnviado(family) {
  const ahora = new Date().toISOString();
  const jugadores = family?.jugadores || [];
  await Promise.all(
    jugadores.map(async (j) => {
      try {
        const actual = await base44.entities.Player.get(j.id);
        await base44.entities.Player.update(j.id, {
          ultimo_recordatorio_pago_fecha: ahora,
          recordatorios_pago_enviados: (actual?.recordatorios_pago_enviados || 0) + 1,
        });
      } catch (e) {
        console.error(`[recordatorioTracking] Error registrando recordatorio para jugador ${j.id}:`, e.message);
      }
    })
  );
}