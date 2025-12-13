import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

/**
 * Envía recordatorio a familias que renovaron pero NO han pagado
 * después de 3 días de haber renovado
 */
export default function PostRenewalPaymentReminder() {
  useEffect(() => {
    const checkAndRemind = async () => {
      try {
        const configs = await base44.entities.SeasonConfig.list();
        const activeConfig = configs.find(c => c.activa === true);

        if (!activeConfig?.permitir_renovaciones) return;

        const allPlayers = await base44.entities.Player.list();
        const allPayments = await base44.entities.Payment.list();

        // Jugadores renovados hace 3 días o más
        const tresDiasAtras = new Date();
        tresDiasAtras.setDate(tresDiasAtras.getDate() - 3);

        const jugadoresRenovadosSinPagar = allPlayers.filter(p => {
          if (p.estado_renovacion !== "renovado" || p.temporada_renovacion !== activeConfig.temporada) {
            return false;
          }

          const fechaRenovacion = new Date(p.fecha_renovacion);
          if (fechaRenovacion > tresDiasAtras) {
            return false; // Renovó hace menos de 3 días
          }

          // Verificar si tiene pagos pendientes
          const pagosPendientes = allPayments.filter(pay => 
            pay.jugador_id === p.id &&
            pay.temporada === activeConfig.temporada &&
            pay.estado === "Pendiente"
          );

          return pagosPendientes.length > 0;
        });

        if (jugadoresRenovadosSinPagar.length === 0) return;

        // Agrupar por familia
        const familias = {};
        jugadoresRenovadosSinPagar.forEach(player => {
          const email = player.email_padre;
          if (!familias[email]) {
            familias[email] = { email, jugadores: [], cuotasPendientes: [] };
          }
          familias[email].jugadores.push(player);
          
          const pagosPendientes = allPayments.filter(pay => 
            pay.jugador_id === player.id &&
            pay.temporada === activeConfig.temporada &&
            pay.estado === "Pendiente"
          );
          familias[email].cuotasPendientes.push(...pagosPendientes);
        });

        // Enviar recordatorios
        for (const familia of Object.values(familias)) {
          // Verificar si ya enviamos este recordatorio hoy
          const hoy = new Date().toISOString().split('T')[0];
          const yaEnviadoHoy = await base44.entities.Reminder.filter({
            email_padre: familia.email,
            tipo_recordatorio: "Post-Renovación Pago",
            fecha_envio: hoy
          });

          if (yaEnviadoHoy.length > 0) continue;

          const totalPendiente = familia.cuotasPendientes.reduce((sum, p) => sum + (p.cantidad || 0), 0);

          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo",
            to: familia.email,
            subject: `📌 Recordatorio: Cuotas pendientes de pago - Temporada ${activeConfig.temporada}`,
            body: `Hola,

Queremos recordarte que has completado la renovación de tus jugadores, ¡genial! 🎉

Sin embargo, tienes cuotas pendientes de registrar en la aplicación:

${familia.cuotasPendientes.map(p => 
  `• ${p.jugador_nombre} - ${p.mes}: ${p.cantidad}€`
).join('\n')}

💰 Total pendiente: ${totalPendiente}€

📲 ¿Cómo pagar?
1. Realiza la transferencia bancaria
2. Accede a la app → "Pagos"
3. Selecciona el jugador y la cuota
4. Sube el justificante de transferencia

Si ya realizaste el pago, solo falta que lo registres en la app para que podamos verificarlo.

¡Gracias!
CD Bustarviejo`
          });

          // Registrar que se envió
          await base44.entities.Reminder.create({
            pago_id: familia.cuotasPendientes[0]?.id || "multiple",
            jugador_id: familia.jugadores[0].id,
            jugador_nombre: familia.jugadores[0].nombre,
            email_padre: familia.email,
            tipo_recordatorio: "Post-Renovación Pago",
            fecha_envio: hoy,
            enviado: true,
            fecha_enviado: new Date().toISOString(),
            mes_pago: "Múltiple",
            cantidad: totalPendiente,
            temporada: activeConfig.temporada
          });

          console.log(`✅ Recordatorio post-renovación enviado a ${familia.email}`);
        }
      } catch (error) {
        console.error('[PostRenewalPaymentReminder] Error:', error);
      }
    };

    // Ejecutar cada 12 horas
    checkAndRemind();
    const interval = setInterval(checkAndRemind, 12 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}