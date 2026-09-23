import { createClientFromRequest } from 'npm:@base44/sdk@0.8.49';

const LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg';

const esc = (s) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function buildHtml(o, oppId) {
  const fecha = o.fecha ? o.fecha.split('-').reverse().join('/') : '';
  const row = (icon, label, val) => val ? `<tr><td style="padding:6px 0;color:#64748b;font-size:14px;width:110px;">${icon} ${label}</td><td style="padding:6px 0;color:#1e293b;font-size:14px;font-weight:600;">${esc(val)}</td></tr>` : '';
  return `
<div style="font-family:system-ui,-apple-system,sans-serif;max-width:560px;margin:auto;padding:20px;background:#f8fafc;">
  <div style="background:linear-gradient(135deg,#ea580c,#15803d);color:#fff;padding:24px;border-radius:12px 12px 0 0;text-align:center;">
    <img src="${LOGO}" alt="CD Bustarviejo" width="64" height="64" style="border-radius:50%;background:#fff;padding:4px;" />
    <h1 style="margin:12px 0 0;font-size:22px;">🤝 ¿Nos echas una mano?</h1>
    <p style="margin:4px 0 0;opacity:.9;font-size:14px;">Nueva oportunidad de voluntariado</p>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;padding:24px;">
    <h2 style="margin:0 0 12px;font-size:20px;color:#1e293b;">${esc(o.titulo)}</h2>
    ${o.descripcion ? `<p style="color:#475569;font-size:15px;line-height:1.6;margin:0 0 16px;">${esc(o.descripcion)}</p>` : ''}
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
      ${row('📅', 'Fecha', fecha)}
      ${row('🕐', 'Hora', o.hora)}
      ${row('📍', 'Lugar', o.ubicacion)}
      ${row('👥', 'Plazas', o.plazas ? `${o.plazas} personas` : '')}
      ${row('🙋', 'Organiza', o.creado_por_nombre)}
    </table>
    <p style="color:#475569;font-size:14px;line-height:1.6;">El club lo hacemos entre todos. Cualquier ayuda, por pequeña que sea, suma. ¡Gracias!</p>
    <p style="text-align:center;margin:24px 0 8px;">
      <a href="https://app.cdbustarviejo.com/Voluntariado?opp_id=${oppId}" style="display:inline-block;background:#ea580c;color:#fff;padding:14px 28px;border-radius:8px;font-weight:700;font-size:15px;text-decoration:none;">Apuntarme en la App →</a>
    </p>
  </div>
  <div style="background:#1e293b;padding:20px;text-align:center;border-radius:0 0 12px 12px;color:#94a3b8;font-size:12px;line-height:1.6;">
    <strong style="color:#f8fafc;">Junta Directiva · CD Bustarviejo</strong><br>
    <a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a> · <a href="https://www.cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">www.cdbustarviejo.com</a>
  </div>
</div>`.trim();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { opportunity_id } = await req.json();
    if (!opportunity_id) return Response.json({ error: 'Missing opportunity_id' }, { status: 400 });

    const [opp] = await base44.asServiceRole.entities.VolunteerOpportunity.filter({ id: opportunity_id });
    if (!opp) return Response.json({ error: 'Not found' }, { status: 404 });
    if (opp.estado === 'cerrada' || opp.publicada === false) return Response.json({ skipped: 'not open' });
    // Anti-abuso: solo se envía para oportunidades recién creadas
    if (Date.now() - new Date(opp.created_date).getTime() > 3 * 3600 * 1000) {
      return Response.json({ skipped: 'too old' });
    }

    const players = await base44.asServiceRole.entities.Player.filter({ activo: true });
    const emails = new Set();
    for (const p of players) {
      for (const e of [p.email_padre, p.email_tutor_2, p.email_jugador]) {
        if (e && e.includes('@')) emails.add(e.trim().toLowerCase());
      }
    }
    emails.delete((opp.creado_por || '').toLowerCase());
    const list = [...emails];

    const key = Deno.env.get('RESEND_API_KEY');
    const subject = `🤝 Voluntariado: ${opp.titulo}`;
    const html = buildHtml(opp, opportunity_id);
    let sent = 0, failed = 0;

    for (let i = 0; i < list.length; i += 100) {
      const batch = list.slice(i, i + 100).map((to) => ({
        from: 'CD Bustarviejo <noreply@cdbustarviejo.com>',
        reply_to: 'info@cdbustarviejo.com',
        to: [to], subject, html,
      }));
      const resp = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch),
      });
      if (resp.ok) sent += batch.length;
      else { failed += batch.length; console.error('Resend error', resp.status, await resp.text()); }
      await new Promise((r) => setTimeout(r, 600));
    }

    return Response.json({ recipients: list.length, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});