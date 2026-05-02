import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Cron job: revisa SocialPost programados cuya fecha ya pasó y los publica en Telegram.
// Ejecutado cada 5 min por automatización.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Solo admin manualmente o cron interno (con role admin via service role)
    const user = await base44.auth.me().catch(() => null);
    const isAutomation = !user; // automation calls have no user
    if (user && user.role !== 'admin' && !isAutomation) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const now = new Date().toISOString();
    const pending = await base44.asServiceRole.entities.SocialPost.filter({
      programado: true,
      estado_programacion: 'pendiente',
    });

    const due = (pending || []).filter(p => p.fecha_programada && p.fecha_programada <= now);

    if (due.length === 0) {
      return Response.json({ success: true, processed: 0, message: 'No hay publicaciones pendientes' });
    }

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const rawChannelId = Deno.env.get('TELEGRAM_CHANNEL_ID');
    if (!botToken || !rawChannelId) {
      return Response.json({ error: 'Faltan credenciales Telegram' }, { status: 500 });
    }

    const escapeHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const cleaned = String(rawChannelId).trim().replace(/^-/, '');
    const candidates = cleaned.startsWith('100')
      ? [`-${cleaned}`, `-${cleaned.substring(3)}`]
      : [`-100${cleaned}`, `-${cleaned}`];

    const results = [];

    for (const post of due) {
      try {
        let finalMessage = post.contenido_whatsapp || '';

        // Patrocinador rotativo
        try {
          const allSponsors = await base44.asServiceRole.entities.Sponsor.filter({ activo: true });
          const eligible = (allSponsors || []).filter(s => ['Principal', 'Oro', 'Plata'].includes(s.nivel_patrocinio));
          if (eligible.length > 0) {
            const sp = eligible[Math.floor(Math.random() * eligible.length)];
            const emoji = sp.nivel_patrocinio === 'Principal' ? '👑' : sp.nivel_patrocinio === 'Oro' ? '🥇' : '🥈';
            const label = sp.nivel_patrocinio === 'Principal' ? 'Patrocinador Principal' : `Patrocinador ${sp.nivel_patrocinio}`;
            const nameSafe = escapeHtml(sp.nombre);
            finalMessage += sp.website_url
              ? `\n\n━━━━━━━━━━━━━━\n${emoji} <b>${label}</b>\n<a href="${escapeHtml(sp.website_url)}">${nameSafe}</a> 🤝`
              : `\n\n━━━━━━━━━━━━━━\n${emoji} <b>${label}</b>\n${nameSafe} 🤝`;
          }
        } catch {}

        finalMessage += `\n\n<a href="https://www.cdbustarviejo.com">🌐 Web</a> · <a href="https://www.instagram.com/cdbustarviejo">📸 Instagram</a> · <a href="https://es-es.facebook.com/ilustrisimo.deportivobustarviejo">👍 Facebook</a>`;

        let sent = false;
        let messageId = null;

        for (const chatId of candidates) {
          let tgData = null;
          if (post.imagen_url) {
            const MAX_CAPTION = 1024;
            const splitMode = finalMessage.length > MAX_CAPTION;
            const photoRes = await fetch(`https://api.telegram.org/bot${botToken}/sendPhoto`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                chat_id: chatId,
                photo: post.imagen_url,
                caption: splitMode ? '' : finalMessage,
                parse_mode: splitMode ? undefined : 'HTML',
              })
            });
            tgData = await photoRes.json();
            if (tgData.ok && splitMode) {
              await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId, text: finalMessage, parse_mode: 'HTML', disable_web_page_preview: true })
              });
            }
          } else {
            const tgRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ chat_id: chatId, text: finalMessage, parse_mode: 'HTML', disable_web_page_preview: false })
            });
            tgData = await tgRes.json();
          }
          if (tgData?.ok) {
            sent = true;
            messageId = tgData.result?.message_id?.toString();
            break;
          }
        }

        await base44.asServiceRole.entities.SocialPost.update(post.id, {
          estado_programacion: sent ? 'publicado' : 'fallido',
          enviado_telegram: sent,
          telegram_message_id: messageId,
        });

        results.push({ id: post.id, titulo: post.titulo, sent });
      } catch (err) {
        console.error(`Error publicando post ${post.id}:`, err.message);
        await base44.asServiceRole.entities.SocialPost.update(post.id, {
          estado_programacion: 'fallido',
        }).catch(() => {});
        results.push({ id: post.id, sent: false, error: err.message });
      }
    }

    return Response.json({ success: true, processed: results.length, results });
  } catch (error) {
    console.error('scheduledTelegramPublisher error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});