import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Solo admins pueden publicar al canal
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: solo admins' }, { status: 403 });
    }

    const { message, parse_mode = 'HTML' } = await req.json();
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Falta el mensaje' }, { status: 400 });
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const rawChannelId = Deno.env.get('TELEGRAM_CHANNEL_ID');

    if (!botToken || !rawChannelId) {
      return Response.json({ error: 'Faltan credenciales de Telegram' }, { status: 500 });
    }

    // Normalizar el chat_id: probamos varios formatos comunes
    // Si el usuario nos da "1003717753412" o "-1003717753412" o "3717753412"
    const cleaned = String(rawChannelId).trim().replace(/^-/, '');
    const candidates = [];
    if (cleaned.startsWith('100')) {
      // Formato moderno: -100XXXXXXXXXX
      candidates.push(`-${cleaned}`);
      // Formato sin el 100: -XXXXXXXXXX
      candidates.push(`-${cleaned.substring(3)}`);
    } else {
      candidates.push(`-100${cleaned}`);
      candidates.push(`-${cleaned}`);
    }

    let tgData = null;
    let usedChatId = null;
    for (const candidate of candidates) {
      const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: candidate,
          text: message,
          parse_mode,
          disable_web_page_preview: false
        })
      });
      tgData = await tgRes.json();
      console.log(`Probando chat_id=${candidate} → ok=${tgData.ok} desc=${tgData.description || 'OK'}`);
      if (tgData.ok) {
        usedChatId = candidate;
        break;
      }
    }

    if (!tgData?.ok) {
      console.error('Telegram error final:', tgData);
      return Response.json({
        error: tgData?.description || 'Error de Telegram',
        details: tgData,
        triedIds: candidates
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message_id: tgData.result?.message_id,
      channel: tgData.result?.chat?.title,
      usedChatId
    });
  } catch (error) {
    console.error('publishToTelegram error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});