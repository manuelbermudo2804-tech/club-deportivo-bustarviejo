import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { chatType, conversationId } = await req.json();
    if (!chatType || !conversationId) {
      return Response.json({ error: 'chatType and conversationId are required' }, { status: 400 });
    }

    // Obtener o crear contador del tipo
    let [counter] = await base44.entities.ChatCounter.filter({ user_email: user.email, chat_type: chatType });
    if (!counter) {
      counter = await base44.entities.ChatCounter.create({ user_email: user.email, chat_type: chatType, total_unread: 0, per_conversation: [] });
    }

    const per = counter.per_conversation || [];
    const idx = per.findIndex((p) => p.conversation_id === conversationId);
    const unread = idx >= 0 ? Number(per[idx].unread || 0) : 0;

    if (idx >= 0) {
      per[idx].unread = 0;
    } else {
      per.push({ conversation_id: conversationId, unread: 0 });
    }

    const nextTotal = Math.max(0, Number(counter.total_unread || 0) - unread);

    await base44.entities.ChatCounter.update(counter.id, {
      total_unread: nextTotal,
      per_conversation: per
    });

    return Response.json({ success: true, total_unread: nextTotal });
  } catch (error) {
    console.error('chatMarkRead error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});