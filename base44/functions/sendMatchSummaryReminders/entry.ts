import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const SOCIAL_FOOTER = `<div style="background:#1e293b;padding:24px;text-align:center;border-radius:0 0 12px 12px;margin-top:24px;"><div style="margin-bottom:12px;"><a href="https://www.cdbustarviejo.com" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:8px;">🌐 www.cdbustarviejo.com</a></div><div style="margin-bottom:14px;"><a href="https://www.facebook.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Facebook">📘</a><a href="https://www.instagram.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Instagram">📸</a></div><div style="color:#94a3b8;font-size:12px;line-height:1.6;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a></div></div>`;

function injectFooter(html) {
  if (html.includes('www.cdbustarviejo.com')) return html;
  if (html.includes('</body>')) return html.replace('</body>', SOCIAL_FOOTER + '</body>');
  return html + SOCIAL_FOOTER;
}

async function sendViaResend(to, subject, html) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) { console.error('[RESEND] API key not set'); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'CD Bustarviejo <noreply@cdbustarviejo.com>', to: [to], subject, html: injectFooter(html) })
  });
  if (!resp.ok) console.error(`[RESEND] Error ${resp.status}:`, await resp.text().catch(() => ''));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { preview = false } = await req.json().catch(() => ({ preview: false }));

    const today = new Date(); today.setHours(0,0,0,0);

    // Convocatorias pasadas sin observación registrada
    const convocatorias = await base44.asServiceRole.entities.Convocatoria.filter({ publicada: true, cerrada: false });

    let candidates = 0, sent = 0;
    for (const c of convocatorias) {
      try {
        if (!c.fecha_partido) continue;
        const d = new Date(c.fecha_partido); d.setHours(0,0,0,0);
        if (d >= today) continue; // aún no ha pasado

        const obs = await base44.asServiceRole.entities.MatchObservation.filter({ convocatoria_id: c.id });
        if (obs.length > 0) continue; // ya hay resumen

        if (!c.entrenador_email) continue;
        candidates += 1;

        // Evitar duplicado diario
        const existing = await base44.asServiceRole.entities.AutomaticReminder.filter({
          email_padre: c.entrenador_email,
          fecha_envio: new Date().toISOString().slice(0,10)
        });
        if (existing.some(r => r.notas?.includes?.('MATCH_SUMMARY'))) continue;

        if (!preview) {
          const summaryHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">📊</div>
  <div style="color:#fff;font-size:20px;font-weight:800;">REGISTRA EL RESUMEN</div>
  <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Tras el partido</div>
</td></tr>
<tr><td style="padding:24px;">
  <p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola${c.entrenador_nombre ? ` ${c.entrenador_nombre}` : ''},</p>
  <p style="color:#334155;font-size:14px;margin:0 0 16px;">Recuerda completar el resumen del partido:</p>
  <div style="background:#eff6ff;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #bfdbfe;">
    <div style="font-weight:800;color:#1e40af;font-size:16px;">${c.titulo}</div>
    <div style="color:#2563eb;font-size:13px;margin-top:4px;">📅 ${c.fecha_partido || ''}${c.hora_partido ? ` · ⏰ ${c.hora_partido}` : ''}</div>
  </div>
  <div style="text-align:center;margin:20px 0;"><a href="https://app.cdbustarviejo.com/centrocompeticiontecnico" style="display:inline-block;background:linear-gradient(135deg,#2563eb,#1d4ed8);color:#fff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:12px;">📝 REGISTRAR RESUMEN</a></div>
</td></tr>
<tr><td style="background:#1e293b;padding:20px 24px;text-align:center;"><div style="color:#94a3b8;font-size:12px;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:cdbustarviejo@gmail.com" style="color:#fb923c;text-decoration:none;">cdbustarviejo@gmail.com</a></div></td></tr>
</table></td></tr></table></body></html>`;
          await sendViaResend(c.entrenador_email, `📊 Registra el resumen del partido - ${c.titulo}`, summaryHtml);
          await base44.asServiceRole.entities.AutomaticReminder.create({
            email_padre: c.entrenador_email,
            tipo_recordatorio: 'Manual',
            fecha_envio: new Date().toISOString().slice(0,10),
            enviado: true,
            notas: `MATCH_SUMMARY:${c.id}`
          });
        }
        sent += 1;
      } catch (err) {
        console.error('Match summary loop error', err);
      }
    }

    return Response.json({ success: true, candidates, sent });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});