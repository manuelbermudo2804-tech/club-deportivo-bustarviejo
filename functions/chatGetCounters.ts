import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const counters = await base44.entities.ChatCounter.filter({ user_email: user.email });

    // Normalizar salida agrupando por chat_type
    const result = counters.reduce((acc, c) => {
      const byConv = (c.per_conversation || []).map((i) => ({ id: i.conversation_id, unread: i.unread }));
      acc[c.chat_type] = { total: Number(c.total_unread || 0), byConversation: byConv };
      return acc;
    }, { staff: { total: 0, byConversation: [] }, coach: { total: 0, byConversation: [] }, coordinator: { total: 0, byConversation: [] }, family: { total: 0, byConversation: [] }, private: { total: 0, byConversation: [] }, admin: { total: 0, byConversation: [] } });

    return Response.json(result);
  } catch (error) {
    console.error('chatGetCounters error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});