import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const referrerEmail = (body.referrerEmail || '').toLowerCase().trim();
    let temporada = body.temporada || null;
    if (!referrerEmail) return Response.json({ error: 'Missing referrerEmail' }, { status: 400 });

    if (!temporada) {
      const configs = await base44.entities.SeasonConfig.list();
      const active = configs.find(c => c.activa === true);
      if (!active) return Response.json({ error: 'No active season found' }, { status: 400 });
      temporada = active.temporada;
    }

    const refUsers = await base44.entities.User.filter({ email: referrerEmail });
    const refUser = refUsers[0] || null;
    if (!refUser) return Response.json({ error: 'Referrer user not found' }, { status: 404 });

    const members = await base44.entities.ClubMember.filter({ temporada, referido_por_email: referrerEmail });
    let createdHistory = 0;

    const historyForSeason = await base44.entities.ReferralHistory.filter({ temporada });
    const used = new Set(historyForSeason.map(x => x.numero_papeleta).filter(Boolean));

    for (const member of members) {
      const existing = historyForSeason.find(h => h.referido_id === member.id);
      if (existing) continue;

      let ticket = '';
      for (let i = 0; i < 50; i++) {
        const candidate = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        if (!used.has(candidate)) { ticket = candidate; break; }
      }
      if (!ticket) ticket = String(Math.floor(Math.random() * 100000)).padStart(5, '0');
      used.add(ticket);

      await base44.entities.ReferralHistory.create({
        temporada,
        referidor_email: referrerEmail,
        referidor_nombre: refUser.full_name || referrerEmail,
        referido_email: member.email || '',
        referido_nombre: member.nombre_completo || '',
        referido_id: member.id,
        estado: member.activo === false ? 'baja' : 'activo',
        credito_otorgado: 0,
        sorteos_otorgados: 1,
        numero_papeleta: ticket,
        fecha_referido: new Date().toISOString()
      });
      createdHistory++;
    }

    return Response.json({ success: true, temporada, referrerEmail, processed_members: members.length, created_history: createdHistory });
  } catch (error) {
    console.error('[backfillReferrals] Error:', error);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});
