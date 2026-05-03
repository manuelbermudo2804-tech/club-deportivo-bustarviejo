import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Publica automáticamente en Telegram el ranking de goleadores por categoría.
// Se ejecuta el día 1 de cada mes.

const PROMPT = `Eres el community manager del CD Bustarviejo, club de fútbol base de la Sierra Norte de Madrid.
Estilo: ENERGÉTICO, CERCANO, DE PUEBLO. Emojis con criterio. Formato perfecto para Telegram.
- Máximo 700 caracteres
- Primera línea: emoji + título en mayúsculas (GOLEADORES DEL MES / DEL CLUB)
- Datos organizados por categoría con TOP 3 de cada una
- Reconocer el esfuerzo de los goleadores
- NO uses hashtags
- Menciona "CD Bustarviejo" al menos una vez
- NO inventes nada, usa SOLO los datos que te paso`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const gols = await base44.asServiceRole.entities.Goleador.list('-goles', 200).catch(() => []);
    if (!gols.length) {
      console.log('No hay goleadores cargados');
      return Response.json({ success: true, skipped: true, reason: 'no_data' });
    }

    // Filtrar solo Bustarviejo y agrupar por categoría
    const byCat = {};
    gols.forEach(g => {
      if (!/bustarviejo/i.test(g.equipo || '')) return;
      if (!byCat[g.categoria]) byCat[g.categoria] = [];
      byCat[g.categoria].push(g);
    });

    let datos = '';
    Object.entries(byCat).forEach(([cat, list]) => {
      const top = list.sort((a, b) => b.goles - a.goles).slice(0, 3);
      if (top.length) {
        datos += `${cat}:\n`;
        top.forEach((g, i) => { datos += `  ${i + 1}. ${g.jugador_nombre} — ${g.goles} goles\n`; });
        datos += `\n`;
      }
    });

    if (!datos.trim()) {
      console.log('No se encontraron goleadores del Bustarviejo');
      return Response.json({ success: true, skipped: true, reason: 'no_bustarviejo' });
    }

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${PROMPT}\n\nTIPO: Goleadores del club\n\nDATOS:\n${datos}\n\nGenera el mensaje de Telegram:`,
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
      tipo: 'goleadores',
      titulo: '⚡ Goleadores del mes (auto)',
      contenido_whatsapp: message,
      enviado_telegram: tgOk,
      datos_origen: datos.substring(0, 2000),
      creado_por: 'automation@cdbustarviejo.com',
    }).catch(() => {});

    return Response.json({ success: true, telegram: tgOk });
  } catch (error) {
    console.error('autoPublishMonthlyScorers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});