import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Publica automáticamente en Telegram las clasificaciones actuales del CD Bustarviejo.
// Se ejecuta los lunes por la mañana (tras la sync RFFM).

const PROMPT = `Eres el community manager del CD Bustarviejo, club de fútbol base de la Sierra Norte de Madrid.
Estilo: ENERGÉTICO, CERCANO, DE PUEBLO. Emojis con criterio. Formato perfecto para Telegram (saltos de línea claros).
- Máximo 700 caracteres
- Primera línea: emoji + título en mayúsculas (CLASIFICACIONES)
- Datos organizados por categoría: posición de Bustarviejo, puntos, balance G-E-P
- Tono que celebre los buenos puestos y motive a los demás
- NO uses hashtags
- Menciona "CD Bustarviejo" al menos una vez
- NO inventes nada, usa SOLO los datos que te paso`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const cls = await base44.asServiceRole.entities.Clasificacion.list('-fecha_actualizacion', 300).catch(() => []);
    if (!cls.length) {
      console.log('No hay clasificaciones cargadas');
      return Response.json({ success: true, skipped: true, reason: 'no_data' });
    }

    // Agrupar por categoría
    const byCat = {};
    cls.forEach(c => {
      if (!byCat[c.categoria]) byCat[c.categoria] = [];
      byCat[c.categoria].push(c);
    });

    let datos = '';
    Object.entries(byCat).forEach(([cat, equipos]) => {
      const bv = equipos.find(e => /bustarviejo/i.test(e.nombre_equipo || ''));
      if (bv) {
        datos += `${cat}: ${bv.posicion}º con ${bv.puntos} pts (${bv.ganados || 0}G ${bv.empatados || 0}E ${bv.perdidos || 0}P)\n`;
      }
    });

    if (!datos.trim()) {
      console.log('No se encontraron equipos del Bustarviejo');
      return Response.json({ success: true, skipped: true, reason: 'no_bustarviejo' });
    }

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${PROMPT}\n\nTIPO: Clasificaciones semanales\n\nDATOS:\n${datos}\n\nGenera el mensaje de Telegram:`,
    });
    const message = typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult);

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const rawChannelId = Deno.env.get('TELEGRAM_CHANNEL_ID');
    const cleaned = String(rawChannelId).trim().replace(/^-/, '');
    const candidates = cleaned.startsWith('100')
      ? [`-${cleaned}`, `-${cleaned.substring(3)}`]
      : [`-100${cleaned}`, `-${cleaned}`];

    const safeMsg = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    let tgOk = false;
    for (const candidate of candidates) {
      const r = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: candidate, text: safeMsg, parse_mode: 'HTML', disable_web_page_preview: false })
      });
      const d = await r.json();
      if (d.ok) { tgOk = true; break; }
      console.log(`Telegram failed for ${candidate}: ${d.description}`);
    }

    await base44.asServiceRole.entities.SocialPost.create({
      tipo: 'clasificaciones',
      titulo: '📊 Clasificaciones semanales (auto)',
      contenido_whatsapp: message,
      enviado_telegram: tgOk,
      datos_origen: datos.substring(0, 2000),
      creado_por: 'automation@cdbustarviejo.com',
    }).catch(() => {});

    return Response.json({ success: true, telegram: tgOk });
  } catch (error) {
    console.error('autoPublishStandings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});