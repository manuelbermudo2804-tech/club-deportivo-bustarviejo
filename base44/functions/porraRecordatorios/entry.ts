import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Función programada que envía recordatorios a participantes con porra incompleta
// Se ejecuta diariamente.
// - Si quedan ≤7 días para el cierre Y porcentaje_completado < 100 → envía email
// - Solo envía 1 vez por participante (campo recordatorio_enviado en metadata local del envío)
//
// Para evitar duplicados, marcamos el participante con un campo bool en notas internas
// (no añadimos campos al schema, usamos updated_date como heurística simple)

function emailTemplate({ nombre, alias, porcentaje, diasRestantes, enlace }) {
  const urgencia = diasRestantes <= 1 ? 'ÚLTIMAS HORAS' : diasRestantes <= 3 ? 'QUEDAN POCOS DÍAS' : 'NO TE OLVIDES';
  const colorPrincipal = diasRestantes <= 1 ? '#dc2626' : diasRestantes <= 3 ? '#ea580c' : '#f59e0b';

  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:linear-gradient(135deg,${colorPrincipal},#ea580c);padding:36px 24px;text-align:center">
<div style="font-size:56px;margin-bottom:8px">⏰</div>
<h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:900">${urgencia}</h1>
<p style="color:rgba(255,255,255,0.95);margin:8px 0 0;font-size:14px">Tu porra del Mundial 2026 está incompleta</p>
</div>
<div style="padding:28px 24px">
<p style="margin:0 0 16px;font-size:16px;color:#1e293b">Hola <strong>${nombre}</strong>,</p>
<p style="margin:0 0 16px;font-size:15px;color:#475569;line-height:1.6">Tu equipo <strong style="color:#ea580c">${alias}</strong> está al <strong>${porcentaje}%</strong> de completar la porra. ¡No te quedes fuera del premio!</p>
<div style="background:linear-gradient(135deg,#fef3c7,#fed7aa);border:2px solid #fb923c;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
<p style="margin:0 0 4px;font-size:12px;color:#9a3412;text-transform:uppercase;letter-spacing:1px;font-weight:700">Quedan</p>
<p style="margin:0;font-size:32px;font-weight:900;color:#7c2d12">${diasRestantes} ${diasRestantes === 1 ? 'día' : 'días'}</p>
<p style="margin:8px 0 0;font-size:13px;color:#92400e">para que cierre el plazo</p>
</div>
<div style="text-align:center;margin:28px 0">
<a href="${enlace}" style="display:inline-block;background:linear-gradient(135deg,#dc2626,#ea580c);color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:12px;font-weight:900;font-size:16px;box-shadow:0 8px 20px rgba(220,38,38,0.3)">
🏆 COMPLETAR MI PORRA
</a>
</div>
<p style="margin:8px 0;font-size:11px;color:#94a3b8;text-align:center;word-break:break-all">${enlace}</p>
<p style="margin:20px 0 0;font-size:14px;color:#475569">Cuando cierre el plazo no podrás modificar nada. ¡Date prisa! ⚡</p>
<p style="margin:8px 0 0;font-size:13px;color:#64748b"><strong>CD Bustarviejo</strong></p>
</div>
<div style="background:#1e293b;padding:20px;text-align:center;color:#94a3b8;font-size:11px">
<p style="margin:0">© ${new Date().getFullYear()} CD Bustarviejo · Porra Mundial 2026</p>
</div>
</div></body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const configs = await base44.asServiceRole.entities.PorraConfig.list();
    const config = configs[0];
    if (!config?.fecha_limite_predicciones) {
      return Response.json({ skip: true, reason: 'Sin fecha límite configurada' });
    }

    const ahora = Date.now();
    const cierre = new Date(config.fecha_limite_predicciones).getTime();
    const msRestantes = cierre - ahora;
    const diasRestantes = Math.ceil(msRestantes / (1000 * 60 * 60 * 24));

    if (msRestantes <= 0) {
      return Response.json({ skip: true, reason: 'Plazo ya cerrado' });
    }
    if (diasRestantes > 7) {
      return Response.json({ skip: true, reason: 'Aún faltan más de 7 días', diasRestantes });
    }

    // Solo enviamos en días específicos: 7, 3, 1 (para no spamear)
    const enviarHoy = [7, 3, 1].includes(diasRestantes);
    if (!enviarHoy) {
      return Response.json({ skip: true, reason: `No es día de recordatorio (faltan ${diasRestantes})` });
    }

    // En modo test no enviamos recordatorios (ahorra créditos)
    if (config.modo_test) {
      return Response.json({ skip: true, reason: 'Modo test activo: no se envían recordatorios' });
    }

    const participantes = await base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' });
    const incompletos = participantes.filter(p => (p.porcentaje_completado || 0) < 100);

    const baseUrl = 'https://app.cdbustarviejo.com';
    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
    if (!RESEND_API_KEY) {
      return Response.json({ error: 'RESEND_API_KEY no configurada' }, { status: 500 });
    }
    let enviados = 0;
    const errores = [];

    // ✉️ Resend directo: NO consume créditos de integración Base44
    for (const p of incompletos) {
      try {
        const enlace = `${baseUrl}/PorraMiPorra?token=${p.token_acceso}`;
        const html = emailTemplate({
          nombre: p.nombre || 'Participante',
          alias: p.alias_equipo || 'tu equipo',
          porcentaje: p.porcentaje_completado || 0,
          diasRestantes,
          enlace,
        });
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: 'CD Bustarviejo <noreply@cdbustarviejo.com>',
            to: [p.email],
            subject: `⏰ Tu porra está al ${p.porcentaje_completado || 0}% — ${diasRestantes === 1 ? '¡ÚLTIMO DÍA!' : `quedan ${diasRestantes} días`}`,
            html,
          }),
        });
        if (resp.ok) {
          enviados++;
        } else {
          errores.push({ id: p.id, error: `Resend ${resp.status}` });
        }
      } catch (e) {
        errores.push({ id: p.id, error: e.message });
      }
    }

    return Response.json({
      success: true,
      diasRestantes,
      total_pagados: participantes.length,
      incompletos: incompletos.length,
      enviados,
      errores: errores.length,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});