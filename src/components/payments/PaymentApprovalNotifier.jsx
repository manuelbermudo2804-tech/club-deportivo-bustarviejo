import { useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";

/**
 * Componente invisible que detecta cuando un admin aprueba pagos
 * y envía notificaciones automáticas a las familias
 */
export default function PaymentApprovalNotifier({ isAdmin }) {
  const previousPaymentsRef = useRef(null);

  const { data: payments = [] } = useQuery({
    queryKey: ['paymentsNotifier'],
    queryFn: () => base44.entities.Payment.list('-updated_date'),
    refetchInterval: 15000, // Cada 15 segundos
    enabled: isAdmin,
  });

  useEffect(() => {
    if (!isAdmin || !payments || payments.length === 0) return;

    // Primera carga - guardar estado inicial
    if (!previousPaymentsRef.current) {
      previousPaymentsRef.current = payments;
      return;
    }

    // Detectar pagos que cambiaron de "En revisión" a "Pagado"
    const previousPayments = previousPaymentsRef.current;
    
    payments.forEach(currentPayment => {
      const previousPayment = previousPayments.find(p => p.id === currentPayment.id);
      
      // Si el pago cambió de "En revisión" a "Pagado"
      if (previousPayment?.estado === "En revisión" && currentPayment.estado === "Pagado") {
        sendApprovalNotification(currentPayment);
      }
    });

    // Actualizar referencia
    previousPaymentsRef.current = payments;
  }, [payments, isAdmin]);

  const sendApprovalNotification = async (payment) => {
    try {
      console.log("✅ Enviando notificación de aprobación de pago:", payment.jugador_nombre);

      // Buscar el jugador para obtener emails
      const players = await base44.entities.Player.list();
      const player = players.find(p => p.id === payment.jugador_id);
      
      if (!player) return;

      const emails = [player.email_padre];
      if (player.email_tutor_2) emails.push(player.email_tutor_2);

      // Crear notificación en la app para cada email
      for (const email of emails) {
        await base44.entities.AppNotification.create({
          usuario_email: email,
          titulo: "✅ Pago Aprobado",
          mensaje: `El pago de ${payment.cantidad}€ de ${payment.jugador_nombre} (${payment.mes}) ha sido aprobado por el club. ¡Gracias!`,
          tipo: "pago_aprobado",
          prioridad: "normal",
          enlace: "ParentPayments",
          vista: false,
          leida: false
        });

        // Enviar email de confirmación
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `✅ Pago Aprobado - ${payment.jugador_nombre}`,
          body: `
            <h2 style="color: #16a34a;">✅ Pago Aprobado</h2>
            <p>Hola,</p>
            <p>El pago de <strong>${payment.cantidad}€</strong> correspondiente a <strong>${payment.jugador_nombre}</strong> (${payment.mes}) ha sido <strong>aprobado por el club</strong>.</p>
            <p>✅ <strong>Estado:</strong> Pagado</p>
            ${payment.notas ? `<p>📝 <strong>Notas:</strong> ${payment.notas}</p>` : ''}
            <p>¡Gracias por tu puntualidad!</p>
            <br>
            <p style="color: #64748b; font-size: 12px;">CD Bustarviejo</p>
          `
        });
      }

      console.log("✅ Notificaciones enviadas correctamente");
    } catch (error) {
      console.error("Error enviando notificación de aprobación:", error);
    }
  };

  return null; // Componente invisible
}