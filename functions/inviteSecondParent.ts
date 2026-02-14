import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, playerName, inviterName, playerId } = await req.json();

    if (!email || !email.trim()) {
      return Response.json({ error: 'Email es obligatorio' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // No invitarse a sí mismo
    if (cleanEmail === user.email?.toLowerCase()) {
      return Response.json({ success: true, alreadyExists: true, message: 'No puedes invitarte a ti mismo' });
    }

    // Verificar si el usuario ya existe en la app
    try {
      const existingUsers = await base44.asServiceRole.entities.User.filter({ email: cleanEmail });
      if (existingUsers.length > 0) {
        console.log(`ℹ️ Usuario ${cleanEmail} ya existe en la app`);
        // Marcar como segundo progenitor si no lo está
        const existingUser = existingUsers[0];
        if (!existingUser.es_segundo_progenitor) {
          try {
            await base44.asServiceRole.entities.User.update(existingUser.id, { 
              es_segundo_progenitor: true, 
              tipo_panel: existingUser.tipo_panel || 'familia' 
            });
            console.log(`✅ Usuario ${cleanEmail} marcado como segundo progenitor`);
          } catch (e) {
            console.log('⚠️ No se pudo marcar como segundo progenitor:', e.message);
          }
        }
        return Response.json({ success: true, alreadyExists: true, message: 'El usuario ya tiene cuenta en la app' });
      }
    } catch (e) {
      console.log('⚠️ Error verificando usuario existente:', e.message);
    }

    // App privada: solo admins pueden invitar directamente.
    // Intentar con inviteUser (funcionará si quien llama es admin)
    try {
      await base44.auth.inviteUser(cleanEmail, 'user');
      console.log(`✅ Invitación enviada directamente a: ${cleanEmail}`);
      
      // Registrar en SecondParentInvitation como completada
      try {
        await base44.asServiceRole.entities.SecondParentInvitation.create({
          token: crypto.randomUUID(),
          email_destino: cleanEmail,
          nombre_destino: '',
          jugador_id: playerId || '',
          jugador_nombre: playerName || '',
          invitado_por_email: user.email,
          invitado_por_nombre: inviterName || user.full_name,
          estado: 'aceptada',
          fecha_envio: new Date().toISOString(),
          fecha_expiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        });
      } catch (e) {
        console.log('⚠️ Error registrando invitación:', e.message);
      }

      return Response.json({ success: true, alreadyExists: false, method: 'direct' });
    } catch (inviteError) {
      console.log('ℹ️ inviteUser falló (usuario no admin):', inviteError.message);
      
      if (inviteError.message?.includes('already') || inviteError.message?.includes('exists')) {
        return Response.json({ success: true, alreadyExists: true });
      }
    }

    // Fallback: crear solicitud para que el admin la procese
    try {
      // Verificar si ya existe una solicitud pendiente
      const existing = await base44.asServiceRole.entities.SecondParentInvitation.filter({
        email_destino: cleanEmail,
        estado: 'pendiente'
      });

      if (existing.length > 0) {
        console.log(`ℹ️ Ya existe solicitud pendiente para ${cleanEmail}`);
        return Response.json({ success: true, needsAdmin: true, message: 'Ya hay una solicitud pendiente para este email' });
      }

      await base44.asServiceRole.entities.SecondParentInvitation.create({
        token: crypto.randomUUID(),
        email_destino: cleanEmail,
        nombre_destino: '',
        jugador_id: playerId || '',
        jugador_nombre: playerName || '',
        invitado_por_email: user.email,
        invitado_por_nombre: inviterName || user.full_name,
        estado: 'pendiente',
        fecha_envio: new Date().toISOString(),
        fecha_expiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
      });

      console.log(`📨 Solicitud de invitación creada para ${cleanEmail} (pendiente admin)`);

      // Notificar al admin por email (usar función sendEmail con Resend)
      try {
        await base44.asServiceRole.functions.invoke('sendEmail', {
          to: 'cdbustarviejo@gmail.com',
          subject: `🔔 Nueva solicitud: invitar a ${cleanEmail} como 2º progenitor`,
          html: `<div style="font-family:Arial,sans-serif;line-height:1.5">
            <h2>👥 Nueva solicitud de invitación de segundo progenitor</h2>
            <p><strong>${user.full_name}</strong> (${user.email}) solicita que invites a:</p>
            <div style="background:#f1f5f9;padding:12px;border-radius:8px;margin:12px 0">
              <p style="margin:4px 0"><strong>Email a invitar:</strong> ${cleanEmail}</p>
              <p style="margin:4px 0"><strong>Jugador:</strong> ${playerName || 'sin nombre'}</p>
            </div>
            <p>Ve a la app → <strong>Solicitudes de Invitación</strong> para procesarla.</p>
          </div>`
        });
        console.log('✅ Notificación enviada al admin via sendEmail');
      } catch (emailErr) {
        console.log('⚠️ No se pudo notificar al admin:', emailErr.message);
      }

      return Response.json({ success: true, needsAdmin: true, message: 'Solicitud enviada al administrador' });
    } catch (fallbackError) {
      console.error('❌ Error creando solicitud:', fallbackError.message);
      return Response.json({ error: 'Error al crear la solicitud: ' + fallbackError.message }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});