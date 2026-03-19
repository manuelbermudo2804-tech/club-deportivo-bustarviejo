import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

const MAX_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 15;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { codigo } = await req.json();
    
    if (!codigo || codigo.trim().length < 9) {
      return Response.json({ error: 'Código inválido', valid: false }, { status: 400 });
    }

    const codeNormalized = codigo.trim().toUpperCase();
    const userEmail = user.email.toLowerCase();

    // --- RATE LIMITING: comprobar intentos fallidos recientes ---
    const lockoutTime = new Date(Date.now() - LOCKOUT_MINUTES * 60 * 1000);
    
    const recentAttempts = await base44.asServiceRole.entities.AccessCodeAttempt.filter({
      user_email: userEmail,
      exitoso: false
    });

    // Filtrar solo los intentos dentro de la ventana de bloqueo
    const recentFailures = recentAttempts.filter(a => new Date(a.created_date) > lockoutTime);

    if (recentFailures.length >= MAX_ATTEMPTS) {
      const oldestInWindow = new Date(Math.min(...recentFailures.map(a => new Date(a.created_date).getTime())));
      const unblockTime = new Date(oldestInWindow.getTime() + LOCKOUT_MINUTES * 60 * 1000);
      const minutesLeft = Math.ceil((unblockTime - Date.now()) / 60000);

      // Registrar intento bloqueado
      await base44.asServiceRole.entities.AccessCodeAttempt.create({
        user_email: userEmail,
        codigo_intentado: codeNormalized,
        exitoso: false,
        motivo_fallo: 'bloqueado'
      });

      return Response.json({ 
        error: `Demasiados intentos fallidos. Espera ${minutesLeft} minuto${minutesLeft !== 1 ? 's' : ''} para volver a intentarlo.`, 
        valid: false,
        blocked: true,
        minutes_left: minutesLeft
      }, { status: 429 });
    }

    // --- BUSCAR CÓDIGO ---
    const codes = await base44.asServiceRole.entities.AccessCode.filter({ codigo: codeNormalized });
    
    if (!codes || codes.length === 0) {
      await base44.asServiceRole.entities.AccessCodeAttempt.create({
        user_email: userEmail,
        codigo_intentado: codeNormalized,
        exitoso: false,
        motivo_fallo: 'codigo_invalido'
      });
      
      const attemptsLeft = MAX_ATTEMPTS - recentFailures.length - 1;
      return Response.json({ 
        error: `Código no encontrado.${attemptsLeft <= 2 ? ` Te quedan ${attemptsLeft} intento${attemptsLeft !== 1 ? 's' : ''}.` : ''}`, 
        valid: false 
      }, { status: 404 });
    }

    const accessCode = codes[0];

    // Verificar estado
    if (accessCode.estado === 'usado') {
      await base44.asServiceRole.entities.AccessCodeAttempt.create({
        user_email: userEmail,
        codigo_intentado: codeNormalized,
        exitoso: false,
        motivo_fallo: 'usado'
      });
      return Response.json({ error: 'Este código ya fue utilizado', valid: false }, { status: 400 });
    }
    if (accessCode.estado === 'cancelado') {
      await base44.asServiceRole.entities.AccessCodeAttempt.create({
        user_email: userEmail,
        codigo_intentado: codeNormalized,
        exitoso: false,
        motivo_fallo: 'cancelado'
      });
      return Response.json({ error: 'Este código ha sido cancelado', valid: false }, { status: 400 });
    }

    // Verificar expiración
    const now = new Date();
    if (accessCode.fecha_expiracion && new Date(accessCode.fecha_expiracion) < now) {
      await base44.asServiceRole.entities.AccessCode.update(accessCode.id, { estado: 'expirado' });
      await base44.asServiceRole.entities.AccessCodeAttempt.create({
        user_email: userEmail,
        codigo_intentado: codeNormalized,
        exitoso: false,
        motivo_fallo: 'expirado'
      });
      return Response.json({ error: 'Este código ha expirado. Solicita uno nuevo.', valid: false }, { status: 400 });
    }

    // --- VERIFICAR EMAIL (seguridad clave) ---
    if (accessCode.email.toLowerCase() !== userEmail) {
      await base44.asServiceRole.entities.AccessCodeAttempt.create({
        user_email: userEmail,
        codigo_intentado: codeNormalized,
        exitoso: false,
        motivo_fallo: 'email_incorrecto'
      });
      
      const attemptsLeft = MAX_ATTEMPTS - recentFailures.length - 1;
      return Response.json({ 
        error: `Este código está vinculado a otro email. Asegúrate de registrarte con el email correcto.${attemptsLeft <= 2 ? ` Te quedan ${attemptsLeft} intento${attemptsLeft !== 1 ? 's' : ''}.` : ''}`, 
        valid: false 
      }, { status: 400 });
    }

    // --- CÓDIGO VÁLIDO ---
    await base44.asServiceRole.entities.AccessCode.update(accessCode.id, {
      estado: 'usado',
      fecha_uso: now.toISOString()
    });

    // Registrar intento exitoso
    await base44.asServiceRole.entities.AccessCodeAttempt.create({
      user_email: userEmail,
      codigo_intentado: codeNormalized,
      exitoso: true
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
    } else if (accessCode.tipo === 'entrenador') {
      updateData.tipo_panel = 'familia'; // panel base - el layout detecta es_entrenador
      updateData.es_entrenador = true;
      if (accessCode.categorias_asignadas?.length > 0) {
        updateData.categorias_entrena = accessCode.categorias_asignadas;
      }
    } else if (accessCode.tipo === 'coordinador') {
      updateData.tipo_panel = 'familia'; // panel base - el layout detecta es_coordinador
      updateData.es_coordinador = true;
      updateData.es_entrenador = true; // coordinadores también son entrenadores
      if (accessCode.categorias_asignadas?.length > 0) {
        updateData.categorias_coordina = accessCode.categorias_asignadas;
        updateData.categorias_entrena = accessCode.categorias_asignadas;
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