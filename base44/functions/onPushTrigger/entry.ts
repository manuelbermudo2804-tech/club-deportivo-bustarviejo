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

  const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({ activa: true });
  const targetSubs = allSubs.filter(s => uniqueEmails.includes(s.usuario_email));
  if (targetSubs.length === 0) return { sent: 0, failed: 0 };

  const subsByEmail = {};
  for (const sub of targetSubs) {
    if (!subsByEmail[sub.usuario_email]) subsByEmail[sub.usuario_email] = [];
    subsByEmail[sub.usuario_email].push(sub);
  }

  let sent = 0, failed = 0;
  for (const [email, subs] of Object.entries(subsByEmail)) {
    let badgeCount = 1;
    try {
      const unread = await base44.asServiceRole.entities.AppNotification.filter({ usuario_email: email, vista: false });
      badgeCount = Math.max(1, (unread || []).length + 1);
    } catch { badgeCount = 1; }

    const payload = JSON.stringify({
      title, body, tag: tag || 'notification', badgeCount, renotify: true, requireInteraction: false,
      data: { url: url || '/', timestamp: new Date().toISOString() }
    });

    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh_key } },
          payload, { urgency: 'high', TTL: 86400 }
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

    if (!event || !data) return Response.json({ error: 'Missing event/data' }, { status: 400 });

    const entityName = event.entity_name;
    const senderEmail = data.created_by || data.remitente_email || data.autor_email || data.entrenador_email || '';

    // ==========================================
    // 1. CHAT MESSAGES (grupo)
    // ==========================================
    if (entityName === 'ChatMessage') {
      const grupoId = data.grupo_id || data.deporte || '';
      const senderName = data.remitente_nombre || 'Alguien';
      const msgPreview = (data.mensaje || '').substring(0, 80);
      if (!grupoId) return Response.json({ skipped: 'no grupo_id' });

      const normalizedCat = toGroupId(grupoId);
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
        if (u.es_entrenador && (u.categorias_entrena || []).some(c => toGroupId(c) === normalizedCat)) targetEmails.push(u.email);
        if (u.es_coordinador && (u.categorias_coordina || []).some(c => toGroupId(c) === normalizedCat)) targetEmails.push(u.email);
      }

      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      const result = await sendPushToEmails(base44, filtered, `💬 ${senderName}`, msgPreview || '📎 Archivo adjunto', '/FamilyChatsHub', `chat-${normalizedCat}-${event.entity_id}`);
      return Response.json({ type: 'chat', ...result });
    }

    // ==========================================
    // 2. CONVOCATORIAS
    // ==========================================
    if (entityName === 'Convocatoria') {
      // 2a. Cancelación o reprogramación
      const estado = data.estado_convocatoria;
      if (estado === 'cancelada' || estado === 'reprogramada') {
        const jugadores = data.jugadores_convocados || [];
        const targetEmails = [];
        for (const j of jugadores) {
          if (j.email_padre) targetEmails.push(j.email_padre);
          if (j.email_jugador) targetEmails.push(j.email_jugador);
        }
        // Also fetch tutor2 and minor emails from Player entity
        const allPlayersData = await base44.asServiceRole.entities.Player.filter({ activo: true });
        for (const j of jugadores) {
          if (!j.jugador_id) continue;
          const p = allPlayersData.find(pl => pl.id === j.jugador_id);
          if (p?.email_tutor_2) targetEmails.push(p.email_tutor_2);
          if (p?.acceso_menor_email && p?.acceso_menor_autorizado && !p?.acceso_menor_revocado) targetEmails.push(p.acceso_menor_email);
        }
        const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
        const titulo = data.titulo || 'Convocatoria';
        const rival = data.rival ? ` vs ${data.rival}` : '';
        if (estado === 'cancelada') {
          const result = await sendPushToEmails(base44, filtered, `🚫 CANCELADA: ${titulo}${rival}`, `Motivo: ${data.motivo_cambio || 'Ver app'}`, '/ParentCallups', `callup-cancel-${event.entity_id}`);
          return Response.json({ type: 'callup_cancel', ...result });
        } else {
          const nuevaFecha = data.fecha_partido || '';
          const nuevaHora = data.hora_partido || '';
          const result = await sendPushToEmails(base44, filtered, `🔄 REPROGRAMADA: ${titulo}${rival}`, `Nueva fecha: ${nuevaFecha}${nuevaHora ? ' a las ' + nuevaHora : ''} — Revisa tu disponibilidad`, '/ParentCallups', `callup-reschedule-${event.entity_id}`);
          return Response.json({ type: 'callup_reschedule', ...result });
        }
      }

      // 2b. Nueva publicación
      if (!data.publicada) return Response.json({ skipped: 'not published' });
      // NEVER send push for system-created callups — only human coaches can publish
      if (data.entrenador_email === 'sistema@cdbustarviejo.es') return Response.json({ skipped: 'system callup - never auto-notify' });
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
      const result = await sendPushToEmails(base44, filtered, `⚽ ${titulo}`, `${fecha}${hora ? ' a las ' + hora : ''} - Confirma asistencia`, '/ParentCallups', `callup-${event.entity_id}`);
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
          const matchCategory = destinatarios === 'Todos' || (p.categoria_principal || p.deporte) === destinatarios;
          if (!matchCategory) continue;
          if (p.email_padre) targetEmails.push(p.email_padre);
          if (p.email_tutor_2) targetEmails.push(p.email_tutor_2);
          if (p.email_jugador) targetEmails.push(p.email_jugador);
        }
      }
      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      const icon = prioridad === 'Urgente' ? '🚨' : prioridad === 'Importante' ? '📢' : '📋';
      const result = await sendPushToEmails(base44, filtered, `${icon} ${titulo}`, (data.contenido || '').substring(0, 100), '/Announcements', `announcement-${event.entity_id}`);
      return Response.json({ type: 'announcement', ...result });
    }

    // ==========================================
    // 4. PLAYER (federation signatures)
    // ==========================================
    if (entityName === 'Player') {
      const hasNewFirmaJugador = data.enlace_firma_jugador && !data.firma_jugador_completada;
      const hasNewFirmaTutor = data.enlace_firma_tutor && !data.firma_tutor_completada;
      if (!hasNewFirmaJugador && !hasNewFirmaTutor) return Response.json({ skipped: 'no pending signatures' });
      const targetEmails = [];
      if (data.email_padre) targetEmails.push(data.email_padre);
      if (data.email_tutor_2) targetEmails.push(data.email_tutor_2);
      if (data.email_jugador) targetEmails.push(data.email_jugador);
      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      const nombre = data.nombre || 'jugador';
      const result = await sendPushToEmails(base44, filtered, '✍️ Firma pendiente', `${nombre} tiene documentos de federación pendientes de firmar`, '/FederationSignatures', `signature-${event.entity_id}`);
      return Response.json({ type: 'signature', ...result });
    }

    // ==========================================
    // 5. PRIVATE MESSAGES (entrenador ↔ familia)
    // ==========================================
    if (entityName === 'PrivateMessage') {
      const convId = data.conversacion_id;
      if (!convId) return Response.json({ skipped: 'no conversacion_id' });
      try {
        const convs = await base44.asServiceRole.entities.PrivateConversation.filter({ id: convId });
        const conv = convs[0];
        if (!conv) return Response.json({ skipped: 'conversation not found' });
        const targetEmail = data.remitente_tipo === 'staff' ? conv.participante_familia_email : conv.participante_staff_email;
        if (!targetEmail || targetEmail === senderEmail) return Response.json({ skipped: 'no target' });
        const senderName = data.remitente_nombre || 'Alguien';
        const preview = (data.mensaje || '').substring(0, 80);
        const result = await sendPushToEmails(base44, [targetEmail], `💬 ${senderName}`, preview || '📎 Archivo adjunto', '/FamilyChatsHub', `private-${convId}-${event.entity_id}`);
        return Response.json({ type: 'private_message', ...result });
      } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    // ==========================================
    // 6. COORDINATOR MESSAGES
    // ==========================================
    if (entityName === 'CoordinatorMessage') {
      const convId = data.conversacion_id;
      if (!convId) return Response.json({ skipped: 'no conversacion_id' });
      try {
        const convs = await base44.asServiceRole.entities.CoordinatorConversation.filter({ id: convId });
        const conv = convs[0];
        if (!conv) return Response.json({ skipped: 'conversation not found' });
        // Si es del padre → notificar a coordinadores; si es del coordinador → notificar al padre
        const targetEmails = [];
        if (data.autor === 'padre') {
          // Notificar a todos los coordinadores
          const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
          for (const u of users) {
            if (u.es_coordinador) targetEmails.push(u.email);
          }
        } else {
          targetEmails.push(conv.padre_email);
        }
        const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
        const senderName = data.autor_nombre || 'Alguien';
        const preview = (data.mensaje || '').substring(0, 80);
        const result = await sendPushToEmails(base44, filtered, `📋 ${senderName}`, preview || '📎 Archivo', '/CoordinatorChatsHub', `coord-${convId}-${event.entity_id}`);
        return Response.json({ type: 'coordinator_message', ...result });
      } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    // ==========================================
    // 7. ADMIN MESSAGES
    // ==========================================
    if (entityName === 'AdminMessage') {
      if (data.es_nota_interna) return Response.json({ skipped: 'internal note' });
      const convId = data.conversacion_id;
      if (!convId) return Response.json({ skipped: 'no conversacion_id' });
      try {
        const convs = await base44.asServiceRole.entities.AdminConversation.filter({ id: convId });
        const conv = convs[0];
        if (!conv) return Response.json({ skipped: 'conversation not found' });
        const targetEmails = [];
        if (data.autor === 'padre') {
          const users = await base44.asServiceRole.entities.User.list('-created_date', 500);
          for (const u of users) { if (u.role === 'admin') targetEmails.push(u.email); }
        } else {
          targetEmails.push(conv.padre_email);
        }
        const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
        const senderName = data.autor_nombre || 'Alguien';
        const preview = (data.mensaje || '').substring(0, 80);
        const result = await sendPushToEmails(base44, filtered, `🔒 ${senderName}`, preview || '📎 Archivo', '/AdminChatsHub', `admin-${convId}-${event.entity_id}`);
        return Response.json({ type: 'admin_message', ...result });
      } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    // ==========================================
    // 8. STAFF MESSAGES
    // ==========================================
    if (entityName === 'StaffMessage') {
      const convId = data.conversacion_id;
      if (!convId) return Response.json({ skipped: 'no conversacion_id' });
      try {
        const convs = await base44.asServiceRole.entities.StaffConversation.filter({ id: convId });
        const conv = convs[0];
        if (!conv) return Response.json({ skipped: 'conversation not found' });
        const targetEmails = (conv.participantes || []).map(p => p.email).filter(e => e !== senderEmail);
        const senderName = data.autor_nombre || 'Alguien';
        const preview = (data.mensaje || '').substring(0, 80);
        const result = await sendPushToEmails(base44, targetEmails, `👥 Staff: ${senderName}`, preview || '📎 Archivo', '/StaffChat', `staff-${convId}-${event.entity_id}`);
        return Response.json({ type: 'staff_message', ...result });
      } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    // ==========================================
    // 9. PLAYER EVALUATIONS
    // ==========================================
    if (entityName === 'PlayerEvaluation') {
      if (!data.visible_para_padres) return Response.json({ skipped: 'not visible to parents' });
      const jugadorId = data.jugador_id;
      if (!jugadorId) return Response.json({ skipped: 'no jugador_id' });
      try {
        const players = await base44.asServiceRole.entities.Player.filter({ id: jugadorId });
        const player = players[0];
        if (!player) return Response.json({ skipped: 'player not found' });
        const targetEmails = [];
        if (player.email_padre) targetEmails.push(player.email_padre);
        if (player.email_tutor_2) targetEmails.push(player.email_tutor_2);
        if (player.email_jugador) targetEmails.push(player.email_jugador);
        if (player.acceso_menor_email && player.acceso_menor_autorizado && !player.acceso_menor_revocado) {
          targetEmails.push(player.acceso_menor_email);
        }
        const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
        const nombre = data.jugador_nombre || player.nombre;
        const result = await sendPushToEmails(base44, filtered, '⭐ Nueva evaluación', `${data.entrenador_nombre || 'Tu entrenador'} ha evaluado a ${nombre}`, '/PlayerEvaluations', `eval-${event.entity_id}`);
        return Response.json({ type: 'evaluation', ...result });
      } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    // ==========================================
    // 10. EVENTS (only important ones)
    // ==========================================
    if (entityName === 'Event') {
      if (!data.publicado) return Response.json({ skipped: 'not published' });
      if (!data.importante && data.tipo === 'Entrenamiento') return Response.json({ skipped: 'routine event' });
      const destinatarios = data.destinatario_categoria || 'Todos';
      const allPlayers = await base44.asServiceRole.entities.Player.filter({ activo: true });
      const targetEmails = [];
      for (const p of allPlayers) {
        const match = destinatarios === 'Todos' || (p.categoria_principal || p.deporte) === destinatarios;
        if (!match) continue;
        if (p.email_padre) targetEmails.push(p.email_padre);
        if (p.email_tutor_2) targetEmails.push(p.email_tutor_2);
        if (p.email_jugador) targetEmails.push(p.email_jugador);
      }
      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      const titulo = data.titulo || 'Nuevo evento';
      const fecha = data.fecha || '';
      const hora = data.hora || '';
      const icon = data.importante ? '🔴' : '📅';
      const result = await sendPushToEmails(base44, filtered, `${icon} ${titulo}`, `${fecha}${hora ? ' a las ' + hora : ''}${data.ubicacion ? ' — ' + data.ubicacion : ''}`, '/CalendarAndSchedules', `event-${event.entity_id}`);
      return Response.json({ type: 'event', ...result });
    }

    // ==========================================
    // 11. EXTRA CHARGES
    // ==========================================
    if (entityName === 'ExtraCharge') {
      if (data.estado !== 'activo') return Response.json({ skipped: 'not active' });
      const allPlayers = await base44.asServiceRole.entities.Player.filter({ activo: true });
      const targetEmails = [];
      // If asignado_a has specific player IDs, use those; otherwise all active players
      const assignedIds = data.asignado_a || [];
      for (const p of allPlayers) {
        if (assignedIds.length > 0 && !assignedIds.includes(p.id)) continue;
        if (p.email_padre) targetEmails.push(p.email_padre);
        if (p.email_tutor_2) targetEmails.push(p.email_tutor_2);
      }
      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      const titulo = data.titulo || 'Nuevo cobro extra';
      const result = await sendPushToEmails(base44, filtered, `💰 ${titulo}`, data.descripcion ? data.descripcion.substring(0, 100) : 'Tienes un nuevo cobro pendiente', '/', `extra-${event.entity_id}`);
      return Response.json({ type: 'extra_charge', ...result });
    }

    // ==========================================
    // 12. PUSH NOTIFICATION (manual admin)
    // ==========================================
    if (entityName === 'PushNotification') {
      if (data.enviada) return Response.json({ skipped: 'already sent' });
      const titulo = data.titulo || 'Notificación';
      const mensaje = data.mensaje || '';
      const tipoDestinatario = data.tipo_destinatario || 'todos';

      const [allPlayers, allUsers] = await Promise.all([
        base44.asServiceRole.entities.Player.filter({ activo: true }),
        base44.asServiceRole.entities.User.list('-created_date', 500)
      ]);

      const targetEmails = [];
      if (tipoDestinatario === 'todos' || tipoDestinatario === 'padres') {
        for (const p of allPlayers) {
          if (tipoDestinatario === 'todos' || tipoDestinatario === 'padres') {
            if (data.categoria_destino && (p.categoria_principal || p.deporte) !== data.categoria_destino) continue;
            if (p.email_padre) targetEmails.push(p.email_padre);
            if (p.email_tutor_2) targetEmails.push(p.email_tutor_2);
          }
        }
      }
      if (tipoDestinatario === 'todos' || tipoDestinatario === 'entrenadores') {
        for (const u of allUsers) {
          if (u.es_entrenador) targetEmails.push(u.email);
        }
      }
      if (tipoDestinatario === 'todos' || tipoDestinatario === 'administradores') {
        for (const u of allUsers) {
          if (u.role === 'admin') targetEmails.push(u.email);
        }
      }
      if (tipoDestinatario === 'categoria' && data.categoria_destino) {
        for (const p of allPlayers) {
          if ((p.categoria_principal || p.deporte) !== data.categoria_destino) continue;
          if (p.email_padre) targetEmails.push(p.email_padre);
          if (p.email_tutor_2) targetEmails.push(p.email_tutor_2);
          if (p.email_jugador) targetEmails.push(p.email_jugador);
        }
      }

      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      const icon = data.icono || '📢';
      const result = await sendPushToEmails(base44, filtered, `${icon} ${titulo}`, mensaje.substring(0, 100), data.enlace_destino || '/', `manual-push-${event.entity_id}`);

      // Mark as sent
      try {
        await base44.asServiceRole.entities.PushNotification.update(event.entity_id, {
          enviada: true, fecha_envio: new Date().toISOString(), destinatarios_count: filtered.length
        });
      } catch {}

      return Response.json({ type: 'manual_push', ...result });
    }

    // ==========================================
    // 13. JUNIOR MAILBOX (respuesta al menor)
    // ==========================================
    if (entityName === 'JuniorMailbox') {
      // Only notify when admin responds (update with respuesta_admin)
      if (!data.respuesta_admin || !data.jugador_email) return Response.json({ skipped: 'no response or no email' });
      const result = await sendPushToEmails(base44, [data.jugador_email], '📬 ¡Te han respondido!', `${data.respondido_por_nombre || 'El club'} ha respondido a tu mensaje`, '/JuniorMailbox', `junior-reply-${event.entity_id}`);
      return Response.json({ type: 'junior_mailbox_reply', ...result });
    }

    // ==========================================
    // 14. SURVEYS (nueva encuesta)
    // ==========================================
    if (entityName === 'Survey') {
      if (!data.activa) return Response.json({ skipped: 'not active' });
      const destinatarios = data.destinatarios || 'Todos';
      const allPlayers = await base44.asServiceRole.entities.Player.filter({ activo: true });
      const targetEmails = [];
      for (const p of allPlayers) {
        const match = destinatarios === 'Todos' || (p.categoria_principal || p.deporte) === destinatarios;
        if (!match) continue;
        if (p.email_padre) targetEmails.push(p.email_padre);
        if (p.email_tutor_2) targetEmails.push(p.email_tutor_2);
      }
      const filtered = [...new Set(targetEmails)].filter(e => e !== senderEmail);
      const result = await sendPushToEmails(base44, filtered, `📊 ${data.titulo || 'Nueva encuesta'}`, data.descripcion ? data.descripcion.substring(0, 100) : 'Hay una nueva encuesta disponible', '/Surveys', `survey-${event.entity_id}`);
      return Response.json({ type: 'survey', ...result });
    }

    // ==========================================
    // 15. CLOTHING ORDER — ELIMINADO (tienda externa, ya no aplica)
    // ==========================================

    // ==========================================
    // 16. MARKET RESERVATION (alguien reserva tu artículo)
    // ==========================================
    if (entityName === 'MarketReservation') {
      const listingId = data.listing_id;
      if (!listingId) return Response.json({ skipped: 'no listing_id' });
      try {
        const listings = await base44.asServiceRole.entities.MarketListing.filter({ id: listingId });
        const listing = listings[0];
        if (!listing || !listing.vendedor_email) return Response.json({ skipped: 'listing not found' });
        const compradorNombre = data.comprador_nombre || 'Alguien';
        const result = await sendPushToEmails(base44, [listing.vendedor_email], '🛒 ¡Reserva en Mercadillo!', `${compradorNombre} quiere tu artículo "${listing.titulo}"`, '/Mercadillo', `market-res-${event.entity_id}`);
        return Response.json({ type: 'market_reservation', ...result });
      } catch (e) { return Response.json({ error: e.message }, { status: 500 }); }
    }

    // (Section 17 removed — cancel/reschedule handled in section 2)

    return Response.json({ skipped: 'unhandled entity', entityName });
  } catch (error) {
    console.error('onPushTrigger error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});