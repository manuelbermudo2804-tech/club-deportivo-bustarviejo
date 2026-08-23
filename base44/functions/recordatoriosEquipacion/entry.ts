import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let user = null;
    try { user = await base44.auth.me(); } catch (_e) { user = null; }
    // Invocación manual: solo admin. Invocación automática (workflow): sin usuario.
    if (user && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {};
    const soloPrueba = body.soloPrueba === true;

    const players = await base44.asServiceRole.entities.Player.filter({ activo: true });
    const pedidos = await base44.asServiceRole.entities.PedidoEquipacion.list('-fecha_pedido', 1000);

    const conPedido = new Set();
    pedidos.forEach((p) => {
      (p.jugadores || []).forEach((j) => { if (j.jugador_id) conPedido.add(j.jugador_id); });
      if (p.jugador_id) conPedido.add(p.jugador_id);
    });

    const pendientes = players.filter((p) => !conPedido.has(p.id));

    // Agrupar por familia (email) para no enviar un correo por hermano
    const porEmail = {};
    pendientes.forEach((p) => {
      [p.email_padre, p.email_tutor_2].filter(Boolean).forEach((email) => {
        porEmail[email] = [...(porEmail[email] || []), p.nombre];
      });
    });

    const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    const tiendaUrl = configs[0]?.tienda_ropa_url || '';

    if (soloPrueba) {
      return Response.json({ pendientes: pendientes.length, emails: Object.keys(porEmail).length, enviados: 0 });
    }

    let enviados = 0;
    for (const email of Object.keys(porEmail)) {
      const nombres = [...new Set(porEmail[email])];
      const listado = nombres.map((n) => `<li>${n}</li>`).join('');
      const cuerpo = `
        <p>Hola,</p>
        <p>Nos consta que aún no se ha realizado el <strong>pedido de equipación</strong> de:</p>
        <ul>${listado}</ul>
        ${tiendaUrl ? `<p>Puedes hacerlo aquí: <a href="${tiendaUrl}">Tienda de equipación</a></p>` : ''}
        <p>Si ya lo has hecho, responde a este correo y lo revisamos.</p>
        <p>¡Gracias!<br/>CD Bustarviejo</p>
      `;
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: '👕 Recordatorio: pedido de equipación pendiente',
          body: cuerpo,
          from_name: 'CD Bustarviejo',
        });
        enviados++;
      } catch (_e) { /* seguimos con el resto */ }
    }

    return Response.json({ pendientes: pendientes.length, emails: Object.keys(porEmail).length, enviados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});