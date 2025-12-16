import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verificar que sea admin
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, full_name } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email es requerido' }, { status: 400 });
    }

    // Usar el sistema nativo de Base44 para invitar al usuario
    await base44.asServiceRole.auth.inviteUser(email.trim().toLowerCase(), {
      role: 'user',
      full_name: full_name || email.split('@')[0]
    });

    console.log(`✅ Invitación enviada a ${email} vía Base44`);

    return Response.json({ 
      success: true, 
      message: 'Invitación enviada correctamente por Base44' 
    });

  } catch (error) {
    console.error('Error invitando usuario:', error);
    return Response.json({ 
      error: error.message || 'Error al enviar invitación' 
    }, { status: 500 });
  }
});