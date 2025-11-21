import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export default function DocumentReminderEngine({ user }) {
  const lastCheckRef = useRef(null);

  const { data: documents } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
    initialData: [],
    refetchInterval: 300000, // Check every 5 minutes
    enabled: !!user,
  });

  const { data: players } = useQuery({
    queryKey: ['players'],
    queryFn: () => base44.entities.Player.list(),
    initialData: [],
    enabled: !!user,
  });

  const { data: adminUsers } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    enabled: !!user && user.role === "admin",
  });

  useEffect(() => {
    if (!user || !documents.length || !players.length) return;

    const checkDocumentReminders = async () => {
      const now = new Date();
      
      // Solo ejecutar cada 5 minutos
      if (lastCheckRef.current && (now - lastCheckRef.current) < 5 * 60 * 1000) {
        return;
      }
      
      // Verificar si ya hay un check en progreso
      if (lastCheckRef.current === 'processing') return;
      
      lastCheckRef.current = 'processing';

      for (const document of documents) {
        if (!document.publicado || !document.requiere_firma) continue;

        // 1. RECORDATORIOS A FAMILIAS CON FIRMAS PENDIENTES
        const pendingFamilies = getPendingFamilies(document, players);
        
        if (pendingFamilies.length > 0 && document.frecuencia_recordatorios_dias > 0) {
          const shouldSendReminder = shouldSendFamilyReminder(document, now);
          
          if (shouldSendReminder) {
            await sendFamilyReminders(document, pendingFamilies);
            
            // Actualizar fecha del último recordatorio
            await base44.entities.Document.update(document.id, {
              ...document,
              ultimo_recordatorio_enviado: now.toISOString()
            });
          }
        }

        // 2. ALERTAS A ADMINISTRADORES
        if (user.role === "admin") {
          await checkAdminAlerts(document, players, adminUsers, now);
        }
      }
      
      // Marcar como completado
      lastCheckRef.current = now;
    };

    // Ejecutar inmediatamente y luego cada 5 minutos
    const timer = setTimeout(checkDocumentReminders, 0);
    
    return () => clearTimeout(timer);
  }, [documents.length, players.length, adminUsers?.length, user?.role]);

  return null;
}

// Obtener familias con firmas pendientes
function getPendingFamilies(document, players) {
  const familiesMap = new Map();

  const relevantPlayers = document.tipo_destinatario === "individual"
    ? players.filter(p => document.jugadores_destino?.includes(p.id))
    : document.categoria_destino === "Todos"
    ? players
    : players.filter(p => p.deporte === document.categoria_destino);

  for (const player of relevantPlayers) {
    const firma = document.firmas?.find(f => f.jugador_id === player.id);
    if (!firma?.firmado && !firma?.confirmado_firma_externa) {
      const email = player.email_padre;
      if (!familiesMap.has(email)) {
        familiesMap.set(email, {
          email: email,
          players: []
        });
      }
      familiesMap.get(email).players.push(player.nombre);
    }
  }

  return Array.from(familiesMap.values());
}

// Verificar si se debe enviar recordatorio a familias
function shouldSendFamilyReminder(document, now) {
  if (!document.ultimo_recordatorio_enviado) {
    // Primer recordatorio: enviar 24h después de publicación
    const docDate = new Date(document.created_date);
    const hoursSince = (now - docDate) / (1000 * 60 * 60);
    return hoursSince >= 24;
  }

  // Recordatorios subsecuentes según frecuencia configurada
  const lastReminder = new Date(document.ultimo_recordatorio_enviado);
  const daysSince = (now - lastReminder) / (1000 * 60 * 60 * 24);
  return daysSince >= document.frecuencia_recordatorios_dias;
}

// Enviar recordatorios a familias
async function sendFamilyReminders(document, families) {
  const deadlineText = document.fecha_limite_firma 
    ? `<p style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 16px 0;">
         <strong>⏰ Fecha límite:</strong> ${new Date(document.fecha_limite_firma).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}
       </p>`
    : '';

  for (const family of families) {
    try {
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo",
        to: family.email,
        subject: `🔔 Recordatorio: Documento pendiente de firma - ${document.titulo}`,
        body: `
          <h2>Recordatorio de Documento Pendiente</h2>
          <p>Este es un recordatorio de que tienes un documento pendiente de firma:</p>
          
          <div style="background: #f1f5f9; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <p><strong>📄 Documento:</strong> ${document.titulo}</p>
            <p><strong>📋 Tipo:</strong> ${document.tipo}</p>
            ${document.descripcion ? `<p><strong>📝 Descripción:</strong> ${document.descripcion}</p>` : ''}
          </div>

          ${deadlineText}

          <p><strong>Jugadores con firma pendiente:</strong></p>
          <ul>
            ${family.players.map(p => `<li>${p}</li>`).join('')}
          </ul>

          ${document.enlace_firma_externa ? 
            `<p>Para firmar el documento, accede al siguiente enlace: <a href="${document.enlace_firma_externa}" style="color: #ea580c; font-weight: bold;">${document.enlace_firma_externa}</a></p>` :
            `<p>Por favor, accede a la aplicación del club para revisar y firmar el documento.</p>`
          }

          <p style="margin-top: 24px; color: #64748b; font-size: 14px;">
            CD Bustarviejo - Gestión Documental<br>
            Este es un recordatorio automático
          </p>
        `
      });
    } catch (error) {
      console.error(`Error sending reminder to ${family.email}:`, error);
    }

    // Pequeña pausa entre emails
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}

// Verificar y enviar alertas a administradores
async function checkAdminAlerts(document, players, adminUsers, now) {
  const alertas = document.alertas_admin_enviadas || [];
  
  // Calcular estadísticas de firmas
  const relevantPlayers = document.tipo_destinatario === "individual"
    ? players.filter(p => document.jugadores_destino?.includes(p.id))
    : document.categoria_destino === "Todos"
    ? players
    : players.filter(p => p.deporte === document.categoria_destino);

  const totalRequired = relevantPlayers.length;
  const signed = document.firmas?.filter(f => f.firmado || f.confirmado_firma_externa).length || 0;
  const pending = totalRequired - signed;
  const pendingPercent = totalRequired > 0 ? (pending / totalRequired) * 100 : 0;

  // ALERTA 1: Fecha límite próxima
  if (document.fecha_limite_firma) {
    const deadline = new Date(document.fecha_limite_firma);
    const daysUntil = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24));
    
    if (daysUntil <= document.dias_antes_alerta_admin && daysUntil >= 0) {
      const alertKey = `deadline-${daysUntil}`;
      const alreadySent = alertas.some(a => a.tipo === alertKey);
      
      if (!alreadySent && pending > 0) {
        await sendAdminAlert({
          document,
          adminUsers,
          tipo: "deadline",
          mensaje: `⏰ El documento "${document.titulo}" vence en ${daysUntil} día${daysUntil !== 1 ? 's' : ''} y tiene ${pending} firma${pending !== 1 ? 's' : ''} pendiente${pending !== 1 ? 's' : ''} (${pendingPercent.toFixed(0)}%)`,
          stats: { totalRequired, signed, pending, pendingPercent, daysUntil }
        });

        alertas.push({ tipo: alertKey, fecha: now.toISOString() });
        await base44.entities.Document.update(document.id, {
          ...document,
          alertas_admin_enviadas: alertas
        });
      }
    }
  }

  // ALERTA 2: Alto porcentaje de firmas pendientes
  if (pendingPercent >= document.porcentaje_alerta_admin && totalRequired >= 5) {
    const alertKey = `high-pending-${Math.floor(pendingPercent / 10) * 10}`;
    const alreadySent = alertas.some(a => a.tipo === alertKey);
    
    // Enviar solo una vez cuando se cruza cada umbral de 10%
    if (!alreadySent) {
      await sendAdminAlert({
        document,
        adminUsers,
        tipo: "high-pending",
        mensaje: `⚠️ El documento "${document.titulo}" tiene un ${pendingPercent.toFixed(0)}% de firmas pendientes (${pending} de ${totalRequired})`,
        stats: { totalRequired, signed, pending, pendingPercent }
      });

      alertas.push({ tipo: alertKey, fecha: now.toISOString() });
      await base44.entities.Document.update(document.id, {
        ...document,
        alertas_admin_enviadas: alertas
      });
    }
  }
}

// Enviar alerta a administradores
async function sendAdminAlert({ document, adminUsers, tipo, mensaje, stats }) {
  const admins = adminUsers.filter(u => u.role === "admin");
  
  const emailBody = `
    <h2>Alerta de Documento</h2>
    <p>${mensaje}</p>
    
    <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 16px 0;">
      <p><strong>📄 Documento:</strong> ${document.titulo}</p>
      <p><strong>📋 Tipo:</strong> ${document.tipo}</p>
      ${document.fecha_limite_firma ? `<p><strong>⏰ Fecha límite:</strong> ${new Date(document.fecha_limite_firma).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}</p>` : ''}
    </div>

    <h3>📊 Estadísticas de Firmas</h3>
    <ul>
      <li><strong>Total requerido:</strong> ${stats.totalRequired} firmas</li>
      <li><strong>✅ Firmadas:</strong> ${stats.signed} (${((stats.signed / stats.totalRequired) * 100).toFixed(0)}%)</li>
      <li><strong>⏳ Pendientes:</strong> ${stats.pending} (${stats.pendingPercent.toFixed(0)}%)</li>
      ${stats.daysUntil !== undefined ? `<li><strong>⏰ Días hasta vencimiento:</strong> ${stats.daysUntil}</li>` : ''}
    </ul>

    <p>Accede al panel de administración para ver más detalles y tomar acciones.</p>

    <p style="margin-top: 24px; color: #64748b; font-size: 14px;">
      CD Bustarviejo - Sistema de Alertas Automáticas
    </p>
  `;

  for (const admin of admins) {
    try {
      await base44.integrations.Core.SendEmail({
        from_name: "CD Bustarviejo Sistema",
        to: admin.email,
        subject: `🔔 Alerta Admin: ${tipo === "deadline" ? "Fecha límite próxima" : "Alto % pendiente"} - ${document.titulo}`,
        body: emailBody
      });
    } catch (error) {
      console.error(`Error sending admin alert to ${admin.email}:`, error);
    }

    await new Promise(resolve => setTimeout(resolve, 300));
  }
}