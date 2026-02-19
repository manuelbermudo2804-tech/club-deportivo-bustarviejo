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

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
    initialData: [],
    refetchInterval: 300000,
    enabled: !!user,
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
              const { callupPendingReminderHtml } = await import('../emails/emailTemplates');
              await base44.functions.invoke('sendEmail', {
                to: user.email,
                subject: `⏰ Convocatoria pendiente - ${confirmation.jugador_nombre}`,
                html: callupPendingReminderHtml(confirmation.jugador_nombre, callup)
              }).catch(err => console.error("Error sending email:", err));
            }
          }
        }
      }

      // 2. Pagos próximos a vencer (2 días antes) - ENVIAR A CHAT PRIVADO
      for (const payment of payments) {
        if (payment.estado !== "Pendiente") continue;
        if (!myPlayers.some(p => p.id === payment.jugador_id)) continue;

        // Calcular días hasta vencimiento (basado en mes)
        const monthMap = { "Junio": 5, "Septiembre": 8, "Diciembre": 11 };
        const month = monthMap[payment.mes];
        if (!month) continue;

        const year = parseInt(payment.temporada.split('/')[0]);
        const dueDate = new Date(year, month, 30);
        const daysUntil = Math.ceil((dueDate - now) / (1000 * 60 * 60 * 24));

        if (daysUntil === 2) {
          const notifKey = `payment-reminder-${payment.id}`;
          const exists = notifications.some(n => n.tipo === "pago_proximo" && n.referencia_id === notifKey);

          if (!exists) {
            // Notificación visual en la app
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
            
            // ENVIAR A CONVERSACIÓN PRIVADA usando estructura correcta
            const player = players.find(p => p.id === payment.jugador_id);
            if (player && player.email_padre) {
              const mensaje = `🔔 RECORDATORIO AUTOMÁTICO DE PAGO\n\n` +
                `El pago de ${payment.mes} para ${payment.jugador_nombre} vence en 2 días.\n\n` +
                `💰 Cantidad: ${payment.cantidad}€\n` +
                `📅 Vencimiento: ${dueDate.toLocaleDateString('es-ES')}\n\n` +
                `📲 Entra en "Mis Pagos" para subir tu justificante.\n\n` +
                `🔒 MENSAJE PRIVADO: Solo tu familia ve este mensaje.`;
              
              try {
                const allConvs = await base44.entities.PrivateConversation.list();
                let conv = allConvs.find(c => 
                  c.participante_familia_email === player.email_padre &&
                  c.participante_staff_email === 'sistema@cdbustarviejo.com' &&
                  c.participante_staff_rol === 'admin'
                );
                
                if (!conv) {
                  conv = await base44.entities.PrivateConversation.create({
                    participante_familia_email: player.email_padre,
                    participante_familia_nombre: player.nombre_tutor_legal || "Padre/Tutor",
                    participante_staff_email: "sistema@cdbustarviejo.com",
                    participante_staff_nombre: "🤖 Sistema de Recordatorios - Administración",
                    participante_staff_rol: "admin",
                    categoria: player.deporte,
                    jugadores_relacionados: [{ jugador_id: player.id, jugador_nombre: player.nombre }],
                    ultimo_mensaje: mensaje.substring(0, 100),
                    ultimo_mensaje_fecha: new Date().toISOString(),
                    ultimo_mensaje_de: "staff",
                    no_leidos_familia: 0,
                    archivada: false
                  });
                }
                
                await base44.entities.PrivateMessage.create({
                  conversacion_id: conv.id,
                  remitente_email: "sistema@cdbustarviejo.com",
                  remitente_nombre: "🤖 Sistema de Recordatorios",
                  remitente_tipo: "staff",
                  mensaje: mensaje,
                  leido: false
                });
                
                await base44.entities.PrivateConversation.update(conv.id, {
                  ultimo_mensaje: mensaje.substring(0, 100),
                  ultimo_mensaje_fecha: new Date().toISOString(),
                  ultimo_mensaje_de: "staff",
                  no_leidos_familia: (conv.no_leidos_familia || 0) + 1
                });
              } catch (error) {
                console.error("Error enviando mensaje privado:", error);
              }
            }
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

      // 4. Documentos pendientes de firma (últimas 48h)
      const twoDaysAgo = new Date(now - 48 * 60 * 60 * 1000);
      for (const document of documents) {
        if (!document.publicado || !document.requiere_firma) continue;
        
        const docDate = new Date(document.created_date);
        if (docDate < twoDaysAgo) continue;

        // Verificar si es relevante para este usuario
        const isRelevant = document.tipo_destinatario === "individual" 
          ? myPlayers.some(p => document.jugadores_destino?.includes(p.id))
          : (document.categoria_destino === "Todos" || myPlayers.some(p => p.deporte === document.categoria_destino));

        if (!isRelevant) continue;

        // Verificar si tiene firmas pendientes de mis jugadores
        const pendingSignatures = myPlayers.filter(player => {
          const isRelevantForPlayer = document.tipo_destinatario === "individual" 
            ? document.jugadores_destino?.includes(player.id)
            : (document.categoria_destino === "Todos" || player.deporte === document.categoria_destino);
          
          if (!isRelevantForPlayer) return false;
          
          const firma = document.firmas?.find(f => f.jugador_id === player.id);
          return !firma?.firmado && !firma?.confirmado_firma_externa;
        });

        if (pendingSignatures.length === 0) continue;

        const notifKey = `document-pending-${document.id}-${user.email}`;
        const exists = notifications.some(n => n.tipo === "documento_pendiente" && n.referencia_id === notifKey);

        if (!exists) {
          await base44.entities.AppNotification.create({
            usuario_email: user.email,
            tipo: "documento_pendiente",
            titulo: "📄 Documento pendiente de firma",
            mensaje: `Tienes ${pendingSignatures.length} jugador${pendingSignatures.length !== 1 ? 'es' : ''} con firma pendiente: ${document.titulo}`,
            prioridad: "importante",
            url_accion: "/ParentDocuments",
            referencia_id: notifKey,
            vista: false
          });

          // Email automático
          const { documentPendingHtml } = await import('../emails/emailTemplates');
          await base44.functions.invoke('sendEmail', {
            to: user.email,
            subject: `📄 Documento pendiente de firma - ${document.titulo}`,
            html: documentPendingHtml(
              document.titulo,
              document.tipo,
              document.fecha_limite_firma ? new Date(document.fecha_limite_firma).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' }) : null,
              pendingSignatures.map(p => p.nombre)
            )
          }).catch(err => console.error("Error sending document email:", err));
        }
      }
    };

    checkAndCreateNotifications();
  }, [callups, payments, evaluations, players, notifications, documents, user]);

  return null;
}