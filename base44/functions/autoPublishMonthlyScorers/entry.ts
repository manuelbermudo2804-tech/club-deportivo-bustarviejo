import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Publica automáticamente en Telegram el ranking de goleadores por categoría.
// Se ejecuta el día 1 de cada mes.

const PROMPT = `Eres el community manager del CD Bustarviejo, club de fútbol base de la Sierra Norte de Madrid.
Estilo: ENERGÉTICO, CERCANO, DE PUEBLO. Emojis con criterio. Formato perfecto para Telegram.
- Máximo 700 caracteres
- Primera línea: emoji + título en mayúsculas (GOLEADORES DEL CLUB)
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

    // Publicar vía publishToTelegramAdvanced (patrocinador + redes)
    const safeMsg = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tgRes = await base44.asServiceRole.functions.invoke('publishToTelegramAdvanced', {
      message: safeMsg,
      parse_mode: 'HTML',
    }).catch(err => ({ data: { success: false, error: err.message } }));
    const tgOk = tgRes?.data?.success === true;

    await base44.asServiceRole.entities.SocialPost.create({
      tipo: 'goleadores_auto',
      titulo: '⚡ Goleadores del club (auto)',
      contenido_whatsapp: message,
      enviado_telegram: tgOk,
      telegram_message_id: String(tgRes?.data?.message_id || ''),
      datos_origen: datos.substring(0, 2000),
      creado_por: 'automation@cdbustarviejo.com',
    }).catch(() => {});

    return Response.json({ success: true, telegram: tgOk });
  } catch (error) {
    console.error('autoPublishMonthlyScorers error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});