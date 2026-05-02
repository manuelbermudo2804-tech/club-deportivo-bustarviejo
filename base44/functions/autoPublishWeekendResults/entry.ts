import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Publica automáticamente en Telegram los resultados del fin de semana.
// Se ejecuta los domingos por la noche.

const WA_PROMPT = `Eres el community manager del CD Bustarviejo, club de fútbol base de la Sierra Norte de Madrid.
Estilo: ENERGÉTICO, CERCANO, DE PUEBLO. Emojis con criterio. Formato perfecto para Telegram (saltos de línea claros).
- Máximo 600 caracteres
- Primera línea: emoji + título en mayúsculas (RESULTADOS)
- Datos organizados por categoría
- Si hay victorias, CELÉBRALAS. Si hay derrotas, anima al equipo
- NO uses hashtags
- Menciona "CD Bustarviejo" al menos una vez
- NO inventes nada, usa SOLO los datos que te paso`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Sábado y domingo de ESTE finde (que acaba de pasar)
    const now = new Date();
    const dow = now.getDay(); // 0=dom
    const sun = new Date(now);
    if (dow !== 0) {
      // Si no es domingo, retroceder al domingo más reciente
      sun.setDate(now.getDate() - dow);
    }
    const sat = new Date(sun); sat.setDate(sun.getDate() - 1);
    const satStr = sat.toISOString().split('T')[0];
    const sunStr = sun.toISOString().split('T')[0];

    // Recoger resultados (Resultado entity + ProximoPartido jugados)
    const [resultados, jugados] = await Promise.all([
      base44.asServiceRole.entities.Resultado.filter({ estado: 'finalizado' }, '-fecha_actualizacion', 50).catch(() => []),
      base44.asServiceRole.entities.ProximoPartido.filter({ jugado: true }, '-fecha_iso', 50).catch(() => []),
    ]);

    // Filtrar los del finde
    const resFinde = resultados.filter(r => {
      if (!r.fecha_actualizacion) return false;
      const d = r.fecha_actualizacion.split('T')[0];
      return d >= satStr && d <= sunStr;
    });
    const jugFinde = jugados.filter(p => p.fecha_iso >= satStr && p.fecha_iso <= sunStr);

    if (resFinde.length === 0 && jugFinde.length === 0) {
      console.log('No hay resultados este finde, no se publica nada');
      return Response.json({ success: true, skipped: true, reason: 'no_results' });
    }

    // Construir contexto
    let datos = '';
    resFinde.forEach(r => {
      datos += `${r.categoria} J${r.jornada || '?'}: ${r.local} ${r.goles_local ?? '?'} - ${r.goles_visitante ?? '?'} ${r.visitante}\n`;
    });
    jugFinde.forEach(p => {
      datos += `${p.categoria}: ${p.local} ${p.goles_local ?? '?'} - ${p.goles_visitante ?? '?'} ${p.visitante}\n`;
    });

    // Generar con IA
    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${WA_PROMPT}\n\nTIPO: Resultados del fin de semana\n\nDATOS:\n${datos}\n\nGenera el mensaje de Telegram:`,
    });
    const message = typeof aiResult === 'string' ? aiResult : JSON.stringify(aiResult);

    // Publicar en Telegram (directo, sin pasar por publishToTelegram que requiere user admin)
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
    const tgRes = { data: { success: tgOk } };

    // Guardar historial
    await base44.asServiceRole.entities.SocialPost.create({
      tipo: 'resultados',
      titulo: '📊 Resultados del Finde (auto)',
      contenido_whatsapp: message,
      enviado_whatsapp: false,
      datos_origen: datos.substring(0, 2000),
      creado_por: 'automation@cdbustarviejo.com',
    }).catch(() => {});

    return Response.json({
      success: true,
      resultados: resFinde.length + jugFinde.length,
      telegram: tgRes?.data?.success || false
    });
  } catch (error) {
    console.error('autoPublishWeekendResults error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});