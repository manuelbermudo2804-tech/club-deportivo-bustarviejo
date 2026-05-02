import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Versión avanzada: soporta texto, imagen (sendPhoto) y patrocinadores rotativos.
// Usa parse_mode HTML (mejor compatibilidad que MarkdownV2 para nuestro caso).

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: solo admins' }, { status: 403 });
    }

    const { message, image_url = null, parse_mode = 'HTML', skip_sponsor = false, skip_socials = false } = await req.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Falta el mensaje' }, { status: 400 });
    }

    const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    let finalMessage = message;
    let sponsorUsed = null;

    // ─── Patrocinador rotativo ───
    if (!skip_sponsor) {
      try {
        const allSponsors = await base44.asServiceRole.entities.Sponsor.filter({ activo: true });
        const eligible = (allSponsors || []).filter(s => ['Principal', 'Oro', 'Plata'].includes(s.nivel_patrocinio));
        if (eligible.length > 0) {
          const sponsor = eligible[Math.floor(Math.random() * eligible.length)];
          sponsorUsed = sponsor.nombre;
          const tierEmoji = sponsor.nivel_patrocinio === 'Principal' ? '👑' : sponsor.nivel_patrocinio === 'Oro' ? '🥇' : '🥈';
          const tierLabel = sponsor.nivel_patrocinio === 'Principal' ? 'Patrocinador Principal' : `Patrocinador ${sponsor.nivel_patrocinio}`;

          if (parse_mode === 'HTML') {
            const nameSafe = escapeHtml(sponsor.nombre);
            const sponsorBlock = sponsor.website_url
              ? `\n\n━━━━━━━━━━━━━━\n${tierEmoji} <b>${tierLabel}</b>\n<a href="${escapeHtml(sponsor.website_url)}">${nameSafe}</a> 🤝`
              : `\n\n━━━━━━━━━━━━━━\n${tierEmoji} <b>${tierLabel}</b>\n${nameSafe} 🤝`;
            finalMessage += sponsorBlock;
          } else {
            finalMessage += `\n\n━━━━━━━━━━━━━━\n${tierEmoji} ${tierLabel}\n${sponsor.nombre} 🤝`;
          }
        }
      } catch (sponsorErr) {
        console.warn('No se pudo añadir patrocinador:', sponsorErr.message);
      }
    }

    // ─── Iconos de redes sociales ───
    if (!skip_socials) {
      if (parse_mode === 'HTML') {
        finalMessage += `\n\n<a href="https://www.cdbustarviejo.com">🌐 Web</a> · <a href="https://www.instagram.com/cdbustarviejo">📸 Instagram</a> · <a href="https://es-es.facebook.com/ilustrisimo.deportivobustarviejo">👍 Facebook</a>`;
      } else {
        finalMessage += `\n\n🌐 cdbustarviejo.com · 📸 @cdbustarviejo · 👍 Facebook`;
      }
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const rawChannelId = Deno.env.get('TELEGRAM_CHANNEL_ID');
    if (!botToken || !rawChannelId) {
      return Response.json({ error: 'Faltan credenciales de Telegram' }, { status: 500 });
    }

    // Normalizar chat_id
    const cleaned = String(rawChannelId).trim().replace(/^-/, '');
    const candidates = [];
    if (cleaned.startsWith('100')) {
      candidates.push(`-${cleaned}`);
      candidates.push(`-${cleaned.substring(3)}`);
    } else {
      candidates.push(`-100${cleaned}`);
      candidates.push(`-${cleaned}`);
    }

    // Telegram limita captions a 1024 chars. Si tenemos imagen y el texto es largo,
    // mandamos foto + caption corto y luego el texto completo en mensaje aparte.
    const MAX_CAPTION = 1024;
    const useImage = !!image_url;
    const splitMode = useImage && finalMessage.length > MAX_CAPTION;

    let tgData = null;
    let usedChatId = null;
    let messageIdsSent = [];

    for (const candidate of candidates) {
      messageIdsSent = [];

      if (useImage) {
        // 1) Mandar foto (con caption si cabe, sin caption si no cabe)
        const caption = splitMode ? '' : finalMessage;
        const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: candidate,
            photo: image_url,
            caption,
            parse_mode: caption ? parse_mode : undefined,
          })
        });
        tgData = await photoRes.json();
        if (!tgData.ok) continue;
        messageIdsSent.push(tgData.result?.message_id);

        // 2) Si era split, mandamos el texto completo después
        if (splitMode) {
          const textRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: candidate,
              text: finalMessage,
              parse_mode,
              disable_web_page_preview: true,
            })
          });
          const textData = await textRes.json();
          if (textData.ok) messageIdsSent.push(textData.result?.message_id);
        }

        usedChatId = candidate;
        break;
      } else {
        // Solo texto
        const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: candidate,
            text: finalMessage,
            parse_mode,
            disable_web_page_preview: false,
          })
        });
        tgData = await tgRes.json();
        if (tgData.ok) {
          usedChatId = candidate;
          messageIdsSent.push(tgData.result?.message_id);
          break;
        }
      }
    }

    if (!tgData?.ok || !usedChatId) {
      return Response.json({
        error: tgData?.description || 'Error de Telegram',
        details: tgData,
        triedIds: candidates,
      }, { status: 500 });
    }

    return Response.json({
      success: true,
      message_ids: messageIdsSent,
      message_id: messageIdsSent[0],
      channel: tgData.result?.chat?.title,
      usedChatId,
      sponsorUsed,
      withImage: useImage,
    });
  } catch (error) {
    console.error('publishToTelegramAdvanced error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});