import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { user_email, user_name, reason } = body || {};

    // Obtener admins con service role
    const allUsers = await base44.asServiceRole.entities.User.list();
    const admins = (allUsers || []).filter(u => u.role === 'admin');
    const adminEmails = Array.from(new Set(admins.map(a => a.email).filter(Boolean)));

    // Crear notificaciones internas
    for (const email of adminEmails) {
      await base44.asServiceRole.entities.AppNotification.create({
        usuario_email: email,
        titulo: 'Solicitud de eliminación de cuenta',
        mensaje: `${user_name || user_email} ha solicitado eliminar su cuenta. Motivo: ${reason || '—'}`,
        tipo: 'importante',
        icono: '🗑️',
        enlace: '/deleteaccount'
      });
    }

    // Emails a admins + correos del club conocidos
    const extraClubEmails = ['cdbustarviejo@gmail.com', 'C.D.BUSTARVIEJO@HOTMAIL.ES'];
    const targets = Array.from(new Set([...adminEmails, ...extraClubEmails]));
    for (const to of targets) {
      try {
        const deletionHtml = `<!DOCTYPE html>
<html lang="es"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:24px 8px;"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#dc2626,#991b1b);padding:28px 24px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">🗑️</div>
  <div style="color:#fff;font-size:20px;font-weight:800;">SOLICITUD DE BAJA</div>
  <div style="color:rgba(255,255,255,0.8);font-size:13px;margin-top:4px;">Requiere revisión</div>
</td></tr>
<tr><td style="padding:24px;">
  <div style="background:#fef2f2;border-radius:10px;padding:14px 16px;border-left:4px solid #ef4444;">
    <div style="color:#991b1b;font-size:14px;">
      <strong>Usuario:</strong> ${user_name || user_email}<br>
      <strong>Email:</strong> ${user_email}<br>
      <strong>Motivo:</strong> ${reason || 'No indicado'}<br>
      <strong>Fecha:</strong> ${new Date().toLocaleString('es-ES')}
    </div>
  </div>
  <p style="color:#64748b;font-size:13px;margin:16px 0 0;">Revisar en el panel de administración.</p>
</td></tr>
<tr><td style="background:#1e293b;padding:20px 24px;text-align:center;"><div style="color:#94a3b8;font-size:12px;"><strong style="color:#f8fafc;">CD Bustarviejo</strong></div></td></tr>
</table></td></tr></table></body></html>`;
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject: '🗑️ Solicitud de eliminación de cuenta - CD Bustarviejo',
          body: deletionHtml
        });
      } catch (_) { /* continuar */ }
    }

    return Response.json({ success: true, notified: targets });
  } catch (err) {
    console.error('notifyAccountDeletionRequest error:', err);
    return Response.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
});