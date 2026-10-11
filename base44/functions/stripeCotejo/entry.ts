import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || (user.role !== 'admin' && !user.es_tesorero)) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    const body = await req.json().catch(() => ({}));
    const db = base44.asServiceRole.entities;

    // Marcar como pagado un pago que Stripe ya cobró
    if (body.action === 'marcar' && body.payment_id) {
      await db.Payment.update(body.payment_id, {
        estado: 'Pagado',
        fecha_pago: body.fecha || new Date().toISOString().slice(0, 10),
      });
      return Response.json({ ok: true });
    }

    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY'));
    // Por defecto: todo el historial de Stripe
    const desde = body.desde ? new Date(body.desde) : new Date('2015-01-01');
    const gte = Math.floor(desde.getTime() / 1000);

    // 1) Cobros de Stripe vs pagos de la app
    const cobros = [];
    const tipoPorPI = {};
    for await (const s of stripe.checkout.sessions.list({ created: { gte }, limit: 100 })) {
      if (s.payment_intent) tipoPorPI[s.payment_intent] = s.metadata?.tipo || 'otro';
      if (s.payment_status !== 'paid') continue;
      const m = s.metadata || {};
      const base = {
        session_id: s.id,
        fecha: new Date(s.created * 1000).toISOString().slice(0, 10),
        importe: (s.amount_total || 0) / 100,
        email: s.customer_details?.email || s.customer_email || m.user_email || '',
        tipo: m.tipo || 'otro',
      };
      if (m.tipo === 'pago_cuota' && m.payment_id) {
        cobros.push({ ...base, payment_ids: [m.payment_id] });
      } else if (m.tipo === 'pago_cuota_batch') {
        let batches = await db.BatchPayment.filter({ stripe_session_id: s.id });
        if (!batches.length && m.batch_id) batches = await db.BatchPayment.filter({ id: m.batch_id });
        const ids = (batches[0]?.items || []).map((i) => i.payment_id).filter(Boolean);
        cobros.push({ ...base, payment_ids: ids });
      } else {
        cobros.push({ ...base, payment_ids: [] });
      }
    }

    const allIds = [...new Set(cobros.flatMap((c) => c.payment_ids))];
    const pagos = allIds.length ? await db.Payment.filter({ id: { $in: allIds } }) : [];
    const byId = Object.fromEntries(pagos.map((p) => [p.id, p]));

    const descuadres = [];
    let cuadrados = 0;
    for (const c of cobros) {
      for (const pid of c.payment_ids) {
        const p = byId[pid];
        if (!p) {
          descuadres.push({ ...c, payment_id: pid, problema: 'no_existe' });
        } else if (p.estado !== 'Pagado') {
          descuadres.push({
            ...c, payment_id: pid, problema: 'pendiente_en_app',
            jugador: p.jugador_nombre, mes: p.mes, estado_app: p.estado, cantidad_app: p.cantidad,
          });
        } else cuadrados++;
      }
    }
    const sinVincular = cobros.filter((c) => !c.payment_ids.length && String(c.tipo).startsWith('pago_cuota'));

    // 2) Comisiones por mes y desglose por partidas
    const meses = {};
    const partidas = {};
    const gastos = { devoluciones: 0, otras_comisiones: 0 };
    for await (const t of stripe.balanceTransactions.list({ created: { gte }, limit: 100, expand: ['data.source'] })) {
      if (t.type === 'refund' || t.type === 'payment_refund') { gastos.devoluciones += -t.amount / 100; continue; }
      if (t.type === 'stripe_fee' || t.type === 'adjustment' || t.type === 'payment_failure_refund') { gastos.otras_comisiones += -t.net / 100; continue; }
      if (t.type !== 'charge' && t.type !== 'payment') continue;
      const tipo = tipoPorPI[t.source?.payment_intent] || 'otro';
      partidas[tipo] = partidas[tipo] || { tipo, cobros: 0, bruto: 0, comision: 0, neto: 0 };
      partidas[tipo].cobros++;
      partidas[tipo].bruto += t.amount / 100;
      partidas[tipo].comision += t.fee / 100;
      partidas[tipo].neto += t.net / 100;
      const k = new Date(t.created * 1000).toISOString().slice(0, 7);
      meses[k] = meses[k] || { mes: k, cobros: 0, bruto: 0, comision: 0, neto: 0 };
      meses[k].cobros++;
      meses[k].bruto += t.amount / 100;
      meses[k].comision += t.fee / 100;
      meses[k].neto += t.net / 100;
    }

    return Response.json({
      desde: body.desde ? desde.toISOString().slice(0, 10) : null,
      total_cobros: cobros.length,
      cuadrados,
      descuadres,
      sin_vincular: sinVincular,
      partidas: Object.values(partidas).sort((a, b) => b.bruto - a.bruto),
      gastos,
      comisiones: Object.values(meses).sort((a, b) => b.mes.localeCompare(a.mes)),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});