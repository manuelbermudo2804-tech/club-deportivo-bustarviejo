import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = user.email;
    const role = user.role;
    const isAdmin = role === 'admin';
    const isCoach = user.es_entrenador === true;
    const isCoordinator = user.es_coordinador === true;
    const isTreasurer = user.es_tesorero === true;
    const isStaff = isAdmin || isCoach || isCoordinator || isTreasurer;

    const result = {
      team_chats: {},
      coordinator: 0,
      admin: 0,
      staff: 0,
      system: 0,
    };

    // Normalize group IDs: remove parenthesized suffixes, accents, collapse whitespace
    const toGroupId = (s) => (s || '').toString().replace(/\(.*?\)/g, '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '_').toLowerCase();
    // Also normalize the raw grupo_id stored on messages (may contain accents/parentheses and underscores)
    const normalizeGid = (s) => (s || '').toString().replace(/\(.*?\)/g, '').replace(/_/g, ' ').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().replace(/\s+/g, '_').toLowerCase();

    const chatLastRead = user.chat_last_read || {};

    // Run independent sections in parallel to minimize total time and reduce sequential rate-limit risk
    const promises = [];

    // ===== 1. TEAM CHATS =====
    if (isCoach || isCoordinator) {
      const coachCats = user.categorias_entrena || [];
      const coordCats = user.categorias_coordina || [];
      const cats = [...new Set([...coachCats, ...coordCats])];
      if (cats.length > 0) {
        promises.push((async () => {
          try {
            const allChatMessages = await base44.asServiceRole.entities.ChatMessage.filter(
              { tipo: { $in: ['padre_a_grupo', 'entrenador_a_grupo'] } }, '-created_date', 500
            );
            for (const cat of cats) {
              const gid = toGroupId(cat);
              const lastRead = chatLastRead[gid] || '1970-01-01T00:00:00.000Z';
              const unread = allChatMessages.filter(m =>
                normalizeGid(m.grupo_id || m.deporte) === gid &&
                m.remitente_email !== email &&
                m.created_date > lastRead
              ).length;
              if (unread > 0) result.team_chats[gid] = unread;
            }
          } catch (e) { console.error('Error team chats (staff):', e.message); }
        })());
      }
    } else if (!isAdmin) {
      promises.push((async () => {
        try {
          const myPlayers = await base44.asServiceRole.entities.Player.filter({
            $or: [{ email_padre: email }, { email_tutor_2: email }, { email_jugador: email }],
            activo: true
          });
          const myCats = [...new Set(myPlayers.map(p => p.categoria_principal || p.deporte).filter(Boolean))];
          if (myCats.length > 0) {
            const allChatMessages = await base44.asServiceRole.entities.ChatMessage.filter(
              { tipo: { $in: ['entrenador_a_grupo', 'padre_a_grupo'] } }, '-created_date', 500
            );
            for (const cat of myCats) {
              const gid = toGroupId(cat);
              const lastRead = chatLastRead[gid] || '1970-01-01T00:00:00.000Z';
              const unread = allChatMessages.filter(m =>
                normalizeGid(m.grupo_id || m.deporte) === gid &&
                m.remitente_email !== email &&
                m.created_date > lastRead
              ).length;
              if (unread > 0) result.team_chats[gid] = unread;
            }
          }
        } catch (e) { console.error('Error team chats (family):', e.message); }
      })());
    }

    // ===== 2. COORDINATOR CHAT — single bulk query instead of N queries per conversation =====
    if (isCoordinator || isAdmin) {
      promises.push((async () => {
        try {
          const convs = await base44.asServiceRole.entities.CoordinatorConversation.filter({ archivada: false });
          if (convs.length > 0) {
            // Single bulk fetch of all coordinator messages (from parents)
            const allMsgs = await base44.asServiceRole.entities.CoordinatorMessage.filter(
              { autor: 'padre' }, '-created_date', 1000
            );
            const msgsByConv = {};
            for (const m of allMsgs) {
              if (!msgsByConv[m.conversacion_id]) msgsByConv[m.conversacion_id] = [];
              msgsByConv[m.conversacion_id].push(m);
            }
            for (const conv of convs) {
              const lastRead = conv.last_read_coordinador_at || '1970-01-01T00:00:00.000Z';
              const msgs = msgsByConv[conv.id] || [];
              result.coordinator += msgs.filter(m => m.created_date > lastRead).length;
            }
          }
        } catch (e) { console.error('Error coordinator:', e.message); }
      })());
    } else if (!isStaff || isTreasurer) {
      promises.push((async () => {
        try {
          const convs = await base44.asServiceRole.entities.CoordinatorConversation.filter({ padre_email: email });
          if (convs.length > 0) {
            const allMsgs = await base44.asServiceRole.entities.CoordinatorMessage.filter(
              { autor: 'coordinador' }, '-created_date', 500
            );
            const msgsByConv = {};
            for (const m of allMsgs) {
              if (!msgsByConv[m.conversacion_id]) msgsByConv[m.conversacion_id] = [];
              msgsByConv[m.conversacion_id].push(m);
            }
            for (const conv of convs) {
              const lastRead = conv.last_read_padre_at || '1970-01-01T00:00:00.000Z';
              const msgs = msgsByConv[conv.id] || [];
              result.coordinator += msgs.filter(m => m.created_date > lastRead).length;
            }
          }
        } catch (e) { console.error('Error coordinator (family):', e.message); }
      })());
    }

    // ===== 3. STAFF CHAT (only for coaches, coordinators and admins — NOT treasurers) =====
    if (isAdmin || isCoach || isCoordinator) {
      promises.push((async () => {
        try {
          const staffConvs = await base44.asServiceRole.entities.StaffConversation.filter({ categoria: 'General' });
          const staffConv = staffConvs[0];
          if (staffConv) {
            const lastReadArr = staffConv.last_read_by || [];
            const myEntry = lastReadArr.find(e => e.email === email);
            // If user has never read staff chat, don't show all historic messages as unread.
            // Only count messages from the last 24h as unread for first-time readers.
            let lastRead;
            if (myEntry?.fecha) {
              lastRead = myEntry.fecha;
            } else {
              // First time: only show messages from last 24 hours
              const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
              lastRead = oneDayAgo;
            }
            const msgs = await base44.asServiceRole.entities.StaffMessage.filter(
              { conversacion_id: staffConv.id }, '-created_date', 200
            );
            result.staff = msgs.filter(m => m.autor_email !== email && m.created_date > lastRead).length;
          }
        } catch (e) { console.error('Error staff:', e.message); }
      })());
    }

    // ===== 4. SYSTEM MESSAGES — single bulk query =====
    if (!isAdmin) {
      promises.push((async () => {
        try {
          const sysConvs = await base44.asServiceRole.entities.PrivateConversation.filter({
            participante_familia_email: email
          });
          if (sysConvs.length > 0) {
            const allMsgs = await base44.asServiceRole.entities.PrivateMessage.filter(
              { remitente_tipo: 'staff' }, '-created_date', 500
            );
            const msgsByConv = {};
            for (const m of allMsgs) {
              if (!msgsByConv[m.conversacion_id]) msgsByConv[m.conversacion_id] = [];
              msgsByConv[m.conversacion_id].push(m);
            }
            for (const conv of sysConvs) {
              const lastRead = conv.last_read_familia_at || '1970-01-01T00:00:00.000Z';
              const msgs = msgsByConv[conv.id] || [];
              result.system += msgs.filter(m => m.created_date > lastRead).length;
            }
          }
        } catch (e) { console.error('Error system:', e.message); }
      })());
    }

    // Wait for all parallel sections
    await Promise.all(promises);

    return Response.json(result);
  } catch (error) {
    console.error('chatGetUnreadCounts error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});