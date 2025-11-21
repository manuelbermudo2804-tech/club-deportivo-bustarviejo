import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function EventReminderEngine() {
  const lastCheckRef = useRef(null);

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.list(),
    initialData: [],
    refetchInterval: 300000, // Check every 5 minutes
  });

  useEffect(() => {
    const checkAndSendReminders = async () => {
      const now = new Date();
      
      // Solo ejecutar cada 5 minutos
      if (lastCheckRef.current && (now - lastCheckRef.current) < 5 * 60 * 1000) {
        return;
      }
      lastCheckRef.current = now;

      for (const event of events) {
        // Saltar si no requiere confirmación, no está publicado, o ya se envió recordatorio
        if (!event.requiere_confirmacion || !event.publicado || event.recordatorio_enviado) {
          continue;
        }

        // Saltar si no tiene recordatorio automático activado
        if (!event.enviar_recordatorio_automatico) {
          continue;
        }

        const eventDate = new Date(event.fecha);
        const diasAntes = event.dias_antes_recordatorio || 3;
        const reminderDate = new Date(eventDate);
        reminderDate.setDate(reminderDate.getDate() - diasAntes);

        // Si ya pasó la fecha del recordatorio y aún no se envió
        if (now >= reminderDate && now < eventDate) {
          const confirmedAttendees = event.confirmaciones?.filter(c => c.confirmacion === "asistire") || [];
          const pendingAttendees = event.confirmaciones?.filter(c => c.confirmacion === "pendiente") || [];

          // Enviar recordatorios a confirmados
          for (const attendee of confirmedAttendees) {
            if (!attendee.recordatorio_enviado) {
              try {
                await base44.integrations.Core.SendEmail({
                  to: attendee.usuario_email,
                  subject: `🔔 Recordatorio: ${event.titulo}`,
                  body: `
                    <h2>Recordatorio de Evento</h2>
                    <p>Hola <strong>${attendee.usuario_nombre}</strong>,</p>
                    <p>Te recordamos que confirmaste asistencia al siguiente evento:</p>
                    <ul>
                      <li><strong>Evento:</strong> ${event.titulo}</li>
                      <li><strong>Fecha:</strong> ${new Date(event.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</li>
                      <li><strong>Hora:</strong> ${event.hora || 'Por confirmar'}</li>
                      <li><strong>Ubicación:</strong> ${event.ubicacion || 'Por confirmar'}</li>
                    </ul>
                    ${event.descripcion ? `<p><strong>Descripción:</strong> ${event.descripcion}</p>` : ''}
                    <p>¡Te esperamos!</p>
                  `
                });
                console.log(`Recordatorio enviado a ${attendee.usuario_email} para evento ${event.titulo}`);
              } catch (error) {
                console.error(`Error sending reminder to ${attendee.usuario_email}:`, error);
              }
            }
          }

          // Enviar recordatorio a pendientes
          for (const attendee of pendingAttendees) {
            try {
              await base44.integrations.Core.SendEmail({
                to: attendee.usuario_email,
                subject: `⏰ No olvides confirmar: ${event.titulo}`,
                body: `
                  <h2>Confirma tu asistencia</h2>
                  <p>Hola <strong>${attendee.usuario_nombre}</strong>,</p>
                  <p>Tienes una invitación pendiente para el siguiente evento:</p>
                  <ul>
                    <li><strong>Evento:</strong> ${event.titulo}</li>
                    <li><strong>Fecha:</strong> ${new Date(event.fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</li>
                    <li><strong>Hora:</strong> ${event.hora || 'Por confirmar'}</li>
                    <li><strong>Ubicación:</strong> ${event.ubicacion || 'Por confirmar'}</li>
                  </ul>
                  <p>Por favor, entra a la aplicación para confirmar tu asistencia.</p>
                `
              });
              console.log(`Recordatorio de confirmación enviado a ${attendee.usuario_email}`);
            } catch (error) {
              console.error(`Error sending pending reminder to ${attendee.usuario_email}:`, error);
            }
          }

          // Marcar confirmaciones como enviadas
          const updatedConfirmaciones = event.confirmaciones?.map(c => ({
            ...c,
            recordatorio_enviado: true
          }));

          // Actualizar evento
          await base44.entities.Event.update(event.id, {
            ...event,
            confirmaciones: updatedConfirmaciones,
            recordatorio_enviado: true
          });
        }
      }
    };

    checkAndSendReminders();
  }, [events]);

  return null;
}