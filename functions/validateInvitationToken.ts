import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const { token, invitationType } = await req.json();
    
    if (!token || !invitationType) {
      return Response.json({ 
        error: 'Token y tipo de invitación requeridos' 
      }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    
    // Validar según tipo
    let invitation;
    
    if (invitationType === 'second_parent') {
      const invitations = await base44.asServiceRole.entities.SecondParentInvitation.filter({ token });
      
      if (invitations.length === 0) {
        return Response.json({ 
          valid: false, 
          error: 'Invitación no encontrada' 
        });
      }
      
      invitation = invitations[0];
      
      // Verificar estado y expiración
      if (invitation.estado === 'expirada' || invitation.estado === 'cancelada') {
        return Response.json({ 
          valid: false, 
          error: 'Esta invitación ha expirado o fue cancelada' 
        });
      }
      
      if (invitation.fecha_expiracion && new Date(invitation.fecha_expiracion) < new Date()) {
        await base44.asServiceRole.entities.SecondParentInvitation.update(invitation.id, { 
          estado: 'expirada' 
        });
        return Response.json({ 
          valid: false, 
          error: 'Esta invitación ha expirado' 
        });
      }
      
      if (invitation.estado === 'aceptada') {
        return Response.json({ 
          valid: true, 
          alreadyAccepted: true,
          email: invitation.email_destino 
        });
      }
      
      return Response.json({ 
        valid: true, 
        invitation: {
          id: invitation.id,
          email_destino: invitation.email_destino,
          nombre_destino: invitation.nombre_destino,
          jugador_nombre: invitation.jugador_nombre,
          jugador_id: invitation.jugador_id,
          invitado_por_nombre: invitation.invitado_por_nombre,
          invitado_por_email: invitation.invitado_por_email
        }
      });
    } 
    else if (invitationType === 'admin') {
      const invitations = await base44.asServiceRole.entities.AdminInvitation.filter({ token });
      
      if (invitations.length === 0) {
        return Response.json({ 
          valid: false, 
          error: 'Invitación no encontrada' 
        });
      }
      
      invitation = invitations[0];
      
      if (invitation.estado === 'expirada' || invitation.estado === 'cancelada') {
        return Response.json({ 
          valid: false, 
          error: 'Esta invitación ha expirado o fue cancelada' 
        });
      }
      
      if (invitation.fecha_expiracion && new Date(invitation.fecha_expiracion) < new Date()) {
        await base44.asServiceRole.entities.AdminInvitation.update(invitation.id, { 
          estado: 'expirada' 
        });
        return Response.json({ 
          valid: false, 
          error: 'Esta invitación ha expirado' 
        });
      }
      
      // Marcar como aceptada
      await base44.asServiceRole.entities.AdminInvitation.update(invitation.id, {
        estado: 'aceptada',
        fecha_aceptacion: new Date().toISOString(),
        clicada: true,
        fecha_clic: new Date().toISOString()
      });
      
      return Response.json({ 
        valid: true, 
        email: invitation.email_destino 
      });
    }
    
    return Response.json({ 
      error: 'Tipo de invitación no válido' 
    }, { status: 400 });
    
  } catch (error) {
    console.error('Error validating token:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});