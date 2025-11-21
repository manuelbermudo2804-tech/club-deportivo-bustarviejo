import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function AutomaticNotificationEngine({ user }) {
  const lastCheckRef = useRef(null);

  const { data: callups } = useQuery({
    queryKey: ['callups'],
    queryFn: () => base44.entities.Convocatoria.list(),
    initialData: [],
    refetchInterval: 300000, // Check every 5 minutes
    enabled: !!user,
  });

  const { data: payments } = useQuery({
    queryKey: ['payments'],
    queryFn: () => base44.entities.Payment.list(),
    initialData: [],
    refetchInterval: 300000,
    enabled: !!user,
  });

  const { data: evaluations } = useQuery({
    queryKey: ['evaluations'],
    queryFn: () => base44.entities.PlayerEvaluation.list(),
    initialData: [],
    refetchInterval: 300000,
    enabled: !!user,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ['appNotifications'],
    queryFn: () => base44.entities.AppNotification.list(),
    initialData: [],
    enabled: false,
  });

  const { data: preferences } = useQuery({
    queryKey: ['notificationPreferences'],
    queryFn: () => base44.entities.NotificationPreference.list(),
    initialData: [],
    enabled: false,
  });

  useEffect(() => {
    if (!user) return;

    const checkAndCreateNotifications = async () => {
      const now = new Date();
      
      // Solo ejecutar cada 5 minutos para evitar duplicados
      if (lastCheckRef.current && (now - lastCheckRef.current) < 5 * 60 * 1000) {
        return;
      }
      lastCheckRef.current = now;

      const myPlayers = players.filter(p => 
        p.email_padre === user.email || p.email_tutor_2 === user.email
      );

      // 1. Convocatorias sin confirmar (24h antes)
      for (const callup of callups) {
        if (!callup.publicada || callup.cerrada) continue;

        const matchDate = new Date(callup.fecha_partido + 'T' + (callup.hora_partido || '00:00'));
        const hoursUntil = (matchDate - now) / (1000 * 60 * 60);

        if (hoursUntil > 20 && hoursUntil < 26) {
          const myConfirmations = callup.jugadores_convocados?.filter(j => {
            const isMyPlayer = myPlayers.some(p => p.id === j.jugador_id);
            return isMyPlayer && j.confirmacion === "pendiente";
          }) || [];

          for (const confirmation of myConfirmations) {
            const notifKey = `callup-reminder-${callup.id}-${confirmation.jugador_id}`;
            const exists = notifications.some(n => n.tipo === "convocatoria_pendiente" && n.referencia_id === notifKey);

            if (!exists) {
              await base44.entities.AppNotification.create({
                usuario_email: user.email,
                tipo: "convocatoria_pendiente",
                titulo: "⏰ Convocatoria sin confirmar",
                mensaje: `${confirmation.jugador_nombre} tiene una convocatoria pendiente de confirmar para mañana: ${callup.titulo}`,
                prioridad: "importante",
                url_accion: "/ParentCallups",
                referencia_id: notifKey,
                vista: false
              });

              // Email automático
              await base44.integrations.Core.SendEmail({
                to: user.email,
                subject: `⏰ Convocatoria pendiente - ${confirmation.jugador_nombre}`,
                body: `
                  <h2>Convocatoria sin confirmar</h2>
                  <p>Tu hijo/a <strong>${confirmation.jugador_nombre}</strong> tiene una convocatoria pendiente de confirmar:</p>
                  <ul>
                    <li><strong>Partido:</strong> ${callup.titulo}</li>
                    <li><strong>Fecha:</strong> ${callup.fecha_partido}</li>
                    <li><strong>Hora:</strong> ${callup.hora_partido}</li>
                    <li><strong>Ubicación:</strong> ${callup.ubicacion}</li>
                  </ul>
                  <p>Por favor, entra a la aplicación para confirmar la asistencia.</p>
                `
              }).catch(err => console.error("Error sending email:", err));
            }
          }
        }
      }

      // 2. Pagos próximos a vencer (2 días antes)
      for (const payment of payments) {
        if (payment.estado !== "Pendiente") continue;
        if (!myPlayers.some(p => p.id === payment.jugador_id)) continue;

        // Calcular días hasta vencimiento (basado en mes)
        const monthMap = { "Junio": 5, "Septiembre": 8, "Diciembre": 11 };
        const month = monthMap[payment.mes];
        if (!month) continue;

        const year = parseInt(payment.temporada.split('/')[0]);
        const dueDate = new Date(year, month, 30); // Último día del mes
        const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntil === 2) {
          const notifKey = `payment-reminder-${payment.id}`;
          const exists = notifications.some(n => n.tipo === "pago_proximo" && n.referencia_id === notifKey);

          if (!exists) {
            await base44.entities.AppNotification.create({
              usuario_email: user.email,
              tipo: "pago_proximo",
              titulo: "💰 Pago próximo a vencer",
              mensaje: `El pago de ${payment.jugador_nombre} (${payment.mes}) vence en 2 días. Cantidad: ${payment.cantidad}€`,
              prioridad: "importante",
              url_accion: "/ParentPayments",
              referencia_id: notifKey,
              vista: false
            });
          }
        }
      }

      // 3. Nuevas evaluaciones disponibles (últimas 24h)
      const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
      for (const evaluation of evaluations) {
        if (!evaluation.visible_para_padres) continue;
        if (!myPlayers.some(p => p.id === evaluation.jugador_id)) continue;
        
        const evalDate = new Date(evaluation.created_date);
        if (evalDate < oneDayAgo) continue;

        const notifKey = `evaluation-new-${evaluation.id}`;
        const exists = notifications.some(n => n.tipo === "evaluacion_nueva" && n.referencia_id === notifKey);

        if (!exists) {
          await base44.entities.AppNotification.create({
            usuario_email: user.email,
            tipo: "evaluacion_nueva",
            titulo: "⭐ Nueva evaluación disponible",
            mensaje: `El entrenador ha publicado una nueva evaluación de ${evaluation.jugador_nombre}`,
            prioridad: "normal",
            url_accion: "/PlayerProfile",
            referencia_id: notifKey,
            vista: false
          });
        }
      }
    };

    checkAndCreateNotifications();
  }, [callups, payments, evaluations, players, notifications, user]);

  return null;
}