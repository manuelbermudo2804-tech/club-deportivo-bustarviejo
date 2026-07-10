import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Recalcula descuentos por hermanos para todos los jugadores activos de UNA familia.
 *
 * Reglas:
 * - "Activos" = activo:true Y estado_renovacion !== 'no_renueva'
 * - El MAYOR de la familia (fecha de nacimiento más antigua) NO tiene descuento.
 * - El resto SÍ tiene descuento de 25 €.
 * - Se recalcula respecto al estado actual (si el mayor se da de baja, el siguiente
 *   pasa a pagar íntegro y los demás siguen con descuento).
 *
 * Se invoca:
 *  - Como automation entity (on update Player) cuando cambia estado_renovacion / activo / fecha_nacimiento.
 *  - Manualmente con { email_padre } para forzar recálculo de toda una familia.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // SEGURIDAD: esta función es SOLO manual. Si llega como automation de entidad
    // (trae body.data / body.old_data / body.event) la rechazamos para evitar
    // el bucle en cascada que dispararon updates de Player entre hermanos.
    if (body.event || (body.data && !body.email_padre) || (body.old_data && !body.email_padre)) {
      return Response.json({ skipped: true, reason: 'automation_disabled_manual_only' });
    }

    // Solo llamada manual con email_padre explícito
    let emailsAfectados = new Set();
    if (body.email_padre) {
      emailsAfectados.add(String(body.email_padre).toLowerCase());
    } else {
      return Response.json({ error: 'email_padre requerido (función solo manual)' }, { status: 400 });
    }

    const results = [];

    for (const email of emailsAfectados) {
      if (!email) continue;

      // Buscar jugadores de esta familia (por email_padre o email_tutor_2)
      const [byPadre, byTutor] = await Promise.all([
        base44.asServiceRole.entities.Player.filter({ email_padre: email }).catch(() => []),
        base44.asServiceRole.entities.Player.filter({ email_tutor_2: email }).catch(() => []),
      ]);

      const familyMap = new Map();
      [...byPadre, ...byTutor].forEach(p => familyMap.set(p.id, p));
      const familyPlayers = Array.from(familyMap.values());

      // Filtrar SOLO jugadores activos (no incluir no_renueva ni inactivos)
      const activeForDiscount = familyPlayers.filter(p =>
        p.activo === true &&
        p.estado_renovacion !== 'no_renueva' &&
        p.fecha_nacimiento
      );

      if (activeForDiscount.length === 0) {
        results.push({ email, updated: 0, reason: 'no_active_players' });
        continue;
      }

      // Ordenar por fecha de nacimiento (el MAYOR es la fecha más antigua)
      activeForDiscount.sort((a, b) => new Date(a.fecha_nacimiento) - new Date(b.fecha_nacimiento));
      const oldestId = activeForDiscount[0].id;

      // Recalcular: mayor sin descuento, resto con 25€
      let updated = 0;
      for (const p of activeForDiscount) {
        const shouldHaveDiscount = p.id !== oldestId;
        const currentlyHas = p.tiene_descuento_hermano === true;
        const currentAmount = p.descuento_aplicado || 0;
        const targetAmount = shouldHaveDiscount ? 25 : 0;

        if (shouldHaveDiscount !== currentlyHas || currentAmount !== targetAmount) {
          await base44.asServiceRole.entities.Player.update(p.id, {
            tiene_descuento_hermano: shouldHaveDiscount,
            descuento_aplicado: targetAmount
          });
          updated += 1;
        }
      }

      results.push({ email, total: activeForDiscount.length, updated, oldest_id: oldestId });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('Error in recalcSiblingDiscounts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});