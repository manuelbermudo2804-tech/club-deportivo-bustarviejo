import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { jugador_id, appUrl } = body;
    if (!jugador_id) return Response.json({ error: 'jugador_id requerido' }, { status: 400 });

    const jugador = await base44.asServiceRole.entities.Player.get(jugador_id);
    if (!jugador) return Response.json({ error: 'Jugador no encontrado' }, { status: 404 });

    const destinatarios = [...new Set([jugador.email_padre, jugador.email_tutor_2].filter(Boolean))];
    if (!destinatarios.length) return Response.json({ error: 'Este jugador no tiene email de familia' }, { status: 400 });

    const base = appUrl || '';
    const enlaceApp = base ? `${base}/Tienda` : '';

    const cuerpo = `
      <p>Hola,</p>
      <p>Nos consta que aún no se ha realizado el <strong>pedido de equipación</strong> de <strong>${jugador.nombre}</strong>.</p>
      <p>Para hacerlo, entra en la <strong>app del club</strong> y ve al apartado <strong>Tienda → Equipación</strong>:
      ahí verás el dorsal asignado, las instrucciones y el enlace correcto a la tienda.</p>
      ${enlaceApp ? `<p><a href="${enlaceApp}">Abrir la app del club</a></p>` : ''}
      <p>Es importante entrar desde la app para que el pedido lleve el dorsal y los datos correctos.</p>
      <p>Si ya lo has hecho, responde a este correo y lo revisamos.</p>
      <p>¡Gracias!<br/>CD Bustarviejo</p>
    `;

    let enviados = 0;
    for (const email of destinatarios) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: `👕 Pedido de equipación pendiente — ${jugador.nombre}`,
          body: cuerpo,
          from_name: 'CD Bustarviejo',
        });
        enviados++;
        await base44.asServiceRole.entities.RecordatorioEquipacion.create({
          jugador_id: jugador.id,
          jugador_nombre: jugador.nombre,
          canal: 'email',
          destinatario: email,
          fecha: new Date().toISOString(),
          enviado_por: user.email,
        });
      } catch (_e) { /* seguimos con el otro tutor */ }
    }

    if (!enviados) return Response.json({ error: 'No se pudo enviar el correo' }, { status: 500 });
    return Response.json({ enviados, destinatarios });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});