import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Publica automáticamente en Telegram las campañas activas del club:
// San Isidro, Lotería de Navidad y Captación de Patrocinadores.
// Solo publica si hay alguna campaña abierta y con fecha límite cercana o relevante.
// Se ejecuta los miércoles por la tarde.

const ORIGIN = 'https://app.cdbustarviejo.com';

const PROMPT = `Eres el community manager del CD Bustarviejo, club de fútbol base de la Sierra Norte de Madrid.
Estilo: CERCANO, DE PUEBLO, MOTIVADOR. Emojis con criterio. Formato perfecto para Telegram.
- Máximo 700 caracteres
- Primera línea: emoji + título en mayúsculas
- Llamada a la acción CLARA con el enlace
- Si hay cuenta atrás, recalcarla (urgencia sin agobiar)
- NO uses hashtags
- Menciona "CD Bustarviejo"
- NO inventes nada, usa SOLO los datos que te paso`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const sc = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true }).catch(() => []);
    const config = sc[0] || {};

    // Detectar campañas abiertas
    const campañas = [];

    // 1. Lotería
    if (config.loteria_navidad_abierta) {
      campañas.push({
        tipo: 'loteria',
        titulo: '🎟️ Lotería de Navidad CD Bustarviejo',
        datos: `Lotería de Navidad ABIERTA\nPrecio: ${config.precio_decimo_loteria || 22}€/décimo\nReserva tu décimo: ${ORIGIN}/ParentLottery`,
      });
    }

    // 2. Patrocinadores
    if (config.fecha_limite_patrocinios) {
      const limite = new Date(config.fecha_limite_patrocinios);
      const dias = Math.ceil((limite - new Date()) / (1000 * 60 * 60 * 24));
      if (dias >= 0 && dias <= 60) {
        campañas.push({
          tipo: 'patrocinadores',
          titulo: '🤝 Patrocinadores CD Bustarviejo',
          datos: `Captación de patrocinadores ABIERTA\nFecha límite: ${config.fecha_limite_patrocinios} (${dias} días)\nPaquetes: Bronce, Plata, Oro y Principal\nMás info: ${ORIGIN}/Patrocinadores`,
        });
      }
    }

    // 3. San Isidro (si hay registros recientes en SeasonConfig o si lo activamos manual)
    // Buscamos si existen inscripciones del año actual = campaña activa
    const yearStart = new Date(); yearStart.setMonth(0); yearStart.setDate(1);
    const sanIsidroRegs = await base44.asServiceRole.entities.SanIsidroRegistration.filter({}, '-created_date', 5).catch(() => []);
    const recientes = sanIsidroRegs.filter(r => new Date(r.created_date) >= yearStart);
    if (recientes.length > 0) {
      campañas.push({
        tipo: 'sanisidro',
        titulo: '🎯 Torneo San Isidro CD Bustarviejo',
        datos: `Torneo San Isidro abierto\nApúntate o apunta a tu peque\nInscripciones: ${ORIGIN}/SanIsidro`,
      });
    }

    if (campañas.length === 0) {
      console.log('No hay campañas abiertas, no se publica nada');
      return Response.json({ success: true, skipped: true, reason: 'no_campaigns' });
    }

    // Elegir UNA campaña por publicación (rotando por semana del año)
    const weekNum = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
    const elegida = campañas[weekNum % campañas.length];

    const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `${PROMPT}\n\nTIPO: ${elegida.titulo}\n\nDATOS:\n${elegida.datos}\n\nGenera el mensaje de Telegram:`,
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
      tipo: elegida.tipo,
      titulo: `${elegida.titulo} (auto)`,
      contenido_whatsapp: message,
      enviado_telegram: tgOk,
      datos_origen: elegida.datos.substring(0, 2000),
      creado_por: 'automation@cdbustarviejo.com',
    }).catch(() => {});

    return Response.json({ success: true, campaña: elegida.tipo, telegram: tgOk });
  } catch (error) {
    console.error('autoPublishClubCampaigns error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});