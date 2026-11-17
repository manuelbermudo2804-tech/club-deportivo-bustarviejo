import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const prizeName = String(body.prize_name || '').trim();
    if (!prizeName) return Response.json({ error: 'Falta el nombre del premio' }, { status: 400 });

    const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    if (configs.length !== 1) return Response.json({ error: 'Debe existir exactamente una temporada activa' }, { status: 409 });
    const temporada = configs[0].temporada;

    const previous = await base44.asServiceRole.entities.RaffleDraw.filter({ temporada, premio_nombre: prizeName });
    if (previous.length) return Response.json({ error: 'Ya existe un sorteo registrado para este premio y temporada' }, { status: 409 });

    const histories = await base44.asServiceRole.entities.ReferralHistory.filter({ temporada });
    const members = await base44.asServiceRole.entities.ClubMember.filter({ temporada, estado_pago: 'Pagado' });
    const paidEmails = new Set(members.map(m => String(m.email || '').trim().toLowerCase()).filter(Boolean));
    const paidIds = new Set(members.map(m => m.id));
    const valid = histories.filter(h =>
      h.estado === 'activo' &&
      h.numero_papeleta &&
      h.referido_id &&
      paidIds.has(h.referido_id) &&
      paidEmails.has(String(h.referidor_email || '').trim().toLowerCase()) &&
      String(h.referidor_email || '').trim().toLowerCase() !== String(h.referido_email || '').trim().toLowerCase()
    );

    const seen = new Set();
    const tickets = valid.filter(h => {
      const ticket = String(h.numero_papeleta).trim();
      if (!ticket || seen.has(ticket)) return false;
      seen.add(ticket);
      return true;
    });
    if (!tickets.length) return Response.json({ error: 'No hay papeletas que cumplan todas las condiciones de elegibilidad y pago' }, { status: 409 });

    const winner = tickets[crypto.getRandomValues(new Uint32Array(1))[0] % tickets.length];
    const draw = await base44.asServiceRole.entities.RaffleDraw.create({
      temporada,
      premio_nombre: prizeName,
      premio_emoji: String(body.prize_emoji || ''),
      premio_descripcion: String(body.prize_description || ''),
      ganador_email: winner.referidor_email,
      ganador_nombre: winner.referidor_nombre,
      numero_ganador: String(winner.numero_papeleta),
      papeleta_referido_id: winner.referido_id,
      participaciones_ganador: tickets.filter(t => String(t.referidor_email).toLowerCase() === String(winner.referidor_email).toLowerCase()).length,
      total_participaciones: tickets.length,
      fecha_sorteo: new Date().toISOString(),
      admin_email: user.email,
      snapshot_papeletas: JSON.stringify(tickets.map(t => ({
        numero: t.numero_papeleta, referidor_email: t.referidor_email,
        referidor_nombre: t.referidor_nombre, referido_id: t.referido_id
      })))
    });
    return Response.json({ success: true, draw, winner_ticket: winner.numero_papeleta });
  } catch (error) {
    console.error('[executeReferralRaffle]', error);
    return Response.json({ error: error?.message || 'No se pudo realizar el sorteo' }, { status: 500 });
  }
});