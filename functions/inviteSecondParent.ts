import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verificar que hay un usuario autenticado
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, playerName, inviterName } = await req.json();

    if (!email || !email.trim()) {
      return Response.json({ error: 'Email es obligatorio' }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Verificar que no se está invitando a sí mismo
    if (cleanEmail === user.email?.toLowerCase()) {
      return Response.json({ error: 'No puedes invitarte a ti mismo', alreadyExists: true }, { status: 400 });
    }

    // Verificar si el usuario ya existe en la app
    try {
      const existingUsers = await base44.asServiceRole.entities.User.filter({ email: cleanEmail });
      if (existingUsers.length > 0) {
        console.log(`ℹ️ Usuario ${cleanEmail} ya existe en la app, no se necesita invitación`);
        return Response.json({ success: true, alreadyExists: true, message: 'El usuario ya tiene cuenta en la app' });
      }
    } catch (e) {
      console.log('⚠️ Error verificando usuario existente:', e.message);
    }

    // Invitar al segundo progenitor
    // Intentar primero con auth.inviteUser (funciona si el SDK lo permite)
    try {
      await base44.auth.inviteUser(cleanEmail, 'user');
      console.log(`✅ Invitación enviada automáticamente a: ${cleanEmail}`);
      return Response.json({ 
        success: true, 
        alreadyExists: false, 
        message: `Invitación enviada a ${cleanEmail}` 
      });
    } catch (inviteError) {
      console.error('❌ Error con auth.inviteUser:', inviteError.message);
      
      // Si el error es porque ya existe, no es un error real
      if (inviteError.message?.includes('already') || inviteError.message?.includes('exists')) {
        return Response.json({ success: true, alreadyExists: true, message: 'El usuario ya tiene cuenta' });
      }

      // Si falla por permisos, devolver error específico para que el frontend haga fallback
      return Response.json({ 
        success: false,
        needsAdmin: true,
        error: 'Se necesita aprobación del administrador para completar la invitación'
      }, { status: 200 });
    }

  } catch (error) {
    console.error('❌ Error general:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});