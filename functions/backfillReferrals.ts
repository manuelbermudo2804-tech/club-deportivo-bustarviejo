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

    if (!referrerEmail) {
      return Response.json({ error: 'Missing referrerEmail' }, { status: 400 });
    }

    // Obtener temporada activa si no viene
    if (!temporada) {
      const configs = await base44.entities.SeasonConfig.list();
      const active = configs.find((c) => c.activa === true);
      if (!active) return Response.json({ error: 'No active season found' }, { status: 400 });
      temporada = active.temporada;
    }

    // Buscar referrer user
    const refUsers = await base44.entities.User.filter({ email: referrerEmail });
    const refUser = refUsers[0] || null;
    if (!refUser) {
      return Response.json({ error: `Referrer user not found: ${referrerEmail}` }, { status: 404 });
    }

    // Buscar socios de la temporada con ese referidor
    const members = await base44.entities.ClubMember.filter({ temporada, referido_por_email: referrerEmail });

    let createdRewards = 0;
    let createdHistory = 0;

    // Premio base por referido
    const configs = await base44.entities.SeasonConfig.filter({ temporada });
    const seasonCfg = configs[0] || {};
    const premioBase = Number(seasonCfg.referidos_premio_1 || 5);

    for (const m of members) {
      // Evitar duplicados en ReferralReward
      const existingRewards = await base44.entities.ReferralReward.filter({ referrer_email: referrerEmail, referred_member_id: m.id });
      if (!existingRewards || existingRewards.length === 0) {
        await base44.entities.ReferralReward.create({
          referrer_email: referrerEmail,
          referrer_name: refUser.full_name || referrerEmail,
          referred_member_id: m.id,
          referred_member_name: m.nombre_completo || m.email || 'Socio',
          temporada,
          clothing_credit_earned: premioBase
        });
        createdRewards += 1;
      }

      // Evitar duplicados en ReferralHistory (por referido_id en esa temporada)
      const existingHist = await base44.entities.ReferralHistory.filter({ referido_id: m.id, temporada });
      if (!existingHist || existingHist.length === 0) {
        await base44.entities.ReferralHistory.create({
          temporada,
          referidor_email: referrerEmail,
          referidor_nombre: refUser.full_name || '',
          referido_email: m.email || '',
          referido_nombre: m.nombre_completo || '',
          referido_id: m.id,
          estado: m.activo === false ? 'baja' : 'activo',
          credito_otorgado: premioBase,
          sorteos_otorgados: 0,
          fecha_referido: new Date().toISOString()
        });
        createdHistory += 1;
      }
    }

    // Actualizar contadores básicos del usuario (incremental, sin recalcular tiers)
    if (createdRewards > 0) {
      const newCount = (refUser.referrals_count || 0) + createdRewards;
      const newCredit = (refUser.clothing_credit_balance || 0) + (createdRewards * premioBase);
      await base44.asServiceRole.entities.User.update(refUser.id, {
        referrals_count: newCount,
        clothing_credit_balance: newCredit
      });
    }

    return Response.json({
      success: true,
      temporada,
      referrerEmail,
      processed_members: members.length,
      created_rewards: createdRewards,
      created_history: createdHistory
    });
  } catch (error) {
    console.error('[backfillReferrals] Error:', error);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});