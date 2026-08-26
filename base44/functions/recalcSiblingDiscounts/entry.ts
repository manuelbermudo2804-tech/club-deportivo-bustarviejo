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

    // Detectar contexto: automation o llamada manual
    const automationData = body.data || body.old_data;
    let emailsAfectados = new Set();

    if (body.email_padre) {
      // Llamada manual
      emailsAfectados.add(String(body.email_padre).toLowerCase());
    } else if (automationData) {
      // ANTI-BUCLE: si el único cambio fue en los campos que ESTA función escribe
      // (tiene_descuento_hermano / descuento_aplicado), no hacemos nada. Así el
      // update que hace la propia función no vuelve a disparar la automatización.
      const changed = body.changed_fields || [];
      const soloCamposPropios = changed.length > 0 && changed.every(
        (f) => f === 'tiene_descuento_hermano' || f === 'descuento_aplicado'
      );
      if (soloCamposPropios) {
        return Response.json({ skipped: true, reason: 'solo_cambios_propios_anti_bucle' });
      }

      // Automation: recoger emails del jugador modificado
      if (automationData.email_padre) emailsAfectados.add(String(automationData.email_padre).toLowerCase());
      if (automationData.email_tutor_2) emailsAfectados.add(String(automationData.email_tutor_2).toLowerCase());
      if (body.old_data?.email_padre) emailsAfectados.add(String(body.old_data.email_padre).toLowerCase());
    } else {
      return Response.json({ error: 'No data provided' }, { status: 400 });
    }

    const results = [];

    // Config de cuotas por categoría (para recalcular importes pendientes)
    const categoryConfigs = await base44.asServiceRole.entities.CategoryConfig.list('-created_date', 300).catch(() => []);
    const CATEGORY_NAME_MAPPING = {
      "Fútbol Aficionado": "AFICIONADO", "Fútbol Juvenil": "JUVENIL", "Fútbol Cadete": "CADETE",
      "Fútbol Infantil (Mixto)": "INFANTIL", "Fútbol Alevín (Mixto)": "ALEVIN",
      "Fútbol Alevín Femenino": "Alevin Femenino", "Fútbol Benjamín (Mixto)": "BENJAMIN",
      "Fútbol Pre-Benjamín (Mixto)": "PRE-BENJAMIN", "Fútbol Femenino": "FEMENINO",
      "Baloncesto (Mixto)": "BALONCESTO"
    };
    const getCuotas = (categoria) => {
      if (!categoria) return null;
      const mapped = CATEGORY_NAME_MAPPING[categoria] || categoria;
      const c = categoryConfigs.find(x => x.activa && (x.nombre === categoria || x.nombre === mapped));
      return c ? { inscripcion: c.cuota_inscripcion, total: c.cuota_total } : null;
    };

    /**
     * Ajusta el importe del pago PENDIENTE que lleva el descuento:
     * - Pago "Único": cuota_total - descuento
     * - Fraccionado: la cuota de Junio (inscripción) - descuento
     * Nunca toca pagos ya pagados, en revisión o anulados.
     */
    const ajustarPagoPendiente = async (player, descuento) => {
      const cuotas = getCuotas(player.categoria_principal || player.deporte);
      if (!cuotas) return null;
      const pagos = await base44.asServiceRole.entities.Payment.filter({ jugador_id: player.id }).catch(() => []);
      const candidatos = pagos.filter(p => !p.is_deleted && p.estado === 'Pendiente' && (p.tipo_pago === 'Único' || p.mes === 'Junio'));
      const ajustes = [];
      for (const pago of candidatos) {
        const base = pago.tipo_pago === 'Único' ? cuotas.total : cuotas.inscripcion;
        if (!base) continue;
        const target = Math.max(0, base - descuento);
        if (pago.cantidad !== target) {
          await base44.asServiceRole.entities.Payment.update(pago.id, { cantidad: target });
          ajustes.push({ pago_id: pago.id, antes: pago.cantidad, ahora: target });
        }
      }
      return ajustes;
    };

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
      // Si hay empate de fecha (mellizos/gemelos), el "mayor" es el inscrito primero,
      // para que el descuento recaiga en el hermano inscrito después (con pagos pendientes).
      activeForDiscount.sort((a, b) => {
        const diff = new Date(a.fecha_nacimiento) - new Date(b.fecha_nacimiento);
        if (diff !== 0) return diff;
        return new Date(a.created_date || 0) - new Date(b.created_date || 0);
      });
      const oldestId = activeForDiscount[0].id;

      // Recalcular: mayor sin descuento, resto con 25€
      let updated = 0;
      const ajustesPagos = [];
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

        // Ajustar SIEMPRE el importe pendiente para que coincida con el descuento real
        const ajustes = await ajustarPagoPendiente(p, targetAmount);
        if (ajustes && ajustes.length) ajustesPagos.push({ jugador: p.nombre, ajustes });
      }

      results.push({ email, total: activeForDiscount.length, updated, oldest_id: oldestId, pagos_ajustados: ajustesPagos });
    }

    return Response.json({ success: true, results });
  } catch (error) {
    console.error('Error in recalcSiblingDiscounts:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});