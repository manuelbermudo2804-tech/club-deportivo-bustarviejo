import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { assignment_id } = await req.json();
    if (!assignment_id) {
      return Response.json({ error: 'assignment_id required' }, { status: 400 });
    }

    const assignment = await base44.asServiceRole.entities.DorsalAssignment.get(assignment_id);
    if (!assignment) {
      return Response.json({ error: 'Assignment not found' }, { status: 404 });
    }

    const player = await base44.asServiceRole.entities.Player.get(assignment.jugador_id);
    if (!player) {
      return Response.json({ error: 'Player not found' }, { status: 404 });
    }

    // Buscar URL de la tienda: primero config específica de la categoría, sino la general
    const configs = await base44.asServiceRole.entities.DorsalConfig.filter({
      temporada: assignment.temporada,
      categoria: assignment.categoria,
    });
    let tiendaUrl = configs?.[0]?.tienda_url || '';
    if (!tiendaUrl) {
      const seasons = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
      tiendaUrl = seasons?.[0]?.tienda_ropa_url || '';
    }

    const emails = [player.email_padre, player.email_tutor_2, player.email_jugador]
      .filter(Boolean)
      .filter((v, i, a) => a.indexOf(v) === i);
    if (emails.length === 0) {
      return Response.json({ error: 'No emails to notify' }, { status: 400 });
    }

    const nombre = player.nombre || assignment.jugador_nombre;
    const subject = `⚽ ${nombre} ya tiene su dorsal para ${assignment.temporada}`;
    const body = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1e293b;">
        <h2 style="color: #ea580c; margin-top: 0;">⚽ Dorsal asignado</h2>
        <p>Hola familia de <strong>${nombre}</strong>,</p>
        <p>Ya está confirmado el dorsal para la temporada <strong>${assignment.temporada}</strong>:</p>
        <div style="background: linear-gradient(135deg, #fff7ed, #ffedd5); border: 2px solid #fb923c; border-radius: 16px; padding: 24px; margin: 20px 0; text-align: center;">
          <div style="font-size: 14px; color: #9a3412; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Número de dorsal</div>
          <div style="font-size: 64px; font-weight: 900; color: #ea580c; line-height: 1; margin: 8px 0;">${assignment.dorsal}</div>
          <div style="font-size: 16px; color: #7c2d12; font-weight: 600;">${assignment.categoria}</div>
        </div>
        <p>Ya puedes pedir la equipación con este dorsal en la tienda oficial del club.</p>
        ${tiendaUrl ? `
        <p style="text-align: center; margin: 24px 0;">
          <a href="${tiendaUrl}" style="display: inline-block; background: #ea580c; color: white; padding: 14px 32px; border-radius: 12px; text-decoration: none; font-weight: 700; font-size: 16px;">🛍️ Ir a la tienda</a>
        </p>
        ` : ''}
        <p style="margin-top: 32px; color: #64748b; font-size: 14px;">Un saludo,<br><strong>CD Bustarviejo</strong></p>
      </div>
    `;

    for (const to of emails) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        from_name: 'CD Bustarviejo',
        to,
        subject,
        body,
      });
    }

    await base44.asServiceRole.entities.DorsalAssignment.update(assignment_id, {
      email_enviado: true,
      fecha_email: new Date().toISOString(),
    });

    return Response.json({ success: true, sent_to: emails });
  } catch (error) {
    console.error('sendDorsalAssignmentEmail error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});