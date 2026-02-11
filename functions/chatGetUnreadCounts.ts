import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

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
      total: 0
    };

    // Helper: normalize group_id
    const toGroupId = (s) => (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\(.*?\)/g, '').trim().replace(/\s+/g, '_');

    // ===== 1. TEAM CHATS (ChatMessage - grupal entrenador/padres) =====
    // Relevant for: padres (por categoría de sus hijos), entrenadores (por categorías que entrenan)
    const chatLastRead = user.chat_last_read || {};

    if (isCoach || isCoordinator) {
      // Entrenador/Coordinador: contar mensajes de padres no leídos en sus categorías
      const cats = isCoach ? (user.categorias_entrena || []) : (user.categorias_coordina || []);
      if (cats.length > 0) {
        const allChatMessages = await base44.asServiceRole.entities.ChatMessage.filter(
          { tipo: 'padre_a_grupo' }, '-created_date', 500
        );
        for (const cat of cats) {
          const gid = toGroupId(cat);
          const lastRead = chatLastRead[gid] || '1970-01-01T00:00:00.000Z';
          const unread = allChatMessages.filter(m =>
            m.grupo_id === gid &&
            m.remitente_email !== email &&
            m.created_date > lastRead
          ).length;
          if (unread > 0) result.team_chats[cat] = unread;
        }
      }
    } else if (!isAdmin && !isTreasurer) {
      // Padre/Jugador: contar mensajes del entrenador no leídos en categorías de sus hijos
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
            m.grupo_id === gid &&
            m.remitente_email !== email &&
            m.created_date > lastRead
          ).length;
          if (unread > 0) result.team_chats[cat] = unread;
        }
      }
    }

    // ===== 2. COORDINATOR CHAT (CoordinatorConversation) =====
    if (isCoordinator || isAdmin) {
      // Coordinador ve mensajes de padres sin leer
      const convs = await base44.asServiceRole.entities.CoordinatorConversation.filter({ archivada: false });
      for (const conv of convs) {
        const lastRead = conv.last_read_coordinador_at || '1970-01-01T00:00:00.000Z';
        const msgs = await base44.asServiceRole.entities.CoordinatorMessage.filter({
          conversacion_id: conv.id, autor: 'padre'
        }, '-created_date', 50);
        const unread = msgs.filter(m => m.created_date > lastRead).length;
        result.coordinator += unread;
      }
    } else if (!isStaff) {
      // Padre ve mensajes del coordinador sin leer
      const convs = await base44.asServiceRole.entities.CoordinatorConversation.filter({ padre_email: email });
      for (const conv of convs) {
        const lastRead = conv.last_read_padre_at || '1970-01-01T00:00:00.000Z';
        const msgs = await base44.asServiceRole.entities.CoordinatorMessage.filter({
          conversacion_id: conv.id, autor: 'coordinador'
        }, '-created_date', 50);
        const unread = msgs.filter(m => m.created_date > lastRead).length;
        result.coordinator += unread;
      }
    }

    // ===== 3. ADMIN CHAT (AdminConversation) =====
    if (isAdmin) {
      const adminConvs = await base44.asServiceRole.entities.AdminConversation.filter({ resuelta: false });
      for (const conv of adminConvs) {
        const lastRead = conv.last_read_admin_at || '1970-01-01T00:00:00.000Z';
        const msgs = await base44.asServiceRole.entities.AdminMessage.filter({
          conversacion_id: conv.id, autor: 'padre'
        }, '-created_date', 50);
        const unread = msgs.filter(m => m.created_date > lastRead).length;
        result.admin += unread;
      }
    }

    // ===== 4. STAFF CHAT (StaffConversation) =====
    if (isStaff) {
      const staffConvs = await base44.asServiceRole.entities.StaffConversation.filter({ categoria: 'General' });
      const staffConv = staffConvs[0];
      if (staffConv) {
        const lastReadArr = staffConv.last_read_by || [];
        const myEntry = lastReadArr.find(e => e.email === email);
        const lastRead = myEntry?.fecha || '1970-01-01T00:00:00.000Z';
        const msgs = await base44.asServiceRole.entities.StaffMessage.filter({
          conversacion_id: staffConv.id
        }, '-created_date', 100);
        result.staff = msgs.filter(m => m.autor_email !== email && m.created_date > lastRead).length;
      }
    }

    // ===== 5. SYSTEM MESSAGES (PrivateConversation/PrivateMessage) =====
    if (!isAdmin) {
      const sysConvs = await base44.asServiceRole.entities.PrivateConversation.filter({
        participante_familia_email: email
      });
      for (const conv of sysConvs) {
        const lastRead = conv.last_read_familia_at || '1970-01-01T00:00:00.000Z';
        const msgs = await base44.asServiceRole.entities.PrivateMessage.filter({
          conversacion_id: conv.id, remitente_tipo: 'staff'
        }, '-created_date', 50);
        result.system += msgs.filter(m => m.created_date > lastRead).length;
      }
    }

    // Total
    const teamTotal = Object.values(result.team_chats).reduce((s, v) => s + v, 0);
    result.total = teamTotal + result.coordinator + result.admin + result.staff + result.system;

    return Response.json(result);
  } catch (error) {
    console.error('chatGetUnreadCounts error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});