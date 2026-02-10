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
        await base44.asServiceRole.integrations.Core.SendEmail({
          to,
          subject: 'CD Bustarviejo · Nueva solicitud de eliminación de cuenta',
          body: `Se ha recibido una solicitud de eliminación de cuenta.\n\nUsuario: ${user_name || user_email}\nEmail: ${user_email}\nMotivo: ${reason || 'No indicado'}\nFecha: ${new Date().toLocaleString('es-ES')}\n\nRevisar en el panel de administración.`
        });
      } catch (_) { /* continuar */ }
    }

    return Response.json({ success: true, notified: targets });
  } catch (err) {
    console.error('notifyAccountDeletionRequest error:', err);
    return Response.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
});