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

    // Buscar anuncios reservados >48h y que no hayan recibido recordatorio en las últimas 24h
    const now = Date.now();
    const listings = await base44.asServiceRole.entities.MarketListing.filter({ estado: 'reservado' });

    let processed = 0;
    for (const l of listings || []) {
      try {
        const t = l?.reservado_fecha ? new Date(l.reservado_fecha).getTime() : null;
        if (!t) continue;
        const over48h = now - t >= 48 * 60 * 60 * 1000;
        if (!over48h) continue;
        const last = l?.ultimo_recordatorio_reserva ? new Date(l.ultimo_recordatorio_reserva).getTime() : 0;
        const over24hSinceLast = now - last >= 24 * 60 * 60 * 1000;
        if (!over24hSinceLast) continue;

        const vendedorEmail = l.vendedor_email || l.created_by;
        const compradorNombre = l.reservado_por_nombre || l.reservado_por_email || 'Comprador';

        // Notificación en app
        if (vendedorEmail) {
          await base44.asServiceRole.entities.AppNotification.create({
            usuario_email: vendedorEmail,
            titulo: `Recordatorio: cierra tu anuncio reservado`,
            mensaje: `${compradorNombre} reservó "${l.titulo}" hace más de 48h. Márcalo como Vendido o Entregado.`,
            tipo: 'importante',
            icono: '🛍️',
            enlace: ''
          });
        }

        // Email
        if (vendedorEmail) {
          const mktHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:28px 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">🛍️</div>
  <div style="color:#fff;font-size:20px;font-weight:800;">CIERRA TU ANUNCIO</div>
  <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Mercadillo CD Bustarviejo</div>
</td></tr>
<tr><td style="padding:24px;">
  <p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola,</p>
  <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tu anuncio lleva más de 48h reservado. Márcalo como vendido o entregado:</p>
  <div style="background:#fff7ed;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #fed7aa;">
    <div style="font-weight:800;color:#9a3412;font-size:16px;">"${l.titulo}"</div>
    <div style="color:#c2410c;font-size:13px;margin-top:4px;">Reservado por: ${compradorNombre}</div>
  </div>
  <div style="text-align:center;margin:20px 0;"><a href="https://app.cdbustarviejo.com/mercadillo" style="display:inline-block;background:linear-gradient(135deg,#ea580c,#c2410c);color:#fff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:12px;">📦 GESTIONAR ANUNCIO</a></div>
</td></tr>
<tr><td style="background:#1e293b;padding:20px 24px;text-align:center;"><div style="color:#94a3b8;font-size:12px;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:cdbustarviejo@gmail.com" style="color:#fb923c;text-decoration:none;">cdbustarviejo@gmail.com</a></div></td></tr>
</table></td></tr></table></body></html>`;
          await sendViaResend(vendedorEmail, `🛍️ Cierra tu anuncio reservado - ${l.titulo}`, mktHtml);
        }

        // Marcar fecha de último recordatorio
        await base44.asServiceRole.entities.MarketListing.update(l.id, {
          ultimo_recordatorio_reserva: new Date().toISOString(),
        });
        processed++;
      } catch (e) {
        console.error('Error processing listing', l?.id, e?.message || e);
      }
    }

    return Response.json({ ok: true, processed });
  } catch (error) {
    console.error('sendMarketReservationReminders error', error?.message || error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});