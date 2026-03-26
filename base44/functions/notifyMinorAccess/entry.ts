import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const SOCIAL_FOOTER = `<div style="background:#1e293b;padding:24px;text-align:center;border-radius:0 0 12px 12px;margin-top:24px;"><div style="margin-bottom:12px;"><a href="https://www.cdbustarviejo.com" style="display:inline-block;background:#ea580c;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;padding:10px 24px;border-radius:8px;">🌐 www.cdbustarviejo.com</a></div><div style="margin-bottom:14px;"><a href="https://www.facebook.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Facebook">📘</a><a href="https://www.instagram.com/cdbustarviejo" style="display:inline-block;margin:0 6px;text-decoration:none;font-size:22px;" title="Instagram">📸</a></div><div style="color:#94a3b8;font-size:12px;line-height:1.6;"><strong style="color:#f8fafc;">CD Bustarviejo</strong><br><a href="mailto:info@cdbustarviejo.com" style="color:#fb923c;text-decoration:none;">info@cdbustarviejo.com</a></div></div>`;

function injectFooter(html) {
  if (html.includes('www.cdbustarviejo.com')) return html;
  if (html.includes('</body>')) return html.replace('</body>', SOCIAL_FOOTER + '</body>');
  return html + SOCIAL_FOOTER;
}

async function sendViaResend(to, subject, html) {
  const key = Deno.env.get('RESEND_API_KEY');
  if (!key) { console.error('[RESEND] API key not set'); return; }
  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'CD Bustarviejo <noreply@cdbustarviejo.com>', to: [to], subject, html: injectFooter(html) })
  });
  if (!resp.ok) console.error(`[RESEND] Error ${resp.status}:`, await resp.text().catch(() => ''));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all active players
    const players = await base44.asServiceRole.entities.Player.filter({ activo: true });

    const today = new Date();
    const notified = [];

    for (const player of players) {
      if (!player.fecha_nacimiento || !player.email_padre) continue;

      // Skip if already has juvenile access authorized or revoked
      if (player.acceso_menor_autorizado || player.acceso_menor_revocado) continue;
      // Skip if already has an email set (parent already dealt with it)
      if (player.acceso_menor_email) continue;

      const birth = new Date(player.fecha_nacimiento);
      const thirteenthBirthday = new Date(birth.getFullYear() + 13, birth.getMonth(), birth.getDate());

      // Calculate days until 13th birthday
      const diffMs = thirteenthBirthday.getTime() - today.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      // Notify: 7 days before, on the day, or up to 3 days after (in case they just turned 13)
      if (diffDays > 7 || diffDays < -3) continue;

      // Check age is actually going to be 13 (not already older)
      let currentAge = today.getFullYear() - birth.getFullYear();
      const m = today.getMonth() - birth.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) currentAge--;
      if (currentAge > 13) continue; // Already older, skip

      // Check if we already notified recently (use player field)
      if (player.acceso_menor_notificado_fecha) {
        const lastNotif = new Date(player.acceso_menor_notificado_fecha);
        const daysSinceNotif = Math.round((today.getTime() - lastNotif.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceNotif < 30) continue; // Don't spam - max once per month
      }

      const CLUB_LOGO = "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg";
      const cumpleTexto = diffDays > 0
        ? `cumplirá 13 años en ${diffDays} día${diffDays === 1 ? '' : 's'}`
        : diffDays === 0
          ? `cumple 13 años hoy`
          : `ha cumplido 13 años hace ${Math.abs(diffDays)} día${Math.abs(diffDays) === 1 ? '' : 's'}`;

      // Send email to parent
      await sendViaResend(player.email_padre, `📱 ${player.nombre} ${cumpleTexto} - Acceso juvenil disponible`, `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:24px;font-family:Arial,Helvetica,sans-serif;background:#f1f5f9;">
<table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;">
<tr>
<td style="background:linear-gradient(135deg,#ea580c,#c2410c);padding:24px;text-align:center;">
  <img src="${CLUB_LOGO}" alt="CD Bustarviejo" width="64" height="64" style="border-radius:12px;border:3px solid #fff" />
  <h1 style="color:#fff;margin:12px 0 0;font-size:20px;">CD Bustarviejo</h1>
</td>
</tr>
<tr>
<td style="padding:28px;">
  <h2 style="margin:0 0 16px;color:#0f172a;font-size:20px;">📱 Acceso juvenil disponible para ${player.nombre}</h2>
  
  <p style="color:#334155;font-size:14px;line-height:1.6;">
    ¡Hola! Te escribimos porque <strong>${player.nombre}</strong> ${cumpleTexto}.
  </p>
  
  <p style="color:#334155;font-size:14px;line-height:1.6;">
    A partir de los 13 años, los jugadores pueden tener su <strong>propio acceso a la app del club</strong> con funciones adaptadas a su edad:
  </p>
  
  <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:16px;margin:16px 0;">
    <p style="margin:0 0 8px;font-weight:bold;color:#c2410c;font-size:14px;">¿Qué puede hacer con acceso juvenil?</p>
    <ul style="margin:0;padding-left:18px;color:#475569;font-size:13px;line-height:1.8;">
      <li>📅 Ver convocatorias y calendario</li>
      <li>⚽ Consultar su ficha de jugador</li>
      <li>📊 Ver evaluaciones de entrenadores</li>
      <li>📸 Acceder a la galería de fotos</li>
    </ul>
  </div>
  
  <p style="color:#334155;font-size:14px;line-height:1.6;">
    Para activar el acceso juvenil, entra en la app, ve a <strong>"Mis Jugadores"</strong>, pulsa en la ficha de ${player.nombre} y activa la opción de <strong>acceso juvenil</strong>. Necesitarás facilitar un email del menor.
  </p>
  
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:12px;margin:16px 0;">
    <p style="margin:0;color:#166534;font-size:13px;">
      🔒 <strong>Seguro y controlado:</strong> Como padre/tutor, podrás revocar el acceso en cualquier momento. El menor deberá aceptar las normas de uso al iniciar sesión por primera vez.
    </p>
  </div>
  
  <p style="color:#64748b;font-size:12px;margin-top:20px;">
    Si no deseas activar el acceso juvenil, simplemente ignora este mensaje. No se enviará ningún acceso automáticamente.
  </p>
</td>
</tr>
<tr>
<td style="background:#1e293b;padding:16px;text-align:center;">
  <p style="color:#94a3b8;font-size:11px;margin:0;">CD Bustarviejo · info@cdbustarviejo.com</p>
</td>
</tr>
</table>
</body></html>`);

      // Mark as notified
      await base44.asServiceRole.entities.Player.update(player.id, {
        acceso_menor_notificado_fecha: today.toISOString()
      });

      notified.push({ nombre: player.nombre, email_padre: player.email_padre, diffDays });

      // Small delay between emails
      await new Promise(r => setTimeout(r, 300));
    }

    return Response.json({
      success: true,
      notified_count: notified.length,
      notified
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});