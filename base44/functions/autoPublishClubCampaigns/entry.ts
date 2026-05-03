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

    // 3. San Isidro (deadline fijo: 15 de mayo del año en curso)
    const año = new Date().getFullYear();
    const sanIsidroDeadline = new Date(`${año}-05-15T23:59:59`);
    const diasSanIsidro = Math.ceil((sanIsidroDeadline - new Date()) / (1000 * 60 * 60 * 24));
    if (diasSanIsidro >= 0 && diasSanIsidro <= 30) {
      const urgencia = diasSanIsidro <= 3 ? '🚨 ÚLTIMOS DÍAS' : diasSanIsidro <= 7 ? '⏰ Recta final' : '🎯 Apúntate ya';
      campañas.push({
        tipo: 'sanisidro',
        titulo: '🎯 Torneo San Isidro CD Bustarviejo',
        datos: `${urgencia} — Torneo San Isidro CD Bustarviejo\nFecha límite inscripción: 15 de mayo (${diasSanIsidro} días)\nVen al campo a animar y participar\nFútbol Chapa + 3vs3 (niños y jóvenes)\nInscripciones: ${ORIGIN}/SanIsidro`,
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

    // Publicar vía publishToTelegramAdvanced (patrocinador + redes)
    const safeMsg = message.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const tgRes = await base44.asServiceRole.functions.invoke('publishToTelegramAdvanced', {
      message: safeMsg,
      parse_mode: 'HTML',
    }).catch(err => ({ data: { success: false, error: err.message } }));
    const tgOk = tgRes?.data?.success === true;

    await base44.asServiceRole.entities.SocialPost.create({
      tipo: `${elegida.tipo}_auto`,
      titulo: `${elegida.titulo} (auto)`,
      contenido_whatsapp: message,
      enviado_telegram: tgOk,
      telegram_message_id: String(tgRes?.data?.message_id || ''),
      datos_origen: elegida.datos.substring(0, 2000),
      creado_por: 'automation@cdbustarviejo.com',
    }).catch(() => {});

    return Response.json({ success: true, campaña: elegida.tipo, telegram: tgOk });
  } catch (error) {
    console.error('autoPublishClubCampaigns error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});