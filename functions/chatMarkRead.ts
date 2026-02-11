import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { chatType, chatId } = await req.json();
    const email = user.email;
    const now = new Date().toISOString();

    switch (chatType) {
      case 'team': {
        // chatId = grupo_id (e.g. "futbol_alevin")
        // Update user's chat_last_read object
        const chatLastRead = user.chat_last_read || {};
        chatLastRead[chatId] = now;
        await base44.asServiceRole.entities.User.update(user.id, { chat_last_read: chatLastRead });
        break;
      }

      case 'coordinatorForFamily': {
        // chatId = CoordinatorConversation id
        // Padre marca como leído
        await base44.asServiceRole.entities.CoordinatorConversation.update(chatId, {
          last_read_padre_at: now,
          no_leidos_padre: 0
        });
        break;
      }

      case 'coordinatorForStaff': {
        // chatId = CoordinatorConversation id
        // Coordinador marca como leído
        await base44.asServiceRole.entities.CoordinatorConversation.update(chatId, {
          last_read_coordinador_at: now,
          no_leidos_coordinador: 0
        });
        break;
      }

      case 'adminForAdmin': {
        // chatId = AdminConversation id
        await base44.asServiceRole.entities.AdminConversation.update(chatId, {
          last_read_admin_at: now,
          no_leidos_admin: 0
        });
        break;
      }

      case 'adminForFamily': {
        // chatId = AdminConversation id
        await base44.asServiceRole.entities.AdminConversation.update(chatId, {
          last_read_padre_at: now,
          no_leidos_padre: 0
        });
        break;
      }

      case 'staff': {
        // chatId = StaffConversation id
        const conv = await base44.asServiceRole.entities.StaffConversation.filter({ id: chatId });
        if (conv.length > 0) {
          const lastReadBy = (conv[0].last_read_by || []).filter(e => e.email !== email);
          lastReadBy.push({ email, fecha: now });
          await base44.asServiceRole.entities.StaffConversation.update(chatId, { last_read_by: lastReadBy });
        }
        break;
      }

      case 'system': {
        // chatId = PrivateConversation id (or "all" to mark all)
        if (chatId === 'all') {
          const convs = await base44.asServiceRole.entities.PrivateConversation.filter({
            participante_familia_email: email
          });
          for (const conv of convs) {
            await base44.asServiceRole.entities.PrivateConversation.update(conv.id, {
              last_read_familia_at: now,
              no_leidos_familia: 0
            });
          }
        } else {
          await base44.asServiceRole.entities.PrivateConversation.update(chatId, {
            last_read_familia_at: now,
            no_leidos_familia: 0
          });
        }
        break;
      }

      default:
        return Response.json({ error: 'Unknown chatType' }, { status: 400 });
    }

    return Response.json({ ok: true });
  } catch (error) {
    console.error('chatMarkRead error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});