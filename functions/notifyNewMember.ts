import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Automation handler: se ejecuta cuando se crea un nuevo ClubMember
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { data, event } = body;

    if (!data || event?.type !== 'create') {
      return Response.json({ skipped: true });
    }

    const member = data;
    console.log('[notifyNewMember] Nuevo socio:', member.nombre_completo, member.email);

    // Obtener admins para notificar
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    if (admins.length === 0) {
      console.log('[notifyNewMember] No hay admins para notificar');
      return Response.json({ skipped: true, reason: 'no_admins' });
    }

    const estadoPago = member.estado_pago || 'Pendiente';
    const tipo = member.tipo_inscripcion || 'Nueva Inscripción';
    const referido = member.referido_por ? `<p>📣 <strong>Referido por:</strong> ${member.referido_por}</p>` : '';

    const emailBody = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #ea580c, #16a34a); padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 22px;">🎉 ¡Nuevo Socio!</h1>
        </div>
        <div style="background: #f8fafc; padding: 24px; border: 1px solid #e2e8f0; border-radius: 0 0 12px 12px;">
          <h2 style="color: #1e293b; margin-top: 0;">${member.nombre_completo}</h2>
          <p>📧 <strong>Email:</strong> ${member.email}</p>
          ${member.telefono ? `<p>📱 <strong>Teléfono:</strong> ${member.telefono}</p>` : ''}
          <p>🏷️ <strong>Tipo:</strong> ${tipo}</p>
          <p>💳 <strong>Estado pago:</strong> ${estadoPago}</p>
          <p>📅 <strong>Temporada:</strong> ${member.temporada || 'N/A'}</p>
          ${member.numero_socio ? `<p>🔢 <strong>Nº Socio:</strong> ${member.numero_socio}</p>` : ''}
          ${referido}
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 16px 0;">
          <p style="color: #64748b; font-size: 13px;">Revisa los detalles en la sección <strong>Gestión Socios</strong> de la app.</p>
        </div>
      </div>
    `;

    // Enviar email a todos los admins
    for (const admin of admins) {
      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `🎉 Nuevo socio: ${member.nombre_completo}`,
          body: emailBody,
          from_name: 'CD Bustarviejo',
        });
        console.log('[notifyNewMember] Email enviado a:', admin.email);
      } catch (e) {
        console.error('[notifyNewMember] Error enviando a', admin.email, e.message);
      }
    }

    // Crear notificación in-app
    try {
      await base44.asServiceRole.entities.AppNotification.create({
        tipo: 'nuevo_socio',
        titulo: `🎉 Nuevo socio: ${member.nombre_completo}`,
        mensaje: `${member.nombre_completo} se ha registrado como socio (${estadoPago})`,
        destinatario_tipo: 'admins',
        leida: false,
        fecha: new Date().toISOString(),
      });
    } catch (e) {
      console.log('[notifyNewMember] No se pudo crear notificación in-app:', e.message);
    }

    return Response.json({ success: true, notified: admins.length });
  } catch (error) {
    console.error('[notifyNewMember] Error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});