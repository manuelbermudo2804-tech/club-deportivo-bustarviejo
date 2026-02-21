import { useEffect } from "react";
import { base44 } from "@/api/base44Client";

export default function AutomaticRenewalReminders() {
  useEffect(() => {
    const checkAndSendReminders = async () => {
      try {
        const configs = await base44.entities.SeasonConfig.list();
        const activeConfig = configs.find(c => c.activa === true);

        if (!activeConfig?.enviar_recordatorios_renovacion) return;
        if (!activeConfig?.fecha_limite_renovaciones) return;

        const fechaLimite = new Date(activeConfig.fecha_limite_renovaciones);
        const hoy = new Date();
        const diasRestantes = Math.floor((fechaLimite - hoy) / (1000 * 60 * 60 * 24));

        // Solo enviar si estamos en el día exacto configurado
        if (diasRestantes !== activeConfig.dias_antes_recordatorio_renovacion) return;

        // Obtener usuarios y jugadores
        const allUsers = await base44.entities.User.list();
        const allPlayers = await base44.entities.Player.list();

        // Encontrar padres con jugadores inactivos (excluyendo jugadores +18 que se gestionan solos)
        const jugadoresAdultosPendientes = allPlayers.filter(p =>
          p.es_mayor_edad && p.email_jugador && p.estado_renovacion === "pendiente" && !p.activo
        );
        const emailsAdultos = new Set(jugadoresAdultosPendientes.map(p => p.email_jugador?.toLowerCase()));

        const padresSinRenovar = allUsers.filter(user => {
          if (user.role === "admin" || user.es_entrenador || user.es_coordinador || user.es_tesorero) return false;
          
          // Jugadores que dependen de este padre (excluir adultos que se gestionan solos)
          const jugadoresInactivos = allPlayers.filter(p => 
            (p.email_padre === user.email || p.email_tutor_2 === user.email) && 
            p.activo === false &&
            !(p.es_mayor_edad && p.email_jugador)
          );

          const jugadoresActivos = allPlayers.filter(p => 
            (p.email_padre === user.email || p.email_tutor_2 === user.email) && 
            p.activo === true
          );

          return jugadoresActivos.length === 0 && jugadoresInactivos.length > 0;
        });

        // Enviar recordatorios a jugadores +18
        for (const jugador of jugadoresAdultosPendientes) {
          try {
            await base44.functions.invoke('sendEmail', {
              to: jugador.email_jugador,
              subject: `⏰ Recordatorio: Renueva tu plaza - ${diasRestantes} días restantes`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #ea580c, #f59e0b); padding: 30px; text-align: center;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Renueva tu plaza</h1>
                  </div>
                  <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb;">
                    <p style="font-size: 16px;">Hola <strong>${jugador.nombre}</strong>,</p>
                    <p>Tu plaza para la temporada <strong>${activeConfig.temporada}</strong> está pendiente de renovar.</p>
                    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                      <p style="margin: 0; font-size: 14px;"><strong>⏰ Quedan ${diasRestantes} días</strong> (${fechaLimite.toLocaleDateString('es-ES')})</p>
                    </div>
                    <div style="text-align: center; margin: 30px 0;">
                      <a href="https://app.cdbustarviejo.com" style="background: #ea580c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold;">Renovar Ahora →</a>
                    </div>
                  </div>
                </div>`
            });
            console.log(`✅ Recordatorio +18 enviado a: ${jugador.email_jugador}`);
          } catch (e) { console.error(e); }
          await new Promise(r => setTimeout(r, 300));
        }

        // Enviar recordatorios a padres
        for (const padre of padresSinRenovar) {
          const jugadoresInactivos = allPlayers.filter(p => 
            (p.email_padre === padre.email || p.email_tutor_2 === padre.email) && 
            !p.activo && !(p.es_mayor_edad && p.email_jugador)
          );
          if (jugadoresInactivos.length === 0) continue;

          const nombresJugadores = jugadoresInactivos.map(p => p.nombre).join(", ");

          await base44.functions.invoke('sendEmail', {
            to: padre.email,
            subject: `⏰ Recordatorio: Renovación de Jugadores - ${diasRestantes} días restantes`,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #ea580c, #f59e0b); padding: 30px; text-align: center;">
                  <h1 style="color: white; margin: 0; font-size: 24px;">⏰ Recordatorio de Renovación</h1>
                </div>
                <div style="background: #fff; padding: 30px; border: 1px solid #e5e7eb;">
                  <p style="font-size: 16px;">Hola <strong>${padre.full_name}</strong>,</p>
                  <p>Vemos que aún no has renovado a tus jugadores para la temporada <strong>${activeConfig.temporada}</strong>.</p>
                  
                  <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 14px;"><strong>⏰ Quedan ${diasRestantes} días</strong> para el cierre de renovaciones (${fechaLimite.toLocaleDateString('es-ES')})</p>
                  </div>

                  <div style="background: #f0fdf4; border-left: 4px solid #22c55e; padding: 15px; margin: 20px 0;">
                    <p style="margin: 0 0 10px 0; font-weight: bold;">👥 Tus jugadores pendientes de renovar:</p>
                    <p style="margin: 0; font-size: 14px;">${nombresJugadores}</p>
                  </div>

                  <p style="font-size: 14px;">Para renovar, simplemente:</p>
                  <ol style="font-size: 14px; margin: 10px 0; padding-left: 20px;">
                    <li>Accede a la app del club</li>
                    <li>Ve a "Mis Jugadores"</li>
                    <li>Pulsa "Renovar" en el jugador que quieras inscribir</li>
                  </ol>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://app.cdbustarviejo.com" style="background: #ea580c; color: white; padding: 15px 30px; text-decoration: none; border-radius: 10px; font-weight: bold; display: inline-block;">
                      Renovar Ahora →
                    </a>
                  </div>

                  <p style="font-size: 14px; color: #6b7280;">Si tienes cualquier duda, no dudes en contactarnos.</p>
                  
                  <p style="font-size: 14px; margin-top: 20px;">Atentamente,<br/><strong>CD Bustarviejo</strong></p>
                </div>
                <div style="background: #1e293b; color: white; padding: 15px; text-align: center;">
                  <p style="margin: 0; font-size: 12px;">📧 cdbustarviejo@gmail.com</p>
                </div>
              </div>
            `
          });

          console.log(`✅ Recordatorio de renovación enviado a: ${padre.email}`);
        }

        if (padresSinRenovar.length > 0 || jugadoresAdultosPendientes.length > 0) {
          console.log(`📧 ${padresSinRenovar.length} padres + ${jugadoresAdultosPendientes.length} jugadores +18 recordados`);
        }
      } catch (error) {
        console.error("Error sending automatic renewal reminders:", error);
      }
    };

    // Verificar cada hora
    const interval = setInterval(checkAndSendReminders, 60 * 60 * 1000);
    checkAndSendReminders(); // Primera ejecución inmediata

    return () => clearInterval(interval);
  }, []);

  return null;
}