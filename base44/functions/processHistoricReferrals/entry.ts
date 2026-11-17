import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Backfill histórico protegido.
 * Solo administradores pueden ejecutarlo y únicamente genera una papeleta
 * cuando tanto el referido como el referidor tienen cuota pagada en temporada activa.
 * No procesa renovaciones ni altas sin una ficha ClubMember verificable.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    if (configs.length !== 1) {
      return Response.json({ error: 'Debe existir exactamente una temporada activa' }, { status: 409 });
    }
    const config = configs[0];
    if (config.programa_referidos_activo !== true) {
      return Response.json({ message: 'Programa no activo', processed: 0 }, { status: 200 });
    }

    const payload = await req.json().catch(() => ({}));
    const targetId = payload.event?.entity_id || payload.entity_id || payload.member_id;
    const members = targetId
      ? [await base44.asServiceRole.entities.ClubMember.get(targetId)].filter(Boolean)
      : await base44.asServiceRole.entities.ClubMember.filter({ temporada: config.temporada, estado_pago: 'Pagado' });

    let processed = 0;
    const skipped = [];
    for (const member of members) {
      if (member.temporada !== config.temporada || member.estado_pago !== 'Pagado') continue;
      const refEmail = String(member.referido_por_email || '').trim().toLowerCase();
      if (!refEmail || refEmail === String(member.email || '').trim().toLowerCase()) {
        skipped.push({ member_id: member.id, reason: 'Sin atribución válida o autorreferido' });
        continue;
      }

      const refMemberships = await base44.asServiceRole.entities.ClubMember.filter({
        email: refEmail, temporada: config.temporada, estado_pago: 'Pagado'
      });
      if (!refMemberships.length) {
        skipped.push({ member_id: member.id, reason: 'El referidor no es socio pagado en la temporada activa' });
        continue;
      }

      const existing = await base44.asServiceRole.entities.ReferralHistory.filter({
        referido_id: member.id, temporada: config.temporada
      });
      if (existing.length) {
        if (member.referido_procesado !== true) {
          await base44.asServiceRole.entities.ClubMember.update(member.id, { referido_procesado: true });
        }
        continue;
      }

      const referrer = refMemberships[0];
      const historyForSeason = await base44.asServiceRole.entities.ReferralHistory.filter({ temporada: config.temporada });
      const used = new Set(historyForSeason.map(x => x.numero_papeleta).filter(Boolean));
      let ticket = '';
      for (let i = 0; i < 100; i++) {
        const candidate = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
        if (!used.has(candidate)) { ticket = candidate; break; }
      }
      if (!ticket) {
        skipped.push({ member_id: member.id, reason: 'No se pudo reservar un número de papeleta libre' });
        continue;
      }

      await base44.asServiceRole.entities.ReferralHistory.create({
        temporada: config.temporada,
        referidor_email: refEmail,
        referidor_nombre: referrer.nombre_completo || member.referido_por || refEmail,
        referido_email: String(member.email || '').trim().toLowerCase(),
        referido_nombre: member.nombre_completo || '',
        referido_id: member.id,
        estado: 'activo',
        credito_otorgado: 0,
        sorteos_otorgados: 1,
        numero_papeleta: ticket,
        fecha_referido: new Date().toISOString()
      });
      await base44.asServiceRole.entities.ClubMember.update(member.id, { referido_procesado: true });
      processed++;
    }

    return Response.json({ success: true, temporada: config.temporada, processed, skipped });
  } catch (error) {
    console.error('[processHistoricReferrals] Error:', error);
    return Response.json({ error: error?.message || 'Internal error' }, { status: 500 });
  }
});