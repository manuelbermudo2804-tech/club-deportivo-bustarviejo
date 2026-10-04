import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const LOGO = 'https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg';
const DIAS_AVISO = 30;

const fmt = (d) => d.split('-').reverse().join('/');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let user = null;
    try { user = await base44.auth.me(); } catch { /* ejecución programada */ }
    if (user && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
    const rms = await base44.asServiceRole.entities.ReconocimientoMedico.list('-updated_date', 1000);
    let enviados = 0;

    for (const rm of rms) {
      if (!rm.fecha_vencimiento || rm.aviso_email_vencimiento === rm.fecha_vencimiento) continue;
      const dias = Math.round((new Date(rm.fecha_vencimiento + 'T00:00:00') - hoy) / 86400000);
      if (dias < 0 || dias > DIAS_AVISO) continue;

      const emails = [...new Set([rm.email_padre, rm.email_tutor_2, rm.email_jugador].filter(Boolean).map((e) => e.toLowerCase()))];
      if (!emails.length) continue;

      const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
        <div style="text-align:center"><img src="${LOGO}" alt="CD Bustarviejo" width="90"/></div>
        <h2 style="color:#ea580c">Reconocimiento médico a punto de caducar</h2>
        <p>Hola,</p>
        <p>El reconocimiento médico federativo de <b>${rm.jugador_nombre}</b> caduca el <b>${fmt(rm.fecha_vencimiento)}</b> (dentro de ${dias} días).</p>
        <p>Sin reconocimiento en vigor no puede jugar partidos. El club os facilitará la cita; cuando esté disponible la podréis descargar en la app, en <b>Firmas y Reconocimientos</b>.</p>
        <p>Gracias,<br/>CD Bustarviejo</p></div>`;

      for (const to of emails) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to, from_name: 'CD Bustarviejo',
          subject: `Reconocimiento médico de ${rm.jugador_nombre}: caduca el ${fmt(rm.fecha_vencimiento)}`,
          body: html,
        });
      }
      await base44.asServiceRole.entities.ReconocimientoMedico.update(rm.id, { aviso_email_vencimiento: rm.fecha_vencimiento });
      enviados++;
    }
    return Response.json({ ok: true, jugadores_avisados: enviados });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});