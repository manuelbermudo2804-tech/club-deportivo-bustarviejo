import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { preview = false } = await req.json().catch(() => ({ preview: false }));

    // Eventos publicados que requieren confirmación y aún no han pasado
    const events = await base44.asServiceRole.entities.Event.filter({ publicado: true, requiere_confirmacion: true });
    const today = new Date();
    today.setHours(0,0,0,0);

    let sent = 0, candidates = 0;

    for (const e of events) {
      try {
        // Excluir eventos pasados
        if (e.fecha) {
          const d = new Date(e.fecha); d.setHours(0,0,0,0);
          if (d < today) continue;
        }
        const confirmaciones = Array.isArray(e.confirmaciones) ? e.confirmaciones : [];
        for (const c of confirmaciones) {
          const estado = (c.confirmacion || 'pendiente');
          if (estado === 'asistire' || estado === 'no_asistire') continue;
          const to = c.usuario_email || c.email || null;
          if (!to) continue;
          candidates += 1;

          // Evitar múltiple envío en el mismo día con AutomaticReminder
          const existing = await base44.asServiceRole.entities.AutomaticReminder.filter({
            tipo_recordatorio: 'Manual', // usamos como bitácora
            email_padre: to,
            fecha_envio: new Date().toISOString().slice(0,10)
          });
          if (existing.some(r => r.notas?.includes?.('RSVP'))) continue;

          if (!preview) {
            const rsvpHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:28px 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">🎉</div>
  <div style="color:#fff;font-size:20px;font-weight:800;">CONFIRMA TU ASISTENCIA</div>
</td></tr>
<tr><td style="padding:24px;">
  <p style="color:#334155;font-size:15px;margin:0 0 16px;">Hola${c.usuario_nombre ? ` ${c.usuario_nombre}` : ''},</p>
  <p style="color:#334155;font-size:14px;margin:0 0 16px;">Tienes un evento pendiente de confirmar:</p>
  <div style="background:#f5f3ff;border-radius:12px;padding:16px;margin-bottom:16px;border:1px solid #ddd6fe;">
    <div style="font-weight:800;color:#5b21b6;font-size:17px;margin-bottom:8px;">${e.titulo}</div>
    <div style="color:#6d28d9;font-size:14px;">📅 ${e.fecha || ''}${e.hora ? ` · ⏰ ${e.hora}` : ''}</div>
  </div>
  <div style="text-align:center;margin:20px 0;"><a href="https://app.cdbustarviejo.com/parentcallups" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#fff;font-size:16px;font-weight:800;text-decoration:none;padding:16px 32px;border-radius:12px;">✅ CONFIRMAR ASISTENCIA</a></div>
</td></tr>
<tr><td style="background:#1e293b;padding:20px 24px;text-align:center;"><div style="color:#94a3b8;font-size:12px;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:cdbustarviejo@gmail.com" style="color:#fb923c;text-decoration:none;">cdbustarviejo@gmail.com</a></div></td></tr>
</table></td></tr></table></body></html>`;
            await base44.integrations.Core.SendEmail({
              to,
              subject: `🎉 Confirma tu asistencia - ${e.titulo}`,
              body: rsvpHtml
            });
            await base44.asServiceRole.entities.AutomaticReminder.create({
              jugador_id: c.jugador_id || null,
              jugador_nombre: c.jugador_nombre || '',
              email_padre: to,
              tipo_recordatorio: 'Manual',
              fecha_envio: new Date().toISOString().slice(0,10),
              enviado: true,
              notas: `RSVP:${e.id}`
            });
          }
          sent += 1;
        }
      } catch (err) {
        console.error('RSVP loop error', err);
      }
    }

    return Response.json({ success: true, candidates, sent });
  } catch (error) {
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});