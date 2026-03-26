import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY');

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:CDBUSTARVIEJO@GMAIL.COM', VAPID_PUBLIC, VAPID_PRIVATE);
}

// Normalize category name to group_id format
const toGroupId = (s) => (s || '').toString().replace(/\(.*?\)/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '_').toLowerCase();

async function sendPushToEmails(base44, emails, title, body, url, tag) {
  if (!emails.length || !VAPID_PUBLIC || !VAPID_PRIVATE) return { sent: 0, failed: 0 };

  // Get all active subscriptions for the target emails
  const allSubs = [];
  for (const email of [...new Set(emails)]) {
    try {
      const subs = await base44.asServiceRole.entities.PushSubscription.filter({
        usuario_email: email,
        activa: true
      });
      allSubs.push(...subs);
    } catch {}
  }

  if (allSubs.length === 0) return { sent: 0, failed: 0 };

  const payload = JSON.stringify({
    title,
    body,
    tag: tag || 'notification',
    badgeCount: 1,
    requireInteraction: false,
    data: { url: url || '/', timestamp: new Date().toISOString() }
  });

  let sent = 0, failed = 0;
  for (const sub of allSubs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh_key } },
        payload
      );
      sent++;
    } catch (err) {
      failed++;
      if (err.statusCode === 410 || err.statusCode === 404) {
        try { await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false }); } catch {}
      }
    }
  }
  return { sent, failed };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const { event, data } = payload;

    if (!event || !data) {
      return Response.json({ error: 'Missing event/data' }, { status: 400 });
    }

    const entityName = event.entity_name;
    const senderEmail = data.created_by || data.remitente_email || data.autor_email || data.entrenador_email || '';

    // ==========================================
    // 1. CHAT MESSAGES (ChatMessage entity)
    // ==========================================
    if (entityName === 'ChatMessage') {
      const grupoId = data.grupo_id || data.deporte || '';
      const senderName = data.remitente_nombre || 'Alguien';
      const msgPreview = (data.mensaje || '').substring(0, 80);
      
      if (!grupoId) return Response.json({ skipped: 'no grupo_id' });

      // Find all players in this category to get parent emails
      const normalizedCat = toGroupId(grupoId);
      const allPlayers = await base44.asServiceRole.entities.Player.filter({ activo: true });
      
      const targetEmails = [];
      for (const p of allPlayers) {
        const playerCat = toGroupId(p.categoria_principal || p.deporte || '');
        if (playerCat !== normalizedCat) continue;
        if (p.email_padre) targetEmails.push(p.email_padre);
        if (p.email_tutor_2) targetEmails.push(p.email_tutor_2);
        if (p.email_jugador) targetEmails.push(p.email_jugador);
      }

      // Also notify coaches/coordinators of this category
      const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
      for (const u of users) {
        if (u.es_entrenador && (u.categorias_entrena || []).some(c => toGroupId(c) === normalizedCat)) {
          targetEmails.push(u.email);
        }
        if (u.es_coordinador && (u.categorias_coordina || []).some(c => toGroupId(c) === normalizedCat)) {
          targetEmails.push(u.email);
        }
      }

      // Exclude sender
      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      
      const result = await sendPushToEmails(
        base44, filtered,
        `💬 ${senderName}`,
        msgPreview || '📎 Archivo adjunto',
        '/FamilyChatsHub',
        `chat-${normalizedCat}`
      );
      return Response.json({ type: 'chat', ...result });
    }

    // ==========================================
    // 2. CONVOCATORIAS (Convocatoria entity)
    // ==========================================
    if (entityName === 'Convocatoria') {
      // Only send on published callups
      if (!data.publicada) return Response.json({ skipped: 'not published' });

      const jugadores = data.jugadores_convocados || [];
      const targetEmails = [];
      
      for (const j of jugadores) {
        if (j.email_padre) targetEmails.push(j.email_padre);
        if (j.email_jugador) targetEmails.push(j.email_jugador);
      }

      // If no emails in jugadores_convocados, lookup from Player entity
      if (targetEmails.length === 0) {
        for (const j of jugadores) {
          if (!j.jugador_id) continue;
          try {
            const players = await base44.asServiceRole.entities.Player.filter({ id: j.jugador_id });
            const p = players[0];
            if (p?.email_padre) targetEmails.push(p.email_padre);
            if (p?.email_tutor_2) targetEmails.push(p.email_tutor_2);
            if (p?.email_jugador) targetEmails.push(p.email_jugador);
          } catch {}
        }
      }

      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      const titulo = data.titulo || 'Nueva convocatoria';
      const fecha = data.fecha_partido || '';
      const hora = data.hora_partido || '';

      const result = await sendPushToEmails(
        base44, filtered,
        `⚽ ${titulo}`,
        `${fecha}${hora ? ' a las ' + hora : ''} - Confirma asistencia`,
        '/ParentCallups',
        `callup-${event.entity_id}`
      );
      return Response.json({ type: 'callup', ...result });
    }

    // ==========================================
    // 3. ANNOUNCEMENTS (Announcement entity)
    // ==========================================
    if (entityName === 'Announcement') {
      if (!data.publicado) return Response.json({ skipped: 'not published' });

      const titulo = data.titulo || 'Nuevo anuncio';
      const prioridad = data.prioridad || 'Normal';
      const destinatarios = data.destinatarios_tipo || 'Todos';

      // Get target emails based on destinatarios_tipo
      const targetEmails = [];
      
      if (data.destinatarios_emails && data.destinatarios_emails.length > 0) {
        targetEmails.push(...data.destinatarios_emails);
      } else {
        // Get players by category
        const allPlayers = await base44.asServiceRole.entities.Player.filter({ activo: true });
        for (const p of allPlayers) {
          const matchCategory = destinatarios === 'Todos' || 
            (p.categoria_principal || p.deporte) === destinatarios;
          if (!matchCategory) continue;
          if (p.email_padre) targetEmails.push(p.email_padre);
          if (p.email_tutor_2) targetEmails.push(p.email_tutor_2);
          if (p.email_jugador) targetEmails.push(p.email_jugador);
        }
      }

      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      const icon = prioridad === 'Urgente' ? '🚨' : prioridad === 'Importante' ? '📢' : '📋';

      const result = await sendPushToEmails(
        base44, filtered,
        `${icon} ${titulo}`,
        (data.contenido || '').substring(0, 100),
        '/Announcements',
        `announcement-${event.entity_id}`
      );
      return Response.json({ type: 'announcement', ...result });
    }

    // ==========================================
    // 4. PLAYER UPDATED (federation signatures)
    // ==========================================
    if (entityName === 'Player') {
      // Only trigger when firma links are set but not completed
      const hasNewFirmaJugador = data.enlace_firma_jugador && !data.firma_jugador_completada;
      const hasNewFirmaTutor = data.enlace_firma_tutor && !data.firma_tutor_completada;
      
      if (!hasNewFirmaJugador && !hasNewFirmaTutor) {
        return Response.json({ skipped: 'no pending signatures' });
      }

      const targetEmails = [];
      if (data.email_padre) targetEmails.push(data.email_padre);
      if (data.email_tutor_2) targetEmails.push(data.email_tutor_2);
      if (data.email_jugador) targetEmails.push(data.email_jugador);

      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      const nombre = data.nombre || 'jugador';

      const result = await sendPushToEmails(
        base44, filtered,
        '✍️ Firma pendiente',
        `${nombre} tiene documentos de federación pendientes de firmar`,
        '/FederationSignatures',
        `signature-${event.entity_id}`
      );
      return Response.json({ type: 'signature', ...result });
    }

    return Response.json({ skipped: 'unhandled entity', entityName });
  } catch (error) {
    console.error('onPushTrigger error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});