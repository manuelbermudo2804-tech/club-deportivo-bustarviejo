import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    if (configs.length !== 1) return Response.json({ error: 'No hay una única temporada activa' }, { status: 409 });
    const temporada = configs[0].temporada;
    const memberships = await base44.asServiceRole.entities.ClubMember.filter({
      email: String(user.email).trim().toLowerCase(), temporada, estado_pago: 'Pagado'
    });
    if (!memberships.length) return Response.json({ error: 'Solo los socios con cuota pagada pueden obtener un enlace personal' }, { status: 403 });

    let member = memberships[0];
    let code = String(member.codigo_referido || '').trim().toUpperCase();
    if (!/^[A-F0-9]{32}$/.test(code)) {
      code = crypto.randomUUID().replace(/-/g, '').toUpperCase();
      await base44.asServiceRole.entities.ClubMember.update(member.id, { codigo_referido: code });
    }
    return Response.json({ success: true, code, temporada });
  } catch (error) {
    console.error('[getMyReferralCode]', error);
    return Response.json({ error: 'No se pudo generar el enlace personal' }, { status: 500 });
  }
});