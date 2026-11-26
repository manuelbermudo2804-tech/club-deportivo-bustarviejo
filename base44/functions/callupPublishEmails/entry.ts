import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildHtml(c, jugadorNombre) {
  let fecha = c.fecha_partido || '';
  try {
    fecha = new Date(c.fecha_partido + 'T12:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' });
  } catch {}
  const localVisitante = c.local_visitante === 'Local' ? '🏠 Local' : '✈️ Visitante';
  const d = c.descripcion || '';
  const descripcion = d.startsWith('Borrador creado automáticamente') ? '' : d;
  const row = (label, value, color = '#0f172a') => `<tr><td style="padding:14px 16px;border-bottom:1px solid #e2e8f0;"><div style="color:#64748b;font-size:12px;font-weight:600;">${label}</div><div style="color:${color};font-size:16px;font-weight:700;margin-top:2px;text-transform:capitalize;">${value}</div></td></tr>`;
  return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#ffffff;border-radius:16px;overflow:hidden;">
<tr><td style="background-color:#ea580c;padding:28px 24px;text-align:center;"><div style="font-size:36px;margin-bottom:8px;">⚽</div><div style="color:#ffffff;font-size:22px;font-weight:800;">¡CONVOCATORIA!</div><div style="color:#fed7aa;font-size:14px;margin-top:4px;">CD Bustarviejo</div></td></tr>
<tr><td style="padding:20px 24px 0;text-align:center;"><div style="background:#fff7ed;border:2px solid #fdba74;border-radius:12px;padding:14px 16px;"><div style="color:#9a3412;font-size:13px;font-weight:600;">JUGADOR CONVOCADO</div><div style="color:#c2410c;font-size:20px;font-weight:800;margin-top:4px;">${esc(jugadorNombre)}</div></div></td></tr>
<tr><td style="padding:20px 24px;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;">
${c.rival ? row('RIVAL', `${esc(c.rival)} <span style="color:#94a3b8;font-size:13px;">${localVisitante}</span>`) : ''}
${row('📅 FECHA', esc(fecha))}
${row('⏰ HORA DEL PARTIDO', `${esc(c.hora_partido)}h`)}
${c.hora_concentracion ? row('🕐 CONCENTRACIÓN', `${esc(c.hora_concentracion)}h`, '#c2410c') : ''}
<tr><td style="padding:14px 16px;"><div style="color:#64748b;font-size:12px;font-weight:600;">📍 UBICACIÓN</div><div style="color:#0f172a;font-size:15px;font-weight:600;margin-top:2px;">${esc(c.ubicacion)}</div>${c.enlace_ubicacion ? `<a href="${esc(c.enlace_ubicacion)}" style="display:inline-block;margin-top:8px;color:#2563eb;font-size:13px;font-weight:600;text-decoration:none;">🗺️ Ver en Google Maps →</a>` : ''}</td></tr>
</table></td></tr>
${descripcion ? `<tr><td style="padding:0 24px 16px;"><div style="background:#eff6ff;border-radius:10px;padding:12px 16px;border-left:4px solid #3b82f6;"><div style="color:#1e40af;font-size:12px;font-weight:700;margin-bottom:4px;">📋 INSTRUCCIONES</div><div style="color:#1e3a5f;font-size:14px;line-height:1.5;">${esc(descripcion).replace(/\n/g, '<br>')}</div></div></td></tr>` : ''}
<tr><td style="padding:8px 24px 24px;text-align:center;"><a href="https://app.cdbustarviejo.com/parentcallups" style="display:block;background-color:#16a34a;color:#ffffff;font-size:17px;font-weight:800;text-decoration:none;padding:18px 24px;border-radius:14px;">✅ CONFIRMAR ASISTENCIA</a><div style="color:#64748b;font-size:12px;margin-top:10px;">Pulsa para abrir la app y confirmar</div></td></tr>
<tr><td style="padding:0 24px 20px;"><div style="background:#f0fdf4;border-radius:10px;padding:12px 16px;text-align:center;border:1px solid #bbf7d0;"><div style="color:#166534;font-size:13px;">Entrenador: <strong>${esc(c.publicada_por_nombre || c.entrenador_nombre)}</strong></div>${c.entrenador_telefono ? `<div style="color:#15803d;font-size:13px;margin-top:4px;">📞 ${esc(c.entrenador_telefono)}</div>` : ''}</div></td></tr>
<tr><td style="background:#1e293b;padding:24px;text-align:center;"><div style="margin-bottom:12px;"><a href="https://www.cdbustarviejo.com" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:8px;">🌐 www.cdbustarviejo.com</a></div><div style="color:#94a3b8;font-size:12px;line-height:1.6;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a></div></td></tr>
</table></td></tr></table></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { callup_id } = await req.json().catch(() => ({}));
    if (!callup_id) return Response.json({ error: 'callup_id is required' }, { status: 400 });

    const c = await base44.asServiceRole.entities.Convocatoria.get(callup_id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!c) return Response.json({ error: 'Not found' }, { status: 404 });
    if (!c.publicada) return Response.json({ skipped: 'not published' });
    if (c.notificaciones_enviadas) return Response.json({ skipped: 'already sent' });
    if (c.entrenador_email === 'sistema@cdbustarviejo.es' && !c.publicada_por) return Response.json({ skipped: 'system callup' });

    const jugadores = c.jugadores_convocados || [];
    const ids = jugadores.map((j) => j.jugador_id).filter(Boolean);
    const fichas = ids.length ? await base44.asServiceRole.entities.Player.filter({ id: { $in: ids } }) : [];

    const emails = [];
    for (const j of jugadores) {
      const p = fichas.find((f) => f.id === j.jugador_id);
      const list = [j.email_padre, j.email_tutor_2 || p?.email_tutor_2];
      if (!j.email_padre && j.email_jugador) list.push(j.email_jugador);
      if (p?.acceso_menor_email && p.acceso_menor_autorizado && !p.acceso_menor_revocado) list.push(p.acceso_menor_email);
      for (const to of [...new Set(list.filter(Boolean).map((e) => e.trim().toLowerCase()))]) {
        emails.push({ to, jugador: j.jugador_nombre || '' });
      }
    }
    if (!emails.length) return Response.json({ skipped: 'no recipients' });

    const subject = `⚽ Convocatoria: ${c.rival ? `vs ${c.rival}` : c.titulo} - CD Bustarviejo`;
    const batch = emails.map(({ to, jugador }) => ({ from: 'noreply@cdbustarviejo.com', to: [to], subject, html: buildHtml(c, jugador) }));

    let sent = 0;
    const errors = [];
    for (let i = 0; i < batch.length; i += 100) {
      const res = await fetch('https://api.resend.com/emails/batch', {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(batch.slice(i, i + 100)),
        signal: AbortSignal.timeout(30000),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) sent += (data.data || []).length;
      else errors.push(data.message || `HTTP ${res.status}`);
    }

    if (sent > 0) await base44.asServiceRole.entities.Convocatoria.update(callup_id, { notificaciones_enviadas: true });
    console.log(`[callupPublishEmails] ${c.categoria}: ${sent}/${batch.length} enviados`, errors);
    return Response.json({ sent, total: batch.length, errors });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});