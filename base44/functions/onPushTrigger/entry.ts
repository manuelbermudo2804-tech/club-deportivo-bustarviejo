import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY');

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:CDBUSTARVIEJO@GMAIL.COM', VAPID_PUBLIC, VAPID_PRIVATE);
}

const toGroupId = (s) => (s || '').toString().replace(/\(.*?\)/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '_').toLowerCase();

async function sendPushToEmails(base44, emails, title, body, url, tag) {
  const uniqueEmails = [...new Set(emails)];
  if (!uniqueEmails.length || !VAPID_PUBLIC || !VAPID_PRIVATE) return { sent: 0, failed: 0 };

  // Get all active subscriptions for ALL target emails in one query
  const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({ activa: true });
  const targetSubs = allSubs.filter(s => uniqueEmails.includes(s.usuario_email));

  if (targetSubs.length === 0) return { sent: 0, failed: 0 };

  // Count existing unread notifications per user for badge count
  // Group subs by email to send correct badge per user
  const subsByEmail = {};
  for (const sub of targetSubs) {
    if (!subsByEmail[sub.usuario_email]) subsByEmail[sub.usuario_email] = [];
    subsByEmail[sub.usuario_email].push(sub);
  }

  let sent = 0, failed = 0;
  for (const [email, subs] of Object.entries(subsByEmail)) {
    // Count how many unread push notifications this user has (approximate via AppNotification)
    let badgeCount = 1;
    try {
      const unread = await base44.asServiceRole.entities.AppNotification.filter({
        usuario_email: email,
        vista: false
      });
      badgeCount = Math.max(1, (unread || []).length + 1);
    } catch {
      badgeCount = 1;
    }

    const payload = JSON.stringify({
      title,
      body,
      tag: tag || 'notification',
      badgeCount,
      renotify: true,
      requireInteraction: false,
      data: { url: url || '/', timestamp: new Date().toISOString() }
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh_key } },
          payload,
          { urgency: 'high', TTL: 86400 }
        );
        sent++;
      } catch (err) {
        failed++;
        if (err.statusCode === 410 || err.statusCode === 404) {
          try { await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false }); } catch {}
        }
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
    // 1. CHAT MESSAGES
    // ==========================================
    if (entityName === 'ChatMessage') {
      const grupoId = data.grupo_id || data.deporte || '';
      const senderName = data.remitente_nombre || 'Alguien';
      const msgPreview = (data.mensaje || '').substring(0, 80);
      
      if (!grupoId) return Response.json({ skipped: 'no grupo_id' });

      const normalizedCat = toGroupId(grupoId);

      // Fetch players and users in parallel for speed
      const [allPlayers, allUsers] = await Promise.all([
        base44.asServiceRole.entities.Player.filter({ activo: true }),
        base44.asServiceRole.entities.User.list('-created_date', 500)
      ]);

      const targetEmails = [];
      for (const p of allPlayers) {
        const playerCat = toGroupId(p.categoria_principal || p.deporte || '');
        if (playerCat !== normalizedCat) continue;
        if (p.email_padre) targetEmails.push(p.email_padre);
        if (p.email_tutor_2) targetEmails.push(p.email_tutor_2);
        if (p.email_jugador) targetEmails.push(p.email_jugador);
      }

      for (const u of allUsers) {
        if (u.es_entrenador && (u.categorias_entrena || []).some(c => toGroupId(c) === normalizedCat)) {
          targetEmails.push(u.email);
        }
        if (u.es_coordinador && (u.categorias_coordina || []).some(c => toGroupId(c) === normalizedCat)) {
          targetEmails.push(u.email);
        }
      }

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
    // 2. CONVOCATORIAS
    // ==========================================
    if (entityName === 'Convocatoria') {
      if (!data.publicada) return Response.json({ skipped: 'not published' });

      const jugadores = data.jugadores_convocados || [];
      const targetEmails = [];
      
      for (const j of jugadores) {
        if (j.email_padre) targetEmails.push(j.email_padre);
        if (j.email_jugador) targetEmails.push(j.email_jugador);
      }

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
    // 3. ANNOUNCEMENTS
    // ==========================================
    if (entityName === 'Announcement') {
      if (!data.publicado) return Response.json({ skipped: 'not published' });

      const titulo = data.titulo || 'Nuevo anuncio';
      const prioridad = data.prioridad || 'Normal';
      const destinatarios = data.destinatarios_tipo || 'Todos';

      const targetEmails = [];
      
      if (data.destinatarios_emails && data.destinatarios_emails.length > 0) {
        targetEmails.push(...data.destinatarios_emails);
      } else {
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
    // 4. PLAYER (federation signatures)
    // ==========================================
    if (entityName === 'Player') {
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