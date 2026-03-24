import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const FROM_EMAIL = 'CD Bustarviejo <noreply@cdbustarviejo.com>';
const MAX_AUTO_RESENDS = 3; // Máximo 3 reenvíos automáticos

async function sendWithResend(to, subject, html) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ from: FROM_EMAIL, to: [to], subject, html })
  });
  const data = await response.json();
  if (!response.ok) {
    console.error('[expireAccessCodes] Error Resend:', data);
    throw new Error(data.message || 'Error enviando email');
  }
  return data;
}

function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  code += '-';
  for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function buildAutoResendEmail(code, nombreDestino, appUrl, reenvioNum) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;">
<tr><td align="center" style="padding:24px 16px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#ea580c;padding:28px 24px;text-align:center;border-radius:16px 16px 0 0;">
    <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/6911b8e453ca3ac01fb134d6/e3f0a8e26_logo_cd_bustarviejo_mediano.jpg" alt="CD Bustarviejo" width="64" height="64" style="border:3px solid #fff;border-radius:12px;display:block;margin:0 auto 12px;"/>
    <div style="font-size:22px;font-weight:bold;color:#fff;">CD BUSTARVIEJO</div>
    <div style="font-size:12px;color:#fed7aa;margin-top:4px;">⏰ Recordatorio de Invitación</div>
  </td></tr>
  <tr><td style="background:#fff;padding:28px;">
    <p style="font-size:17px;color:#1e293b;margin:0 0 12px;">${nombreDestino ? `Hola <strong>${nombreDestino}</strong>,` : 'Hola,'}</p>
    <p style="font-size:15px;color:#475569;line-height:24px;margin:0 0 20px;">
      Te enviamos una invitación para unirte a la app del <strong>CD Bustarviejo</strong> pero tu código anterior expiró. 
      <strong>Te hemos generado uno nuevo automáticamente.</strong>
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:12px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="background:#1e293b;padding:28px 20px;text-align:center;">
        <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:3px;margin-bottom:10px;">🔑 Tu nuevo código de acceso</div>
        <div style="font-family:'Courier New',monospace;font-size:40px;font-weight:bold;color:#f97316;letter-spacing:10px;margin-bottom:10px;">${code}</div>
        <div style="font-size:11px;color:#64748b;">⏱️ Válido 7 días &bull; 🔒 Vinculado a tu email</div>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="border:2px solid #bbf7d0;border-radius:10px;overflow:hidden;margin-bottom:20px;">
      <tr><td style="background:#f0fdf4;padding:18px 22px;font-size:14px;color:#166534;line-height:28px;">
        <strong>1.</strong> Pulsa el botón de abajo para abrir la app<br/>
        <strong>2.</strong> Regístrate con <strong>este mismo email</strong><br/>
        <strong>3.</strong> Introduce el código: <strong style="color:#ea580c;">${code}</strong><br/>
        <strong>4.</strong> ¡Listo! Ya tendrás acceso completo
      </td></tr>
    </table>
    <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
      <tr><td style="border-radius:10px;background:#16a34a;text-align:center;">
        <a href="${appUrl}" target="_blank" style="display:inline-block;background:#16a34a;color:#fff;font-size:16px;font-weight:bold;text-decoration:none;padding:16px 40px;border-radius:10px;">
          Abrir la App del Club →
        </a>
      </td></tr>
    </table>
    <p style="font-size:11px;color:#94a3b8;text-align:center;margin-top:12px;">
      Este es el recordatorio automático nº${reenvioNum}. Si necesitas ayuda: cdbustarviejo@gmail.com
    </p>
  </td></tr>
  <tr><td style="background:#f8fafc;padding:16px;border-radius:0 0 16px 16px;text-align:center;font-size:11px;color:#94a3b8;">
    CD Bustarviejo &bull; <a href="mailto:cdbustarviejo@gmail.com" style="color:#ea580c;text-decoration:none;">cdbustarviejo@gmail.com</a>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const pendingCodes = await base44.asServiceRole.entities.AccessCode.filter({ estado: 'pendiente' });
    
    const now = new Date();
    let expiredCount = 0;
    let autoResendCount = 0;
    let maxResendReached = 0;
    const autoResendDetails = [];

    for (const code of pendingCodes) {
      if (code.fecha_expiracion && new Date(code.fecha_expiracion) < now) {
        const currentResends = code.reenvios || 0;

        // Si no ha superado el máximo de reenvíos automáticos → reenviar con código nuevo
        if (currentResends < MAX_AUTO_RESENDS) {
          try {
            // Generar nuevo código
            let newCode = generateCode();
            const existing = await base44.asServiceRole.entities.AccessCode.filter({ codigo: newCode });
            if (existing.length > 0) newCode = generateCode();

            const newExpiration = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
            const reenvioNum = currentResends + 1;

            // Actualizar el código existente
            await base44.asServiceRole.entities.AccessCode.update(code.id, {
              codigo: newCode,
              estado: 'pendiente',
              fecha_expiracion: newExpiration.toISOString(),
              reenvios: reenvioNum,
              ultimo_reenvio: now.toISOString()
            });

            // Enviar email de recordatorio
            const appUrl = 'https://app.cdbustarviejo.com';
            const emailHTML = buildAutoResendEmail(newCode, code.nombre_destino, appUrl, reenvioNum);
            await sendWithResend(
              code.email,
              `⏰ CD Bustarviejo - Recordatorio: Tu nuevo código de acceso (${newCode})`,
              emailHTML
            );

            autoResendCount++;
            autoResendDetails.push({
              email: code.email,
              nombre: code.nombre_destino,
              tipo: code.tipo,
              newCode,
              reenvioNum
            });

            console.log(`[expireAccessCodes] ✅ Auto-reenviado a ${code.email} (reenvío #${reenvioNum}, nuevo código: ${newCode})`);
          } catch (resendErr) {
            console.error(`[expireAccessCodes] ❌ Error auto-reenviando a ${code.email}:`, resendErr);
            // Si falla el reenvío, marcar como expirado
            await base44.asServiceRole.entities.AccessCode.update(code.id, { estado: 'expirado' });
            expiredCount++;
          }
        } else {
          // Ya se reenviaron MAX veces → expirar definitivamente
          await base44.asServiceRole.entities.AccessCode.update(code.id, { estado: 'expirado' });
          expiredCount++;
          maxResendReached++;
          console.log(`[expireAccessCodes] ⛔ ${code.email} expirado definitivamente (${currentResends} reenvíos agotados)`);
        }
      }
    }

    // Si hubo reenvíos automáticos, notificar al admin
    if (autoResendCount > 0 || maxResendReached > 0) {
      try {
        const adminNotifLines = autoResendDetails.map(d => 
          `• ${d.nombre || d.email} (${d.tipo}) → Reenvío #${d.reenvioNum} - Nuevo código: ${d.newCode}`
        ).join('<br/>');

        const adminHTML = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
          <h2 style="color:#ea580c;">🔄 Reenvíos automáticos de códigos de acceso</h2>
          <p>Se han reenviado automáticamente <strong>${autoResendCount}</strong> invitaciones que habían expirado:</p>
          ${adminNotifLines ? `<div style="background:#f8fafc;border-left:4px solid #ea580c;padding:12px;margin:16px 0;font-size:14px;line-height:24px;">${adminNotifLines}</div>` : ''}
          ${maxResendReached > 0 ? `<p style="color:#dc2626;">⛔ <strong>${maxResendReached}</strong> invitaciones han expirado definitivamente (superaron ${MAX_AUTO_RESENDS} reenvíos). Revísalas en el panel de Códigos de Acceso.</p>` : ''}
          <p style="font-size:12px;color:#64748b;">— Sistema automático del CD Bustarviejo</p>
        </div>`;

        // Obtener admins
        const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
        for (const admin of admins) {
          if (admin.email) {
            await sendWithResend(admin.email, `🔄 CD Bustarviejo - ${autoResendCount} códigos reenviados automáticamente`, adminHTML);
          }
        }
      } catch (notifErr) {
        console.error('[expireAccessCodes] Error notificando a admins:', notifErr);
      }
    }

    console.log(`[expireAccessCodes] Resumen: ${autoResendCount} reenviados, ${expiredCount} expirados definitivamente, ${maxResendReached} máximo alcanzado`);
    return Response.json({ 
      success: true, 
      auto_resent: autoResendCount, 
      expired: expiredCount, 
      max_resend_reached: maxResendReached,
      checked: pendingCodes.length 
    });
  } catch (error) {
    console.error('Error expiring codes:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});