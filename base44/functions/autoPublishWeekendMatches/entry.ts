import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Publica automáticamente en Telegram los partidos del fin de semana.
// Se ejecuta los viernes por la tarde.

const WA_PROMPT = `Eres el community manager del CD Bustarviejo, club de fútbol base de la Sierra Norte de Madrid.
Estilo: ENERGÉTICO, CERCANO, DE PUEBLO. Emojis con criterio. Formato perfecto para Telegram (saltos de línea claros).
- Máximo 600 caracteres
- Primera línea: emoji + título en mayúsculas
- Datos organizados por categoría
- Cierre motivador
- NO uses hashtags
- Menciona "CD Bustarviejo" al menos una vez
- NO inventes nada, usa SOLO los datos que te paso`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Calcular sábado y domingo de esta semana
    const now = new Date();
    const dow = now.getDay(); // 0=dom, 5=vie, 6=sab
    const sat = new Date(now); sat.setDate(now.getDate() + ((6 - dow + 7) % 7 || 7));
    const sun = new Date(sat); sun.setDate(sat.getDate() + 1);
    const satStr = sat.toISOString().split('T')[0];
    const sunStr = sun.toISOString().split('T')[0];

    // Recoger partidos
    const [partidos, convos] = await Promise.all([
      base44.asServiceRole.entities.ProximoPartido.filter({ jugado: false }, 'fecha_iso', 100).catch(() => []),
      base44.asServiceRole.entities.Convocatoria.filter({ publicada: true, cerrada: false }, '-fecha_partido', 50).catch(() => []),
    ]);

    const pf = partidos.filter(p => p.fecha_iso >= satStr && p.fecha_iso <= sunStr);
    const cf = convos.filter(c => c.fecha_partido >= satStr && c.fecha_partido <= sunStr);

    if (pf.length === 0 && cf.length === 0) {
      console.log('No hay partidos este finde, no se publica nada');
      return Response.json({ success: true, skipped: true, reason: 'no_matches' });
    }

    // Construir el contexto de datos
    let datos = '';
    pf.forEach(p => {
      datos += `${p.categoria}: ${p.local} vs ${p.visitante} | ${p.fecha} ${p.hora || ''} | Campo: ${p.campo || '?'}\n`;
    });
    cf.forEach(c => {
      datos += `${c.categoria}: ${c.titulo} | ${c.fecha_partido} ${c.hora_partido} | ${c.ubicacion} | ${c.local_visitante || ''}\n`;
    });

    // Generar mensaje con IA
    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${WA_PROMPT}\n\nTIPO: Partidos del fin de semana\n\nDATOS:\n${datos}\n\nGenera el mensaje de Telegram:`,
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

    // Guardar en historial
    await base44.asServiceRole.entities.SocialPost.create({
      tipo: 'partidos_finde',
      titulo: '⚽ Partidos del Finde (auto)',
      contenido_whatsapp: message,
      enviado_whatsapp: false,
      datos_origen: datos.substring(0, 2000),
      creado_por: 'automation@cdbustarviejo.com',
    }).catch(() => {});

    return Response.json({
      success: true,
      partidos: pf.length + cf.length,
      telegram: tgRes?.data?.success || false
    });
  } catch (error) {
    console.error('autoPublishWeekendMatches error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});