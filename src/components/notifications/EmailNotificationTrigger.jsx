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
            const { newCallupBasicHtml } = await import('../emails/emailTemplates');
            await base44.functions.invoke('sendEmail', {
              to: email,
              subject: `⚽ Convocatoria: ${latestCallup.rival ? `vs ${latestCallup.rival}` : latestCallup.titulo} - CD Bustarviejo`,
              html: newCallupBasicHtml(player.nombre, latestCallup)
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
            const { paymentConfirmedHtml } = await import('../emails/emailTemplates');
            await base44.functions.invoke('sendEmail', {
              to: email,
              subject: `✅ Pago confirmado - ${player.nombre}`,
              html: paymentConfirmedHtml(
                player.nombre, payment.mes, payment.temporada, payment.cantidad,
                payment.fecha_pago ? new Date(payment.fecha_pago).toLocaleDateString('es-ES') : null, null
              )
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