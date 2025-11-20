import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function EmailNotificationTrigger({ user }) {
  const lastCallupIdRef = useRef(null);
  const lastPaymentUpdateRef = useRef({});

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list('-created_date'),
    initialData: [],
    refetchInterval: 30000,
    enabled: !!user && (user.role === "admin" || user.es_entrenador || user.es_coordinador),
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list('-updated_date'),
    initialData: [],
    refetchInterval: 30000,
    enabled: !!user && (user.role === "admin" || user.es_tesorero),
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    enabled: !!user,
  });

  // Detectar nueva convocatoria y enviar email automático
  useEffect(() => {
    if (!callups || callups.length === 0) return;
    if (!user || (!user.role && !user.es_entrenador && !user.es_coordinador)) return;

    const latestCallup = callups[0];
    if (!latestCallup.publicada) return;
    if (lastCallupIdRef.current === latestCallup.id) return;

    const createdDate = new Date(latestCallup.created_date);
    const now = new Date();
    const minutesAgo = (now - createdDate) / (1000 * 60);

    // Solo procesar si se creó en los últimos 2 minutos
    if (minutesAgo > 2 || minutesAgo < 0) {
      lastCallupIdRef.current = latestCallup.id;
      return;
    }

    lastCallupIdRef.current = latestCallup.id;

    // Enviar emails a jugadores convocados
    const sendCallupEmails = async () => {
      for (const jugador of latestCallup.jugadores_convocados || []) {
        const player = players.find(p => p.id === jugador.jugador_id);
        if (!player) continue;

        const emailAddresses = [player.email_padre];
        if (player.email_tutor_2) emailAddresses.push(player.email_tutor_2);

        for (const email of emailAddresses) {
          if (!email) continue;

          try {
            await base44.integrations.Core.SendEmail({
              to: email,
              subject: `🏆 Nueva convocatoria: ${latestCallup.titulo}`,
              body: `
                <h2>🏆 Nueva Convocatoria - ${latestCallup.categoria}</h2>
                <p>Tu hijo/a <strong>${player.nombre}</strong> ha sido convocado para:</p>
                <div style="background: #f0f9ff; border-left: 4px solid #3b82f6; padding: 16px; margin: 16px 0;">
                  <p><strong>📅 Partido:</strong> ${latestCallup.titulo}</p>
                  <p><strong>🆚 Rival:</strong> ${latestCallup.rival || 'Por confirmar'}</p>
                  <p><strong>📍 Ubicación:</strong> ${latestCallup.ubicacion}</p>
                  <p><strong>🕐 Hora concentración:</strong> ${latestCallup.hora_concentracion || latestCallup.hora_partido}</p>
                  <p><strong>⚽ Hora partido:</strong> ${latestCallup.hora_partido}</p>
                  <p><strong>📆 Fecha:</strong> ${new Date(latestCallup.fecha_partido).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
                <p style="color: #dc2626; font-weight: bold;">⚠️ Por favor, confirma la asistencia en la aplicación lo antes posible.</p>
                ${latestCallup.descripcion ? `<p><strong>Instrucciones:</strong> ${latestCallup.descripcion}</p>` : ''}
                <p style="margin-top: 24px; color: #64748b; font-size: 14px;">CD Bustarviejo - Sistema de Gestión Deportiva</p>
              `
            });
          } catch (error) {
            console.error(`Error sending callup email to ${email}:`, error);
          }
        }
      }
    };

    sendCallupEmails();
  }, [callups, players, user]);

  // Detectar cambio de estado de pago a "Pagado" y enviar confirmación
  useEffect(() => {
    if (!payments || payments.length === 0) return;
    if (!user || (!user.role && !user.es_tesorero)) return;

    for (const payment of payments) {
      if (payment.estado !== "Pagado") continue;

      const lastKnownState = lastPaymentUpdateRef.current[payment.id];
      if (lastKnownState === "Pagado") continue;

      const updatedDate = new Date(payment.updated_date);
      const now = new Date();
      const minutesAgo = (now - updatedDate) / (1000 * 60);

      // Solo procesar si se actualizó en los últimos 2 minutos
      if (minutesAgo > 2 || minutesAgo < 0) {
        lastPaymentUpdateRef.current[payment.id] = payment.estado;
        continue;
      }

      lastPaymentUpdateRef.current[payment.id] = "Pagado";

      // Enviar email de confirmación
      const sendPaymentConfirmation = async () => {
        const player = players.find(p => p.id === payment.jugador_id);
        if (!player) return;

        const emailAddresses = [player.email_padre];
        if (player.email_tutor_2) emailAddresses.push(player.email_tutor_2);

        for (const email of emailAddresses) {
          if (!email) continue;

          try {
            await base44.integrations.Core.SendEmail({
              to: email,
              subject: `✅ Pago confirmado - ${player.nombre}`,
              body: `
                <h2>✅ Pago Confirmado</h2>
                <p>Hemos confirmado el pago de <strong>${player.nombre}</strong>:</p>
                <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 16px; margin: 16px 0;">
                  <p><strong>💰 Mes:</strong> ${payment.mes}</p>
                  <p><strong>📅 Temporada:</strong> ${payment.temporada}</p>
                  <p><strong>💵 Cantidad:</strong> ${payment.cantidad}€</p>
                  <p><strong>✅ Estado:</strong> Pagado</p>
                  ${payment.fecha_pago ? `<p><strong>📆 Fecha de pago:</strong> ${new Date(payment.fecha_pago).toLocaleDateString('es-ES')}</p>` : ''}
                </div>
                <p>Gracias por tu pago. Puedes consultar el historial completo en la aplicación.</p>
                <p style="margin-top: 24px; color: #64748b; font-size: 14px;">CD Bustarviejo - Gestión de Pagos</p>
              `
            });
          } catch (error) {
            console.error(`Error sending payment confirmation to ${email}:`, error);
          }
        }
      };

      sendPaymentConfirmation();
    }
  }, [payments, players, user]);

  return null;
}