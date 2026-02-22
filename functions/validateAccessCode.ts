import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { codigo } = await req.json();
    
    if (!codigo || codigo.trim().length < 5) {
      return Response.json({ error: 'Código inválido', valid: false }, { status: 400 });
    }

    const codeNormalized = codigo.trim().toUpperCase();
    
    // Buscar el código
    const codes = await base44.asServiceRole.entities.AccessCode.filter({ codigo: codeNormalized });
    
    if (!codes || codes.length === 0) {
      return Response.json({ error: 'Código no encontrado', valid: false }, { status: 404 });
    }

    const accessCode = codes[0];

    // Verificar estado
    if (accessCode.estado === 'usado') {
      return Response.json({ error: 'Este código ya fue utilizado', valid: false }, { status: 400 });
    }
    if (accessCode.estado === 'cancelado') {
      return Response.json({ error: 'Este código ha sido cancelado', valid: false }, { status: 400 });
    }

    // Verificar expiración
    const now = new Date();
    if (accessCode.fecha_expiracion && new Date(accessCode.fecha_expiracion) < now) {
      await base44.asServiceRole.entities.AccessCode.update(accessCode.id, { estado: 'expirado' });
      return Response.json({ error: 'Este código ha expirado. Solicita uno nuevo.', valid: false }, { status: 400 });
    }

    // Verificar que el email coincide
    if (accessCode.email.toLowerCase() !== user.email.toLowerCase()) {
      return Response.json({ 
        error: `Este código está vinculado a otro email. Asegúrate de registrarte con el email correcto.`, 
        valid: false 
      }, { status: 400 });
    }

    // Código válido - marcar como usado
    await base44.asServiceRole.entities.AccessCode.update(accessCode.id, {
      estado: 'usado',
      fecha_uso: now.toISOString()
    });

    // Configurar el usuario según el tipo
    const updateData = {
      codigo_acceso_validado: true,
      fecha_validacion_codigo: now.toISOString()
    };

    if (accessCode.tipo === 'padre_nuevo') {
      updateData.tipo_panel = 'familia';
    } else if (accessCode.tipo === 'segundo_progenitor') {
      updateData.tipo_panel = 'familia';
      updateData.es_segundo_progenitor = true;
    } else if (accessCode.tipo === 'juvenil') {
      updateData.tipo_panel = 'jugador_menor';
      updateData.es_menor = true;
      if (accessCode.jugador_id) {
        updateData.player_id = accessCode.jugador_id;
      }
    } else if (accessCode.tipo === 'jugador_adulto') {
      updateData.tipo_panel = 'jugador_adulto';
      updateData.es_jugador = true;
      if (accessCode.jugador_id) {
        updateData.player_id = accessCode.jugador_id;
      }
    }

    await base44.asServiceRole.entities.User.update(user.id, updateData);

    return Response.json({ 
      valid: true, 
      tipo: accessCode.tipo,
      rol_asignado: accessCode.rol_asignado,
      jugador_nombre: accessCode.jugador_nombre
    });

  } catch (error) {
    console.error('Error validando código:', error);
    return Response.json({ error: error.message, valid: false }, { status: 500 });
  }
});