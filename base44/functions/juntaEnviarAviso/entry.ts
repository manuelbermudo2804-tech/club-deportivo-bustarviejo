import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const APP_URL = 'https://club-deportivo-bustarviejo-copy-92897991.base44.app';

const plantilla = (nombre, junta, fecha, esApp) => {
  const boton = esApp
    ? { url: APP_URL, texto: 'Abrir la app y responder' }
    : { url: `${APP_URL}/l/${junta.landing_slug}`, texto: 'Confirmar mi asistencia' };
  const orden = (junta.orden_dia || []).map((p) => `<li style="margin:4px 0">${p}</li>`).join('');
  return `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;border-radius:12px;overflow:hidden;border:1px solid #eee">
<div style="background:linear-gradient(135deg,#ea580c,#15803d);color:#fff;text-align:center;padding:28px 20px">
<div style="font-size:12px;letter-spacing:3px;font-weight:bold">CD BUSTARVIEJO TE CONVOCA</div>
<h1 style="margin:8px 0;font-size:26px">${junta.titulo || 'Junta General de Socios'}</h1>
<p style="margin:0">Tu voz cuenta y tu presencia es necesaria.</p></div>
<div style="padding:20px;color:#334155">
<p>Hola ${nombre || ''},</p>
<p>📅 <b>${fecha}</b>${junta.lugar ? `<br>📍 <b>${junta.lugar}</b>` : ''}</p>
${orden ? `<p><b>Lo que decidiremos juntos:</b></p><ol>${orden}</ol>` : ''}
<p>${esApp ? 'Al abrir la app del club verás el aviso de la junta: confírmanos ahí si vienes, si no puedes o si delegas tu voto.' : 'Confírmanos en este enlace si vienes, si no puedes o si delegas tu voto.'}</p>
<p style="text-align:center;margin:24px 0"><a href="${boton.url}" style="background:#ea580c;color:#fff;padding:14px 26px;border-radius:10px;text-decoration:none;font-weight:bold">${boton.texto}</a></p>
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