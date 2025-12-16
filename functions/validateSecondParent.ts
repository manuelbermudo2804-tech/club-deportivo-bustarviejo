import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const { token } = await req.json();
    
    if (!token) {
      return Response.json({ error: 'Token requerido' });
    }

    const base44 = createClientFromRequest(req);
    
    // Buscar invitación usando service role (sin auth)
    const invitations = await base44.asServiceRole.entities.SecondParentInvitation.filter({ token });
    
    if (invitations.length === 0) {
      return Response.json({ error: 'Invitación no encontrada' });
    }
    
    const inv = invitations[0];
    
    if (inv.estado === 'expirada' || inv.estado === 'cancelada') {
      return Response.json({ error: 'Invitación expirada o cancelada' });
    }
    
    if (inv.fecha_expiracion && new Date(inv.fecha_expiracion) < new Date()) {
      return Response.json({ error: 'Invitación expirada' });
    }
    
    // Marcar como aceptada
    if (inv.estado === 'pendiente') {
      await base44.asServiceRole.entities.SecondParentInvitation.update(inv.id, {
        estado: 'aceptada',
        fecha_aceptacion: new Date().toISOString()
      });
    }
    
    return Response.json({ success: true });
    
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: 'Error al validar' });
  }
});