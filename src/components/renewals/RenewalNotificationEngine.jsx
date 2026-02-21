import { useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";

/**
 * Motor de notificaciones escalonadas para renovaciones
 * Envía emails automáticos 30/15/7/3/1 días antes de la fecha límite
 */
export default function RenewalNotificationEngine() {
  useEffect(() => {
    const checkAndSendNotifications = async () => {
      try {
        const configs = await base44.entities.SeasonConfig.list();
        const activeConfig = configs.find(c => c.activa === true);

        if (!activeConfig?.permitir_renovaciones || 
            !activeConfig?.enviar_recordatorios_renovacion || 
            !activeConfig?.fecha_limite_renovaciones) {
          return;
        }

        const fechaLimite = new Date(activeConfig.fecha_limite_renovaciones);
        const hoy = new Date();
        const diasRestantes = differenceInDays(fechaLimite, hoy);

        // Solo enviar en días específicos
        const diasNotificacion = [30, 15, 7, 3, 1];
        if (!diasNotificacion.includes(diasRestantes)) {
          return;
        }

        console.log(`📧 [RenewalNotificationEngine] ${diasRestantes} días para fecha límite, enviando recordatorios...`);

        // Obtener jugadores pendientes
        const allPlayers = await base44.entities.Player.list();
        const pendientes = allPlayers.filter(p => 
          p.estado_renovacion === "pendiente" && 
          p.temporada_renovacion === activeConfig.temporada &&
          p.activo === false
        );

        // Agrupar por familia (padres)
        const familias = {};
        // Agrupar jugadores +18 por separado
        const jugadoresAdultos = {};
        pendientes.forEach(player => {
          // Si es jugador +18 con email propio, notificar por separado
          if (player.es_mayor_edad && player.email_jugador) {
            if (!jugadoresAdultos[player.email_jugador]) {
              jugadoresAdultos[player.email_jugador] = {
                email: player.email_jugador,
                jugadores: []
              };
            }
            jugadoresAdultos[player.email_jugador].jugadores.push(player);
          } else {
            const email = player.email_padre;
            if (!email) return;
            if (!familias[email]) {
              familias[email] = {
                email,
                jugadores: []
              };
            }
            familias[email].jugadores.push(player);
          }
        });

        // Enviar recordatorios
        for (const familia of Object.values(familias)) {
          const jugadoresNombres = familia.jugadores.map(j => j.nombre).join(", ");
          
          const urgencia = diasRestantes <= 3 ? "🚨 URGENTE" : diasRestantes <= 7 ? "⚠️ IMPORTANTE" : "📅 RECORDATORIO";
          
          await base44.functions.invoke('sendEmail', {
            to: familia.email,
            subject: `${urgencia}: ${diasRestantes} día(s) para renovar - Temporada ${activeConfig.temporada}`,
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f1f5f9;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:2px solid ${diasRestantes <= 3 ? '#dc2626' : diasRestantes <= 7 ? '#ea580c' : '#2563eb'};">

<div style="background:${diasRestantes <= 3 ? '#dc2626' : diasRestantes <= 7 ? '#ea580c' : '#2563eb'};padding:30px;text-align:center;">
  <h1 style="color:#fff;margin:0;font-size:28px;">${urgencia}</h1>
  <p style="color:#fff;margin:10px 0 0 0;font-size:18px;font-weight:bold;">Quedan ${diasRestantes} día(s) para renovar</p>
</div>

<div style="padding:30px;">
  <p style="color:#334155;font-size:16px;margin:0 0 20px 0;">Hola,</p>
  
  <p style="color:#334155;font-size:16px;margin:0 0 20px 0;">
    Te recordamos que tienes jugadores <strong>pendientes de renovar</strong> para la temporada ${activeConfig.temporada}:
  </p>

  <div style="background:#fef3c7;border-left:4px solid #f59e0b;padding:15px;margin-bottom:20px;">
    ${familia.jugadores.map(j => `<p style="margin:5px 0;color:#92400e;"><strong>• ${j.nombre}</strong> (${j.deporte})</p>`).join('')}
  </div>

  <div style="background:#fee2e2;border:2px solid #dc2626;border-radius:8px;padding:15px;margin-bottom:20px;">
    <p style="color:#991b1b;margin:0;font-weight:bold;">📅 Fecha límite: ${format(fechaLimite, "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
  </div>

  <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:15px;margin-bottom:25px;">
    <p style="color:#166534;margin:0 0 10px 0;font-weight:bold;">✅ Pasos para renovar:</p>
    <ol style="margin:0;padding-left:20px;color:#166534;">
      <li>Accede a la aplicación del club</li>
      <li>Ve a "Mis Jugadores"</li>
      <li>Haz clic en "Renovar Jugador"</li>
      <li>Selecciona modalidad de pago</li>
      <li>Las cuotas se generarán automáticamente</li>
    </ol>
  </div>

  ${diasRestantes <= 3 ? `
  <div style="background:#fef2f2;border:2px solid #dc2626;border-radius:8px;padding:15px;margin-bottom:20px;">
    <p style="color:#991b1b;margin:0;font-weight:bold;">⚠️ ¡Últimos días!</p>
    <p style="color:#991b1b;margin:10px 0 0 0;font-size:14px;">Si no renuevas antes del ${format(fechaLimite, "d 'de' MMMM", { locale: es })}, los jugadores serán dados de baja automáticamente.</p>
  </div>
  ` : ''}

  <p style="color:#64748b;font-size:14px;margin:20px 0 0 0;">
    Si tienes dudas o problemas, contacta con el club: <strong>cdbustarviejo@gmail.com</strong>
  </p>
</div>

<div style="background:#1e293b;padding:20px;text-align:center;">
  <p style="color:#94a3b8;font-size:12px;margin:0;">CD Bustarviejo • Temporada ${activeConfig.temporada}</p>
</div>

</div>
</body></html>`
          });

          // Crear notificación en app
          await base44.entities.AppNotification.create({
            usuario_email: familia.email,
            titulo: `${urgencia}: ${diasRestantes} día(s) para renovar`,
            mensaje: `Tienes ${familia.jugadores.length} jugador(es) pendientes de renovar: ${jugadoresNombres}`,
            tipo: diasRestantes <= 3 ? "urgente" : "importante",
            icono: diasRestantes <= 3 ? "🚨" : "⏰",
            enlace: "ParentPlayers",
            vista: false
          });

          console.log(`✅ Recordatorio enviado a ${familia.email} (${familia.jugadores.length} jugadores)`);
        }

        // Enviar recordatorios a jugadores +18
        for (const adulto of Object.values(jugadoresAdultos)) {
          const jugadoresNombres = adulto.jugadores.map(j => j.nombre).join(", ");
          const urgencia = diasRestantes <= 3 ? "🚨 URGENTE" : diasRestantes <= 7 ? "⚠️ IMPORTANTE" : "📅 RECORDATORIO";
          
          await base44.functions.invoke('sendEmail', {
            to: adulto.email,
            subject: `${urgencia}: ${diasRestantes} día(s) para renovar tu plaza - Temporada ${activeConfig.temporada}`,
            html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:20px;font-family:Arial,sans-serif;background:#f1f5f9;">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:2px solid ${diasRestantes <= 3 ? '#dc2626' : diasRestantes <= 7 ? '#ea580c' : '#2563eb'};">
<div style="background:${diasRestantes <= 3 ? '#dc2626' : diasRestantes <= 7 ? '#ea580c' : '#2563eb'};padding:30px;text-align:center;">
  <h1 style="color:#fff;margin:0;font-size:28px;">${urgencia}</h1>
  <p style="color:#fff;margin:10px 0 0 0;font-size:18px;font-weight:bold;">Quedan ${diasRestantes} día(s) para renovar</p>
</div>
<div style="padding:30px;">
  <p style="color:#334155;font-size:16px;">Hola,</p>
  <p style="color:#334155;font-size:16px;">Te recordamos que tu plaza como jugador está <strong>pendiente de renovar</strong> para la temporada ${activeConfig.temporada}.</p>
  <div style="background:#fee2e2;border:2px solid #dc2626;border-radius:8px;padding:15px;margin:20px 0;">
    <p style="color:#991b1b;margin:0;font-weight:bold;">📅 Fecha límite: ${format(fechaLimite, "d 'de' MMMM 'de' yyyy", { locale: es })}</p>
  </div>
  <div style="background:#f0fdf4;border-left:4px solid #22c55e;padding:15px;margin-bottom:25px;">
    <p style="color:#166534;margin:0 0 10px 0;font-weight:bold;">✅ Pasos para renovar:</p>
    <ol style="margin:0;padding-left:20px;color:#166534;">
      <li>Accede a la app del club</li>
      <li>Ve a tu Panel de Jugador</li>
      <li>Pulsa "Renovar mi plaza"</li>
      <li>Selecciona modalidad de pago</li>
    </ol>
  </div>
</div>
<div style="background:#1e293b;padding:20px;text-align:center;">
  <p style="color:#94a3b8;font-size:12px;margin:0;">CD Bustarviejo • Temporada ${activeConfig.temporada}</p>
</div>
</div></body></html>`
          });

          await base44.entities.AppNotification.create({
            usuario_email: adulto.email,
            titulo: `${urgencia}: ${diasRestantes} día(s) para renovar tu plaza`,
            mensaje: `Tu inscripción está pendiente de renovar para la temporada ${activeConfig.temporada}.`,
            tipo: diasRestantes <= 3 ? "urgente" : "importante",
            icono: diasRestantes <= 3 ? "🚨" : "⏰",
            enlace: "PlayerDashboard",
            vista: false
          });

          console.log(`✅ Recordatorio +18 enviado a ${adulto.email}`);
        }

        console.log(`📧 [RenewalNotificationEngine] ${Object.keys(familias).length} familias + ${Object.keys(jugadoresAdultos).length} jugadores +18 notificados`);
      } catch (error) {
        console.error('[RenewalNotificationEngine] Error:', error);
      }
    };

    // Ejecutar al montar y cada 12 horas
    checkAndSendNotifications();
    const interval = setInterval(checkAndSendNotifications, 12 * 60 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  return null;
}