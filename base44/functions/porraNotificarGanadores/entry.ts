import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Envía un email a los 3 ganadores (1º, 2º, 3º) con el premio que les corresponde.
// Body: { test?: boolean } - si test=true solo envía al admin para previsualizar
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const testMode = !!body.test;

    // Config + top3
    const cfgs = await base44.asServiceRole.entities.PorraConfig.list();
    const config = cfgs[0];
    if (!config) return Response.json({ error: 'No hay config' }, { status: 400 });

    const participantes = await base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' });
    const top = participantes
      .sort((a, b) => (b.puntos_total || 0) - (a.puntos_total || 0))
      .slice(0, 3);

    if (top.length === 0) {
      return Response.json({ error: 'No hay ganadores' }, { status: 400 });
    }

    // Cálculo del bote
    const recaudado = participantes.length * (config.precio_entrada || 15);
    const comision = recaudado * (config.comision_club_porcentaje || 10) / 100;
    const bote = recaudado - comision;

    const reparto = config.reparto_premios || { primero_porcentaje: 60, segundo_porcentaje: 25, tercero_porcentaje: 15 };
    const premios = [
      { pos: 1, emoji: '🥇', label: '1º Campeón', importe: bote * (reparto.primero_porcentaje || 60) / 100 },
      { pos: 2, emoji: '🥈', label: '2º Subcampeón', importe: bote * (reparto.segundo_porcentaje || 25) / 100 },
      { pos: 3, emoji: '🥉', label: '3º Tercer puesto', importe: bote * (reparto.tercero_porcentaje || 15) / 100 },
    ];

    const enviados = [];
    for (let i = 0; i < top.length; i++) {
      const ganador = top[i];
      const premio = premios[i];
      const destinatario = testMode ? user.email : ganador.email;

      const subject = `${premio.emoji} ¡Has quedado ${premio.label} en la Porra Mundial 2026!`;
      const html = `
        <div style="font-family:system-ui,-apple-system,sans-serif;max-width:600px;margin:0 auto;padding:24px;background:#fff7ed;border-radius:16px">
          <div style="text-align:center;background:linear-gradient(135deg,#dc2626,#ea580c);color:white;padding:32px;border-radius:12px;margin-bottom:24px">
            <div style="font-size:64px">${premio.emoji}</div>
            <h1 style="margin:8px 0;font-size:28px">¡Enhorabuena ${ganador.nombre}!</h1>
            <p style="margin:0;opacity:.9">Has quedado <strong>${premio.label}</strong> en la Porra Mundial 2026</p>
          </div>
          <div style="background:white;padding:20px;border-radius:12px;border:2px solid #fed7aa">
            <p><strong>Alias:</strong> ${ganador.alias_equipo}</p>
            <p><strong>Puntos totales:</strong> ${ganador.puntos_total} pts</p>
            <p><strong>Posición final:</strong> ${premio.label}</p>
            <hr style="margin:16px 0;border:none;border-top:1px solid #fed7aa">
            <div style="text-align:center;background:#fef3c7;padding:20px;border-radius:8px">
              <div style="font-size:14px;color:#92400e;text-transform:uppercase;font-weight:bold">Tu premio</div>
              <div style="font-size:42px;font-weight:900;color:#b45309">${premio.importe.toFixed(2)} €</div>
            </div>
            <p style="margin-top:16px;color:#475569;font-size:14px">
              Nos pondremos en contacto contigo para coordinar el pago del premio.
              Si tienes alguna duda, contacta con el club.
            </p>
          </div>
          <p style="text-align:center;margin-top:24px;color:#64748b;font-size:13px">
            🏆 ${config.nombre_torneo || 'Porra Mundial 2026'} — CD Bustarviejo
          </p>
        </div>
      `;

      await base44.integrations.Core.SendEmail({
        to: destinatario,
        subject: testMode ? `[TEST] ${subject}` : subject,
        body: html,
      });
      enviados.push({ pos: premio.pos, email: destinatario, nombre: ganador.nombre, importe: premio.importe });
    }

    return Response.json({ success: true, enviados, testMode });
  } catch (error) {
    console.error('porraNotificarGanadores error', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});