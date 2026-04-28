import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Procesa la transición de jugadores menores que cumplen 18 para la nueva temporada.
 * Se ejecuta al inicio de temporada (cuando el admin prepara renovaciones).
 * 
 * Para cada jugador que cumple 18:
 * 1. Revoca acceso juvenil (acceso_menor_revocado = true)
 * 2. Marca es_mayor_edad = true
 * 3. Genera código de acceso tipo "jugador_adulto" y envía email
 * 4. Notifica al padre de que ya no gestiona al jugador
 */

function getAgeOnDate(fechaNacimiento, targetDate) {
  if (!fechaNacimiento) return null;
  const nacimiento = new Date(fechaNacimiento);
  let edad = targetDate.getFullYear() - nacimiento.getFullYear();
  const m = targetDate.getMonth() - nacimiento.getMonth();
  if (m < 0 || (m === 0 && targetDate.getDate() < nacimiento.getDate())) edad--;
  return edad;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const dryRun = body.dry_run === true;

    // Get active season config
    const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    const activeConfig = configs[0];
    if (!activeConfig) {
      return Response.json({ error: 'No hay SeasonConfig activa' }, { status: 400 });
    }

    const temporada = activeConfig.temporada;

    // Calculate next season start (July 1st)
    const now = new Date();
    const year = now.getMonth() >= 6 ? now.getFullYear() + 1 : now.getFullYear();
    const nextSeasonStart = new Date(year, 6, 1);

    // Get all active players
    const allPlayers = await base44.asServiceRole.entities.Player.list('-updated_date', 20000);

    const transitions = [];

    for (const player of allPlayers) {
      if (!player.fecha_nacimiento) continue;
      if (!player.activo && player.activo !== undefined) continue;

      const edadActual = getAgeOnDate(player.fecha_nacimiento, now);
      const edadProximaTemporada = getAgeOnDate(player.fecha_nacimiento, nextSeasonStart);

      if (edadActual === null || edadProximaTemporada === null) continue;

      // Player turns 18 before next season AND is not already processed
      const alreadyAdult = player.es_mayor_edad === true && player.acceso_jugador_autorizado === true;
      if (edadProximaTemporada >= 18 && !alreadyAdult) {
        transitions.push({
          player,
          edadActual,
          edadProximaTemporada,
          hadMinorAccess: player.acceso_menor_autorizado === true && !player.acceso_menor_revocado
        });
      }
    }

    if (dryRun) {
      return Response.json({
        success: true,
        dry_run: true,
        temporada,
        transitions: transitions.map(t => ({
          jugador_id: t.player.id,
          nombre: t.player.nombre,
          edad_actual: t.edadActual,
          edad_proxima_temporada: t.edadProximaTemporada,
          tenia_acceso_menor: t.hadMinorAccess,
          email_menor: t.player.acceso_menor_email,
          email_padre: t.player.email_padre,
          categoria: t.player.categoria_principal || t.player.deporte,
          fecha_nacimiento: t.player.fecha_nacimiento
        }))
      });
    }

    // Process each transition
    const processed = [];
    const errors = [];

    for (const t of transitions) {
      try {
        const player = t.player;
        const playerEmail = player.acceso_menor_email || player.email_jugador;

        if (!playerEmail) {
          errors.push({ jugador: player.nombre, error: 'No tiene email propio (ni juvenil ni adulto)' });
          continue;
        }

        // 1. Update player: revoke minor access, mark as adult
        const updateData = {
          es_mayor_edad: true,
          // Revoke minor access
          acceso_menor_revocado: true,
          // Set adult email (use minor email if no adult email exists)
          email_jugador: playerEmail,
          // Don't authorize adult access yet - they need to use the code first
          acceso_jugador_autorizado: false,
        };

        await base44.asServiceRole.entities.Player.update(player.id, updateData);

        // 2. Generate access code for adult player
        const result = await base44.functions.invoke('generateAccessCode', {
          email: playerEmail,
          tipo: 'jugador_adulto',
          nombre_destino: player.nombre,
          jugador_id: player.id,
          jugador_nombre: player.nombre,
          mensaje_personalizado: `¡Felicidades ${player.nombre?.split(' ')[0]}! Ya eres mayor de edad y puedes gestionar tu propia cuenta en el CD Bustarviejo. Tu acceso juvenil anterior ha sido desactivado. Usa este código para activar tu nuevo acceso como jugador adulto.`
        });

        // 3. Notify the parent that they no longer manage this player
        if (player.email_padre) {
          try {
            await base44.asServiceRole.entities.AppNotification.create({
              usuario_email: player.email_padre,
              titulo: '🎂 Transición a mayor de edad',
              mensaje: `${player.nombre} cumple 18 años y ahora gestionará su propia cuenta. Ya no aparecerá en "Mis Hijos" para renovación. Se le ha enviado una invitación a su email.`,
              tipo: 'importante',
              icono: '🎂',
              enlace: 'ParentPlayers',
              vista: false
            });
          } catch {}
        }

        // 4. If minor had User account, update it
        if (t.hadMinorAccess) {
          try {
            const users = await base44.asServiceRole.entities.User.filter({ email: playerEmail });
            if (users[0]) {
              await base44.asServiceRole.entities.User.update(users[0].id, {
                tipo_panel: null,
                es_menor: false,
                codigo_acceso_validado: false,  // Force re-validation with adult code
                player_id: player.id
              });
            }
          } catch {}
        }

        processed.push({
          jugador: player.nombre,
          email: playerEmail,
          codigo: result?.data?.codigo || 'generado',
          tenia_acceso_menor: t.hadMinorAccess
        });

      } catch (err) {
        console.error(`Error processing ${t.player.nombre}:`, err.message);
        errors.push({ jugador: t.player.nombre, error: err.message });
      }
    }

    return Response.json({
      success: true,
      temporada,
      total_detected: transitions.length,
      processed: processed.length,
      errors: errors.length,
      details: { processed, errors }
    });

  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});