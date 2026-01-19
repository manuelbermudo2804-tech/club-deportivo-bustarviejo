import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const CHAT_MAP = {
  staff: { conv: 'StaffConversation', msg: 'StaffMessage' },
  coach: { conv: 'CoachConversation', msg: 'CoachMessage' },
  coordinator: { conv: 'CoordinatorConversation', msg: 'CoordinatorMessage' },
  family: { conv: 'CoordinatorConversation', msg: 'CoordinatorMessage' }, // si Family usa las mismas, ajusta aquí
  private: { conv: 'PrivateConversation', msg: 'PrivateMessage' },
  admin: { conv: 'AdminConversation', msg: 'AdminMessage' }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { chatType = 'staff', mode = 'now', lookbackDays = 7 } = await req.json().catch(() => ({}));
    const cfg = CHAT_MAP[chatType];
    if (!cfg) return Response.json({ error: 'Invalid chatType' }, { status: 400 });

    const users = await base44.entities.User.list();

    for (const u of users) {
      let [counter] = await base44.entities.ChatCounter.filter({ user_email: u.email, chat_type: chatType });
      if (!counter) {
        counter = await base44.entities.ChatCounter.create({ user_email: u.email, chat_type: chatType, total_unread: 0, per_conversation: [] });
      }
      if (mode === 'now') continue; // dejar todo a 0

      const per = [];
      let total = 0;

      const convs = await base44.entities[cfg.conv].list();
      for (const c of convs) {
        const isParticipant = (c.participantes || []).some(p => p.email === u.email);
        if (!isParticipant) continue;
        const since = new Date();
        since.setDate(since.getDate() - (mode === 'days' ? lookbackDays : 7));
        const msgs = await base44.entities[cfg.msg].filter({ conversation_id: c.id, created_date: { $gte: since.toISOString() } });
        const unread = msgs.filter(m => m.autor_email !== u.email).length;
        if (unread > 0) {
          per.push({ conversation_id: c.id, unread });
          total += unread;
        }
      }

      await base44.entities.ChatCounter.update(counter.id, { total_unread: total, per_conversation: per });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('chatBackfillCounters error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});