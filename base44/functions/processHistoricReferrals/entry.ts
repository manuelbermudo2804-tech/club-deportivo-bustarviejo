import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const configs = await base44.asServiceRole.entities.SeasonConfig.list();
    const activeConfig = configs.find(c => c.activa === true);

    if (!activeConfig?.programa_referidos_activo) {
      return Response.json({ message: 'Programa no activo', processed: 0 }, { status: 200 });
    }

    const payload = await req.json().catch(() => ({}));
    const targetId = payload.event?.entity_id || payload.entity_id;
    const allMembers = targetId
      ? [await base44.asServiceRole.entities.ClubMember.get(targetId)].filter(Boolean)
      : await base44.asServiceRole.entities.ClubMember.list();

    const pending = allMembers.filter(m =>
      (m.referido_por_email || m.referido_por) &&
      m.referido_procesado !== true &&
      m.estado_pago === 'Pagado' &&
      m.temporada === activeConfig.temporada
    );

    let processed = 0;
    for (const member of pending) {
      let referrerEmail = member.referido_por_email;
      let referrerName = member.referido_por || '';

      if (!referrerEmail && referrerName) {
        const users = await base44.asServiceRole.entities.User.list();
        const match = users.find(u =>
          u.full_name?.toLowerCase().trim() === referrerName.toLowerCase().trim() ||
          u.email?.toLowerCase().trim() === referrerName.toLowerCase().trim()
        );
        if (match) {
          referrerEmail = match.email;
          referrerName = match.full_name || referrerName;
        }
      }

      if (!referrerEmail) continue;

      // ReferralHistory es la fuente de verdad. No duplicar una papeleta ya creada.
      const existing = await base44.asServiceRole.entities.ReferralHistory.filter({
        referido_id: member.id,
        temporada: member.temporada
      });

      if (!existing || existing.length === 0) {
        const historyForSeason = await base44.asServiceRole.entities.ReferralHistory.filter({
          temporada: member.temporada
        });
        const used = new Set(historyForSeason.map(x => x.numero_papeleta).filter(Boolean));
        let ticket = '';
        for (let i = 0; i < 50; i++) {
          const candidate = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
          if (!used.has(candidate)) { ticket = candidate; break; }
        }
        if (!ticket) ticket = String(Math.floor(Math.random() * 100000)).padStart(5, '0');

        await base44.asServiceRole.entities.ReferralHistory.create({
          temporada: member.temporada,
          referidor_email: referrerEmail,
          referidor_nombre: referrerName || referrerEmail,
          referido_email: member.email || '',
          referido_nombre: member.nombre_completo || '',
          referido_id: member.id,
          estado: 'activo',
          credito_otorgado: 0,
          sorteos_otorgados: 1,
          numero_papeleta: ticket,
          fecha_referido: new Date().toISOString()
        });
      }

      await base44.asServiceRole.entities.ClubMember.update(member.id, {
        referido_procesado: true,
        referido_por: referrerName,
        referido_por_email: referrerEmail
      });
      processed++;
    }

    return Response.json({ message: `Procesados ${processed}/${pending.length} referidos`, processed, total: pending.length });
  } catch (error) {
    console.error('Error en processHistoricReferrals:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
