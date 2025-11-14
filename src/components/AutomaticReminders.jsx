import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function AutomaticReminders() {
  useEffect(() => {
    const checkAndSendReminders = async () => {
      try {
        // Check callups that need reminder (24h before)
        const callups = await base44.entities.Convocatoria.list();
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        for (const callup of callups) {
          if (callup.fecha_partido === tomorrowStr && 
              callup.publicada && 
              !callup.cerrada &&
              !callup.recordatorio_24h_enviado) {
            
            // Send reminder emails
            const pendingPlayers = callup.jugadores_convocados.filter(j => j.confirmacion === "pendiente");
            
            if (pendingPlayers.length > 0) {
              for (const player of pendingPlayers) {
                const email = player.email_padre || player.email_jugador;
                if (!email) continue;

                await base44.integrations.Core.SendEmail({
                  from_name: `CF Bustarviejo - ${callup.entrenador_nombre}`,
                  to: email,
                  subject: `⏰ RECORDATORIO: Convocatoria mañana - ${callup.titulo}`,
                  body: `
¡Hola ${player.jugador_nombre}!

⏰ RECORDATORIO: La convocatoria es MAÑANA

════════════════════════════════════════
${callup.tipo}: ${callup.titulo}
════════════════════════════════════════

📅 Fecha: MAÑANA ${callup.fecha_partido}
⏰ Hora: ${callup.hora_partido}
${callup.hora_concentracion ? `🕐 Concentración: ${callup.hora_concentracion}` : ''}
📍 Ubicación: ${callup.ubicacion}

⚠️ AÚN NO HAS CONFIRMADO TU ASISTENCIA
Por favor, accede a la aplicación y confirma lo antes posible.

Entrenador: ${callup.entrenador_nombre}

Atentamente,
Club de Fútbol Bustarviejo
                  `
                });

                await new Promise(resolve => setTimeout(resolve, 300));
              }

              // Mark as sent
              await base44.entities.Convocatoria.update(callup.id, {
                ...callup,
                recordatorio_24h_enviado: true
              });
            }
          }
        }

        // Check for upcoming trainings (send reminder 2h before)
        const schedules = await base44.entities.TrainingSchedule.list();
        const currentDay = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"][now.getDay()];
        const currentHour = now.getHours();
        const currentMinutes = now.getMinutes();

        for (const schedule of schedules) {
          if (schedule.dia_semana === currentDay && schedule.activo) {
            const [hora, minutos] = schedule.hora_inicio.split(':').map(Number);
            const hoursUntil = hora - currentHour;
            const minutesUntil = (hora * 60 + minutos) - (currentHour * 60 + currentMinutes);

            // Send reminder 2 hours before
            if (minutesUntil > 100 && minutesUntil <= 140 && !schedule.recordatorio_enviado_hoy) {
              // Get players from this category
              const players = await base44.entities.Player.list();
              const categoryPlayers = players.filter(p => p.deporte === schedule.categoria && p.activo);

              for (const player of categoryPlayers) {
                const email = player.email_padre || player.email_tutor_2;
                if (!email) continue;

                await base44.integrations.Core.SendEmail({
                  from_name: "CF Bustarviejo",
                  to: email,
                  subject: `⏰ Entrenamiento en 2 horas - ${schedule.categoria}`,
                  body: `
¡Hola!

Recordatorio de entrenamiento hoy:

📍 ${schedule.ubicacion || "Campo habitual"}
⏰ Hora: ${schedule.hora_inicio}
👕 ${schedule.categoria}

¡Nos vemos en el campo!

CF Bustarviejo
                  `
                });

                await new Promise(resolve => setTimeout(resolve, 300));
              }

              // Mark as sent (reset at midnight)
              await base44.entities.TrainingSchedule.update(schedule.id, {
                ...schedule,
                recordatorio_enviado_hoy: true
              });
            }
          }
        }

      } catch (error) {
        console.error("Error checking automatic reminders:", error);
      }
    };

    // Check every 30 minutes
    checkAndSendReminders();
    const interval = setInterval(checkAndSendReminders, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}