import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Motor de recordatorios automáticos para renovaciones de jugadores
 * 
 * Lógica de notificaciones:
 * - 45 días antes del fin de temporada: Primera notificación
 * - 30 días antes: Segundo recordatorio
 * - 15 días antes: Recordatorio urgente
 * - 7 días antes: Recordatorio final
 */
export default function RenewalReminderEngine({ user }) {
  const lastCheckRef = useRef(null);

  const { data: seasonConfig } = useQuery({
    queryKey: ['seasonConfig'],
    queryFn: async () => {
      const configs = await base44.entities.SeasonConfig.list();
      return configs.find(c => c.activa === true);
    },
    refetchInterval: 3600000, // Check every hour
    enabled: !!user,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    refetchInterval: 3600000,
    enabled: !!user,
  });

  const { data: notifications } = useQuery({
    queryKey: ['renewalNotifications'],
    queryFn: () => base44.entities.AppNotification.list(),
    initialData: [],
    enabled: false,
  });

  useEffect(() => {
    if (!user || !seasonConfig || !seasonConfig.permitir_renovaciones) return;

    const checkRenewalReminders = async () => {
      const now = new Date();
      
      // Solo ejecutar cada hora para evitar spam
      if (lastCheckRef.current && (now - lastCheckRef.current) < 60 * 60 * 1000) {
        return;
      }
      lastCheckRef.current = now;

      // Calcular fin de temporada (31 de agosto del año final)
      const seasonYears = seasonConfig.temporada.split('/');
      const endYear = parseInt(seasonYears[1] || seasonYears[0]);
      const seasonEnd = new Date(endYear, 7, 31); // 31 de agosto
      
      const daysUntilEnd = Math.ceil((seasonEnd - now) / (1000 * 60 * 60 * 24));

      // Solo procesar si estamos en ventana de renovación (45 días antes del fin)
      if (daysUntilEnd > 45 || daysUntilEnd < 0) return;

      // Obtener jugadores del usuario que necesitan renovación
      const myPlayers = players.filter(p => 
        (p.email_padre === user.email || p.email_tutor_2 === user.email) &&
        p.activo === true &&
        p.estado_renovacion === "pendiente" &&
        p.temporada_renovacion === seasonConfig.temporada
      );

      if (myPlayers.length === 0) return;

      // Definir umbrales de notificación
      const thresholds = [
        { days: 45, type: 'primera', priority: 'normal' },
        { days: 30, type: 'segunda', priority: 'importante' },
        { days: 15, type: 'urgente', priority: 'importante' },
        { days: 7, type: 'final', priority: 'urgente' }
      ];

      for (const threshold of thresholds) {
        // Verificar si estamos en el día exacto del recordatorio
        if (daysUntilEnd !== threshold.days) continue;

        const notifKey = `renewal-reminder-${threshold.type}-${user.email}-${seasonConfig.temporada}`;
        const exists = notifications.some(n => 
          n.tipo === "renovacion_pendiente" && 
          n.referencia_id === notifKey
        );

        if (exists) continue;

        // Crear notificación en app
        await base44.entities.AppNotification.create({
          usuario_email: user.email,
          tipo: "renovacion_pendiente",
          titulo: threshold.type === 'final' 
            ? "🚨 ¡ÚLTIMA SEMANA! Renovación Pendiente" 
            : threshold.type === 'urgente'
            ? "⚠️ Renovación Urgente"
            : "🔄 Recordatorio de Renovación",
          mensaje: `Tienes ${myPlayers.length} jugador${myPlayers.length !== 1 ? 'es' : ''} pendiente${myPlayers.length !== 1 ? 's' : ''} de renovar para la temporada ${seasonConfig.temporada}. Quedan ${daysUntilEnd} días.`,
          prioridad: threshold.priority,
          url_accion: "/PlayerRenewal",
          referencia_id: notifKey,
          vista: false
        });

        // Enviar email con recordatorio
        const emailBody = threshold.type === 'final'
          ? `
            <div style="background: #fee2e2; border-left: 6px solid #dc2626; padding: 24px; margin: 20px 0;">
              <h2 style="color: #991b1b; margin: 0 0 16px 0;">🚨 ¡ÚLTIMA SEMANA PARA RENOVAR!</h2>
              <p style="color: #7f1d1d; font-size: 16px; margin: 0;">
                Quedan solo <strong>${daysUntilEnd} días</strong> para renovar tus jugadores para la temporada ${seasonConfig.temporada}.
              </p>
            </div>
            
            <h3 style="color: #1e293b;">Jugadores Pendientes de Renovación:</h3>
            <ul style="font-size: 16px;">
              ${myPlayers.map(p => `<li><strong>${p.nombre}</strong> - ${p.deporte}</li>`).join('')}
            </ul>
            
            <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; color: #78350f;">
                <strong>⚠️ IMPORTANTE:</strong> Si no renuevas antes del 31 de agosto, los jugadores quedarán inactivos y no podrán participar en la nueva temporada.
              </p>
            </div>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.APP_URL || 'https://cdbustarviejo.app'}/PlayerRenewal" 
                 style="background: #dc2626; color: white; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; display: inline-block;">
                🔄 RENOVAR AHORA
              </a>
            </div>
          `
          : threshold.type === 'urgente'
          ? `
            <div style="background: #fef3c7; border-left: 6px solid #f59e0b; padding: 20px; margin: 20px 0;">
              <h2 style="color: #78350f; margin: 0 0 12px 0;">⚠️ Renovación Urgente</h2>
              <p style="color: #92400e; font-size: 16px; margin: 0;">
                Quedan <strong>${daysUntilEnd} días</strong> para renovar tus jugadores.
              </p>
            </div>
            
            <h3 style="color: #1e293b;">Jugadores Pendientes:</h3>
            <ul style="font-size: 16px;">
              ${myPlayers.map(p => `<li><strong>${p.nombre}</strong> - ${p.deporte}</li>`).join('')}
            </ul>
            
            <p style="color: #475569; font-size: 15px; line-height: 1.6;">
              Por favor, completa el proceso de renovación lo antes posible para asegurar la plaza de tus jugadores en la temporada ${seasonConfig.temporada}.
            </p>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${process.env.APP_URL || 'https://cdbustarviejo.app'}/PlayerRenewal" 
                 style="background: #f59e0b; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                🔄 Renovar Jugadores
              </a>
            </div>
          `
          : `
            <h2 style="color: #1e293b;">🔄 Renovación para la Temporada ${seasonConfig.temporada}</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Estimado/a padre/madre/tutor,
            </p>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6;">
              Es momento de renovar la inscripción de tus jugadores para la próxima temporada ${seasonConfig.temporada}.
              Quedan <strong>${daysUntilEnd} días</strong> para completar el proceso.
            </p>
            
            <h3 style="color: #1e293b;">Jugadores Pendientes:</h3>
            <ul style="font-size: 16px;">
              ${myPlayers.map(p => `<li><strong>${p.nombre}</strong> - ${p.deporte}</li>`).join('')}
            </ul>
            
            <div style="background: #e0e7ff; border-left: 4px solid #4f46e5; padding: 16px; margin: 24px 0;">
              <p style="margin: 0; color: #3730a3;">
                <strong>📋 Proceso de Renovación:</strong>
              </p>
              <ol style="margin: 8px 0 0 0; padding-left: 20px; color: #3730a3;">
                <li>Confirma la categoría de cada jugador</li>
                <li>Actualiza datos si es necesario</li>
                <li>Completa el pago de la inscripción</li>
              </ol>
            </div>
            
            <div style="text-align: center; margin: 24px 0;">
              <a href="${process.env.APP_URL || 'https://cdbustarviejo.app'}/PlayerRenewal" 
                 style="background: #4f46e5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                🔄 Comenzar Renovación
              </a>
            </div>
          `;

        try {
          await base44.integrations.Core.SendEmail({
            from_name: "CD Bustarviejo - Renovaciones",
            to: user.email,
            subject: threshold.type === 'final'
              ? `🚨 ¡ÚLTIMA SEMANA! Renovación Pendiente - ${myPlayers.length} jugador${myPlayers.length !== 1 ? 'es' : ''}`
              : threshold.type === 'urgente'
              ? `⚠️ Renovación Urgente (${daysUntilEnd} días) - CD Bustarviejo`
              : `🔄 Renovación Temporada ${seasonConfig.temporada} - CD Bustarviejo`,
            body: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #ea580c 0%, #f97316 100%); padding: 24px; text-align: center;">
                  <h1 style="color: white; margin: 0;">CD Bustarviejo</h1>
                  <p style="color: #fed7aa; margin: 8px 0 0 0;">Gestión de Renovaciones</p>
                </div>
                
                <div style="padding: 32px 24px;">
                  ${emailBody}
                  
                  <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 32px 0;" />
                  
                  <p style="color: #64748b; font-size: 14px; text-align: center; margin: 0;">
                    CD Bustarviejo | Temporada ${seasonConfig.temporada}<br/>
                    Para consultas: <a href="mailto:cdbustarviejo@gmail.com" style="color: #ea580c;">cdbustarviejo@gmail.com</a>
                  </p>
                </div>
              </div>
            `
          });

          console.log(`✅ Recordatorio de renovación enviado (${threshold.type}) a ${user.email}`);
        } catch (error) {
          console.error("Error enviando email de renovación:", error);
        }
      }
    };

    checkRenewalReminders();
  }, [user, seasonConfig, players, notifications]);

  return null;
}