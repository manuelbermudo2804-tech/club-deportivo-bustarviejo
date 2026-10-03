import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const APP_URL = 'https://club-deportivo-bustarviejo-copy-92897991.base44.app';

const plantilla = (nombre, junta, fecha, esApp) => {
  const boton = esApp
    ? { url: APP_URL, texto: 'Abrir la app y responder' }
    : { url: `${APP_URL}/l/${junta.landing_slug}`, texto: 'Confirmar mi asistencia' };
  const titulo = junta.titulo || 'Junta General de Socios';
  const orden = (junta.orden_dia || []).map((p) => `<li style="margin:2px 0">${p}</li>`).join('');
  const instr = esApp
    ? 'Entra en la app del club (con tu correo de siempre) y verás el aviso de la junta: ahí nos confirmas si vienes.'
    : 'Pulsa el botón y confírmanos si vienes. Solo te llevará un minuto.';
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;color:#334155;font-size:15px;line-height:1.45">
<div style="background:#ea580c;color:#fff;padding:10px 18px;font-weight:bold;font-size:14px"><img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" width="40" height="40" alt="CD Bustarviejo" style="vertical-align:middle;border-radius:50%;background:#fff;margin-right:10px">CD Bustarviejo · Convocatoria oficial</div>
<div style="padding:16px 18px">
<p style="margin:0 0 10px">Hola ${nombre || ''},</p>
<p style="margin:0 0 12px">Te convocamos a la <b>${titulo}</b> del CD Bustarviejo. Tu voz cuenta y tu presencia es necesaria.</p>
<div style="background:#f0fdf4;border-left:4px solid #15803d;padding:10px 12px;margin:0 0 12px">📅 <b>${fecha}</b>${junta.lugar ? `<br>📍 <b>${junta.lugar}</b>` : ''}</div>
${orden ? `<p style="margin:0 0 4px"><b>Orden del día:</b></p><ol style="margin:0 0 12px;padding-left:20px">${orden}</ol>` : ''}
<p style="margin:0 0 14px">${instr}</p>
<table role="presentation" cellspacing="0" cellpadding="0" border="0" align="center" style="margin:0 auto 6px"><tr><td bgcolor="#ea580c" style="border-radius:8px;text-align:center">
<a href="${boton.url}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:bold;font-size:15px;text-decoration:none;font-family:Arial,sans-serif">${boton.texto}</a>
</td></tr></table>
</div></div>`;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const { junta_id } = await req.json();
    const sr = base44.asServiceRole;
    const junta = await sr.entities.JuntaSocios.get(junta_id);
    const [socios, users] = await Promise.all([
      sr.entities.ClubMember.list('-created_date', 3000),
      sr.entities.User.list('-created_date', 5000),
    ]);
    const enApp = new Set(users.map((u) => (u.email || '').toLowerCase()));
    const fecha = new Date(junta.fecha).toLocaleString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Madrid' });
    const vistos = new Set();
    let app = 0, web = 0, sinWeb = 0, fallos = 0;
    const prueba = (junta.email_prueba || '').trim().toLowerCase();

    for (const s of socios) {
      const email = (s.email || '').trim().toLowerCase();
      if (!email || vistos.has(email) || s.activo === false) continue;
      if (prueba && email !== prueba) continue;
      vistos.add(email);
      const esApp = enApp.has(email);
      if (!esApp && !junta.landing_slug) { sinWeb++; continue; }
      const r = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${Deno.env.get('RESEND_API_KEY')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: 'CD Bustarviejo <noreply@cdbustarviejo.com>', to: email, subject: `🗳️ ${junta.titulo || 'Junta General de Socios'} — te necesitamos`, html: plantilla(s.nombre_completo, junta, fecha, esApp) }),
      });
      if (!r.ok) { fallos++; console.log('fallo', email, await r.text()); continue; }
      esApp ? app++ : web++;
      await new Promise((ok) => setTimeout(ok, 250));
    }
    return Response.json({ app, web, sinWeb, fallos });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});