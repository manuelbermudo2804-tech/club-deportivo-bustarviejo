import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Función backend para que padres realicen acciones de renovación protegidas por RLS.
 * Acciones soportadas:
 *  - "renew": marca jugador como renovado (estado_renovacion=renovado, activo=true) y crea pagos
 *  - "not_renewing": marca como no_renueva
 *  - "create_with_payments": crea jugador nuevo + pagos asociados
 *
 * Verifica siempre que el usuario autenticado sea padre/tutor del jugador
 * (o esté creando uno nuevo asociado a su email).
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { action, playerId, playerData, payments, temporada } = body;

    if (!action) {
      return Response.json({ error: 'Falta el campo action' }, { status: 400 });
    }

    // Helper: verificar que el usuario es padre/tutor del jugador
    const verifyOwnership = async (id) => {
      const player = await base44.asServiceRole.entities.Player.get(id);
      if (!player) throw new Error('Jugador no encontrado');
      const isOwner =
        player.email_padre === user.email ||
        player.email_tutor_2 === user.email ||
        player.email_jugador === user.email;
      if (!isOwner && user.role !== 'admin') {
        throw new Error('No tienes permiso sobre este jugador');
      }
      return player;
    };

    // ============ RENEW ============
    if (action === 'renew') {
      if (!playerId) return Response.json({ error: 'Falta playerId' }, { status: 400 });
      await verifyOwnership(playerId);

      const updateData = {
        estado_renovacion: 'renovado',
        activo: true,
        tipo_inscripcion: 'Renovación',
        temporada_renovacion: temporada,
        fecha_renovacion: new Date().toISOString(),
      };
      if (playerData?.deporte) updateData.deporte = playerData.deporte;
      if (playerData?.categoria_principal) updateData.categoria_principal = playerData.categoria_principal;

      const updated = await base44.asServiceRole.entities.Player.update(playerId, updateData);

      // Crear pagos
      const createdPayments = [];
      if (Array.isArray(payments) && payments.length > 0) {
        for (const p of payments) {
          const created = await base44.asServiceRole.entities.Payment.create({
            ...p,
            jugador_id: updated.id,
            jugador_nombre: updated.nombre,
          });
          createdPayments.push(created);
        }
      }

      return Response.json({ success: true, player: updated, payments: createdPayments });
    }

    // ============ NOT RENEWING ============
    if (action === 'not_renewing') {
      if (!playerId) return Response.json({ error: 'Falta playerId' }, { status: 400 });
      await verifyOwnership(playerId);

      const updated = await base44.asServiceRole.entities.Player.update(playerId, {
        estado_renovacion: 'no_renueva',
        fecha_renovacion: new Date().toISOString(),
        temporada_renovacion: temporada,
      });

      return Response.json({ success: true, player: updated });
    }

    // ============ ADD EXTRA CATEGORY ============
    // Un jugador YA inscrito se apunta a una categoría adicional (ej: Fútbol Sala).
    // Reutiliza su ficha: solo añade la categoría a categorias[] y crea las cuotas.
    if (action === 'add_extra_category') {
      if (!playerId) return Response.json({ error: 'Falta playerId' }, { status: 400 });
      const { categoria } = body;
      if (!categoria) return Response.json({ error: 'Falta categoria' }, { status: 400 });

      const player = await verifyOwnership(playerId);

      // Verificar que la categoría está marcada como disponible como extra
      const configs = await base44.asServiceRole.entities.CategoryConfig.filter({
        nombre: categoria,
        disponible_como_extra: true,
      });
      if (!configs || configs.length === 0) {
        return Response.json({ error: 'Esta categoría no está disponible como actividad extra' }, { status: 400 });
      }

      const norm = (s) => (s == null ? '' : String(s).trim().toLowerCase());
      const existing = Array.isArray(player.categorias) ? player.categorias : [];
      const yaTiene =
        existing.some((c) => norm(c) === norm(categoria)) ||
        norm(player.categoria_principal) === norm(categoria) ||
        norm(player.deporte) === norm(categoria);

      let updated = player;
      if (!yaTiene) {
        updated = await base44.asServiceRole.entities.Player.update(playerId, {
          categorias: [...existing, categoria],
        });
      }

      const createdPayments = [];
      if (Array.isArray(payments) && payments.length > 0) {
        for (const p of payments) {
          const created = await base44.asServiceRole.entities.Payment.create({
            ...p,
            jugador_id: updated.id,
            jugador_nombre: updated.nombre,
          });
          createdPayments.push(created);
        }
      }

      return Response.json({ success: true, player: updated, payments: createdPayments });
    }

    // ============ UPDATE FIELDS ============
    // Un padre/tutor (incluido el segundo progenitor) edita los datos de la ficha.
    // Se hace con service role porque la RLS de Player no permite editar al tutor 2.
    // NO se permite tocar campos sensibles de estado/renovación desde aquí.
    if (action === 'update_fields') {
      if (!playerId) return Response.json({ error: 'Falta playerId' }, { status: 400 });
      if (!playerData) return Response.json({ error: 'Falta playerData' }, { status: 400 });
      const player = await verifyOwnership(playerId);

      // Campos protegidos que un padre NO puede modificar por esta vía
      const PROTECTED = [
        'estado_renovacion', 'activo', 'temporada_renovacion', 'fecha_renovacion',
        'tiene_descuento_hermano', 'descuento_aplicado', 'exento_bloqueo_impago',
        'motivo_exencion_bloqueo', 'ajuste_cuota', 'email_padre',
      ];
      const safeData = { ...playerData };
      for (const key of PROTECTED) delete safeData[key];

      const updated = await base44.asServiceRole.entities.Player.update(playerId, safeData);
      return Response.json({ success: true, player: updated });
    }

    // ============ CREATE WITH PAYMENTS ============
    if (action === 'create_with_payments') {
      if (!playerData) return Response.json({ error: 'Falta playerData' }, { status: 400 });

      // Forzar email_padre = email del usuario autenticado (no se acepta arbitrario)
      const safePlayerData = {
        ...playerData,
        email_padre: user.email,
      };

      const newPlayer = await base44.asServiceRole.entities.Player.create(safePlayerData);

      const createdPayments = [];
      if (Array.isArray(payments) && payments.length > 0) {
        for (const p of payments) {
          const created = await base44.asServiceRole.entities.Payment.create({
            ...p,
            jugador_id: newPlayer.id,
            jugador_nombre: newPlayer.nombre,
          });
          createdPayments.push(created);
        }
      }

      return Response.json({ success: true, player: newPlayer, payments: createdPayments });
    }

    return Response.json({ error: `Acción no soportada: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('[playerRenewalAction] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});