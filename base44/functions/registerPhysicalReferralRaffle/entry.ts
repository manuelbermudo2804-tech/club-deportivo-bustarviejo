import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  let lockConfigId = '';
  let lockToken = '';
  try {
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const prizeName = String(body.prize_name || '').trim();
    const winningTicket = String(body.winning_ticket || '').trim();
    if (!prizeName || !winningTicket) {
      return Response.json({ error: 'Falta el premio o el número de papeleta' }, { status: 400 });
    }

    const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    if (configs.length !== 1) {
      return Response.json({ error: 'Debe existir exactamente una temporada activa' }, { status: 409 });
    }
    const config = configs[0];

    // Compare-and-set en una sola operación para impedir dos registros simultáneos.
    lockConfigId = config.id;
    lockToken = `raffle:${crypto.randomUUID()}`;
    const claim = await base44.asServiceRole.entities.SeasonConfig.updateMany(
      { id: lockConfigId, $or: [{ raffle_draw_lock: '' }, { raffle_draw_lock: { $exists: false } }] },
      { $set: { raffle_draw_lock: lockToken } }
    );
    if (claim.updated !== 1) {
      lockConfigId = '';
      return Response.json({ error: 'Ya hay una operación de sorteo en curso. Espera unos segundos y vuelve a intentarlo.', code: 'RAFFLE_LOCKED' }, { status: 409 });
    }

    const prizes = Array.isArray(config.sorteo_premios) ? config.sorteo_premios : [];
    const configuredPrize = prizes.find((p) => String(p.nombre || '').trim() === prizeName);
    if (!configuredPrize) {
      return Response.json({ error: 'El premio no está configurado en la temporada activa' }, { status: 400 });
    }

    const previousDraws = await base44.asServiceRole.entities.RaffleDraw.filter({
      temporada: config.temporada,
      premio_nombre: prizeName
    });
    if (previousDraws.length) {
      return Response.json({ error: 'Este premio ya tiene un resultado registrado para la temporada activa' }, { status: 409 });
    }

    const matchingTickets = await base44.asServiceRole.entities.ReferralHistory.filter({
      temporada: config.temporada,
      numero_papeleta: winningTicket,
      estado: 'activo'
    });
    if (matchingTickets.length !== 1) {
      return Response.json({ error: 'La papeleta no existe, está inactiva o el número está duplicado' }, { status: 409 });
    }

    const ticket = matchingTickets[0];
    if (!ticket.referido_id || !ticket.referidor_email || !ticket.referido_email) {
      return Response.json({ error: 'La papeleta no tiene todos los datos necesarios para validar al ganador' }, { status: 409 });
    }

    const referrerEmail = String(ticket.referidor_email).trim().toLowerCase();
    const referredEmail = String(ticket.referido_email).trim().toLowerCase();
    if (referrerEmail === referredEmail) {
      return Response.json({ error: 'Una persona no puede referirse a sí misma' }, { status: 409 });
    }

    const referrerMemberships = await base44.asServiceRole.entities.ClubMember.filter({
      email: referrerEmail,
      temporada: config.temporada,
      estado_pago: 'Pagado'
    });
    const referredMembership = await base44.asServiceRole.entities.ClubMember.get(ticket.referido_id).catch(() => null);
    if (!referrerMemberships.length || !referredMembership ||
        referredMembership.temporada !== config.temporada ||
        referredMembership.estado_pago !== 'Pagado' ||
        String(referredMembership.email || '').trim().toLowerCase() !== referredEmail) {
      return Response.json({ error: 'No se puede validar: el socio invitador y el nuevo socio deben tener la cuota pagada en la temporada activa' }, { status: 409 });
    }

    const allTickets = await base44.asServiceRole.entities.ReferralHistory.filter({
      temporada: config.temporada,
      estado: 'activo'
    });
    const paidMembers = await base44.asServiceRole.entities.ClubMember.filter({
      temporada: config.temporada,
      estado_pago: 'Pagado'
    });
    const paidEmails = new Set(paidMembers.map((m) => String(m.email || '').trim().toLowerCase()));
    const paidIds = new Set(paidMembers.map((m) => m.id));
    const eligibleTickets = allTickets.filter((t) =>
      t.numero_papeleta &&
      t.referido_id &&
      paidIds.has(t.referido_id) &&
      paidEmails.has(String(t.referidor_email || '').trim().toLowerCase()) &&
      String(t.referidor_email || '').trim().toLowerCase() !== String(t.referido_email || '').trim().toLowerCase()
    );
    const uniqueNumbers = new Set(eligibleTickets.map((t) => String(t.numero_papeleta).trim()));
    if (uniqueNumbers.size !== eligibleTickets.length) {
      return Response.json({ error: 'Hay números de papeleta duplicados en el listado. Revisa el registro antes de guardar el sorteo.' }, { status: 409 });
    }

    const draw = await base44.asServiceRole.entities.RaffleDraw.create({
      temporada: config.temporada,
      premio_nombre: prizeName,
      premio_emoji: String(configuredPrize.emoji || body.prize_emoji || ''),
      premio_descripcion: String(configuredPrize.descripcion || body.prize_description || ''),
      ganador_email: referrerEmail,
      ganador_nombre: ticket.referidor_nombre,
      numero_ganador: winningTicket,
      papeleta_referido_id: ticket.referido_id,
      participaciones_ganador: eligibleTickets.filter((t) =>
        String(t.referidor_email || '').trim().toLowerCase() === referrerEmail
      ).length,
      total_participaciones: eligibleTickets.length,
      fecha_sorteo: new Date().toISOString(),
      admin_email: user.email,
      snapshot_papeletas: JSON.stringify(eligibleTickets.map((t) => ({
        numero: t.numero_papeleta,
        referidor_email: t.referidor_email,
        referidor_nombre: t.referidor_nombre,
        referido_id: t.referido_id
      })))
    });

    return Response.json({ success: true, draw });
  } catch (error) {
    console.error('[registerPhysicalReferralRaffle]', error);
    return Response.json({ error: error?.message || 'No se pudo registrar el resultado del sorteo físico' }, { status: 500 });
  } finally {
    if (lockConfigId && lockToken) {
      try {
        await base44.asServiceRole.entities.SeasonConfig.updateMany(
          { id: lockConfigId, raffle_draw_lock: lockToken },
          { $set: { raffle_draw_lock: '' } }
        );
      } catch (releaseError) {
        console.error('[registerPhysicalReferralRaffle] No se pudo liberar el bloqueo:', releaseError);
      }
    }
  }
});