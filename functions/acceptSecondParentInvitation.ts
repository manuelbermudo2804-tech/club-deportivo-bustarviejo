import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return Response.json({ error: 'Token requerido' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    
    // Buscar invitación (SIN auth - función pública)
    const invitations = await base44.asServiceRole.entities.SecondParentInvitation.filter({ token });
    
    if (invitations.length === 0) {
      return Response.json({ error: 'Invitación no encontrada' });
    }
    
    const invitation = invitations[0];
    
    // Verificar estado
    if (invitation.estado === 'aceptada') {
      return Response.json({ success: true, message: 'Ya fue aceptada' });
    }
    
    if (invitation.estado === 'expirada' || invitation.estado === 'cancelada') {
      return Response.json({ error: 'Esta invitación ha expirado o fue cancelada' });
    }
    
    if (invitation.fecha_expiracion && new Date(invitation.fecha_expiracion) < new Date()) {
      await base44.asServiceRole.entities.SecondParentInvitation.update(invitation.id, { 
        estado: 'expirada' 
      });
      return Response.json({ error: 'Esta invitación ha expirado' });
    }
    
    // Marcar como aceptada
    await base44.asServiceRole.entities.SecondParentInvitation.update(invitation.id, {
      estado: 'aceptada',
      fecha_aceptacion: new Date().toISOString()
    });
    
    // Ya está - el usuario ya existe y puede hacer login
    // Base44 se encarga del login cuando llegue a la app
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});