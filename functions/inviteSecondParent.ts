import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Invitar a un segundo progenitor.
 * Flujo actual: genera un código de acceso vía generateAccessCode.
 * Si el usuario ya existe en la app, lo marca como segundo progenitor sin enviar código.
 */
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

    // Prevenir duplicados: verificar si ese email ya es email_padre de este jugador
    if (playerId) {
      try {
        const playerData = await base44.asServiceRole.entities.Player.filter({ id: playerId });
        if (playerData.length > 0) {
          const player = playerData[0];
          if (player.email_padre?.toLowerCase() === cleanEmail) {
            return Response.json({ success: false, error: 'Ese email ya es el progenitor principal de este jugador' }, { status: 400 });
          }
        }
      } catch (e) {
        console.log('⚠️ Error verificando jugador:', e.message);
      }
    }

    // Verificar si el usuario ya existe en la app
    try {
      const existingUsers = await base44.asServiceRole.entities.User.filter({ email: cleanEmail });
      if (existingUsers.length > 0) {
        console.log(`ℹ️ Usuario ${cleanEmail} ya existe en la app`);
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

    // Generar código de acceso usando generateAccessCode
    try {
      const result = await base44.functions.invoke('generateAccessCode', {
        email: cleanEmail,
        tipo: 'segundo_progenitor',
        nombre_destino: '',
        jugador_id: playerId || '',
        jugador_nombre: playerName || ''
      });

      if (result?.data?.success) {
        console.log(`✅ Código de acceso generado para ${cleanEmail}`);
        return Response.json({ success: true, alreadyExists: false, method: 'access_code' });
      } else {
        console.log('⚠️ Error generando código:', result?.data?.error);
        return Response.json({ error: result?.data?.error || 'Error al generar código de acceso' }, { status: 500 });
      }
    } catch (genError) {
      console.error('❌ Error invocando generateAccessCode:', genError.message);
      return Response.json({ error: 'Error al generar la invitación: ' + genError.message }, { status: 500 });
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});