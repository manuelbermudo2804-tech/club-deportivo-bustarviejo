import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const {
      jugador_nombre,
      temporada,
      mes = 'Junio',
      cantidad,
      metodo_pago = 'Tarjeta'
    } = body || {};

    if (!jugador_nombre || !temporada || !mes) {
      return Response.json({ error: 'Missing params: jugador_nombre, temporada, mes' }, { status: 400 });
    }

    const temporadaNorm = String(temporada).replace(/-/g, '/');
    const today = new Date().toISOString().split('T')[0];

    // 1) Buscar jugador por nombre exacto
    const players = await base44.asServiceRole.entities.Player.filter({ nombre: jugador_nombre });
    if (!players || players.length === 0) {
      return Response.json({ error: `Jugador no encontrado: ${jugador_nombre}` }, { status: 404 });
    }
    if (players.length > 1) {
      return Response.json({ error: `Se encontraron varios jugadores con ese nombre. Especifica ID.`, count: players.length }, { status: 400 });
    }
    const player = players[0];

    // 2) Buscar Payment existente (misma temporada/mes/jugador)
    const payments = await base44.asServiceRole.entities.Payment.filter({
      jugador_id: player.id,
      temporada: { $in: [temporada, temporadaNorm] },
      mes
    });

    let payment = payments?.[0] || null;

    // 3) Si no existe, crearlo
    if (!payment) {
      const cantidadFinal = typeof cantidad === 'number' ? cantidad : 0;
      payment = await base44.asServiceRole.entities.Payment.create({
        jugador_id: player.id,
        jugador_nombre: player.nombre,
        tipo_pago: 'Tres meses',
        mes,
        temporada: temporadaNorm,
        cantidad: cantidadFinal,
        estado: 'Pendiente',
        metodo_pago: metodo_pago
      });
    }

    // 4) Marcar como Pagado
    await base44.asServiceRole.entities.Payment.update(payment.id, {
      estado: 'Pagado',
      metodo_pago,
      fecha_pago: today
    });

    // 5) Crear asiento si no existe
    const existentes = await base44.asServiceRole.entities.FinancialTransaction.filter({
      referencia_origen: payment.id,
      categoria: 'Cuotas'
    });

    if (!existentes || existentes.length === 0) {
      await base44.asServiceRole.entities.FinancialTransaction.create({
        tipo: 'Ingreso',
        concepto: `Cuota ${mes}`.trim(),
        cantidad: payment.cantidad ?? (typeof cantidad === 'number' ? cantidad : 0),
        fecha: today,
        categoria: 'Cuotas',
        subtipo_documento: 'Cuota',
        metodo_pago,
        temporada: temporadaNorm,
        proveedor_cliente: player.nombre,
        automatico: true,
        referencia_origen: payment.id,
      });
    }

    // 6) Devolver resultado
    const updated = await base44.asServiceRole.entities.Payment.filter({ id: payment.id });
    return Response.json({ success: true, payment: updated?.[0] || payment });
  } catch (err) {
    console.error('[markPaymentPaid] Error:', err);
    return Response.json({ error: err.message }, { status: 500 });
  }
});