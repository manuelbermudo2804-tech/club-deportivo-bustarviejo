import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function parseSeasonRange(seasonStr, fallbackStart, fallbackEnd) {
  try {
    if (!seasonStr || !/[\/-]/.test(seasonStr)) return { start: fallbackStart, end: fallbackEnd };
    const [y1, y2] = seasonStr.split(/[\/-]/).map(s => parseInt(s, 10));
    // Temporada estándar: 1 Sep (y1) a 30 Jun (y2)
    const start = new Date(y1, 8, 1);
    const end = new Date(y2, 5, 30, 23, 59, 59, 999);
    return { start, end };
  } catch {
    return { start: fallbackStart, end: fallbackEnd };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { budgetId } = await req.json();
    if (!budgetId) return Response.json({ error: 'Missing budgetId' }, { status: 400 });

    const budgets = await base44.entities.Budget.filter({ id: budgetId });
    const budget = budgets[0];
    if (!budget) return Response.json({ error: 'Budget not found' }, { status: 404 });

    // Temporada y rango de fechas
    const activeConfigs = await base44.entities.SeasonConfig.filter({ activa: true });
    const active = activeConfigs[0] || null;
    const seasonStr = budget.temporada || active?.temporada || '';
    const normalizeSeason = (value) => String(value || '').replace(/[^\d]/g, '');
    const targetSeasonKey = normalizeSeason(seasonStr);
    const activeSeasonMatchesBudget = Boolean(active?.temporada && normalizeSeason(active.temporada) === targetSeasonKey);
    const { start: fallbackStart, end: fallbackEnd } = { start: new Date(new Date().getFullYear(), 0, 1), end: new Date() };
    const { start: seasonStart, end: seasonEnd } = activeSeasonMatchesBudget && active?.fecha_inicio && active?.fecha_fin
      ? { start: new Date(active.fecha_inicio), end: new Date(active.fecha_fin) }
      : parseSeasonRange(seasonStr, fallbackStart, fallbackEnd);

    // Helpers
    const sum = (arr, sel) => (arr || []).reduce((acc, x) => acc + (Number(sel(x)) || 0), 0);
    const inRange = (d) => {
      if (!d) return true;
      try { const dt = new Date(d); return !Number.isNaN(dt.getTime()) && dt >= seasonStart && dt <= seasonEnd; } catch { return false; }
    };
    const normalizeText = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
    let seasonTransactions = [];
    try {
      const allTransactions = await base44.entities.FinancialTransaction.list('-fecha');
      seasonTransactions = (allTransactions || []).filter(t => {
        const txSeason = normalizeSeason(t.temporada);
        return txSeason ? txSeason === targetSeasonKey : inRange(t.fecha);
      });
    } catch (error) {
      console.warn('No se pudieron cargar los movimientos financieros para el presupuesto:', error?.message || error);
    }
    const isSettledTransaction = (t) =>
      t.estado === 'Pagado' ||
      t.estado === 'Cobrado' ||
      (t.automatico === true && t.estado !== 'Anulado') ||
      (!t.estado && Boolean(t.fecha_pago));
    const settledTransactions = seasonTransactions.filter(t => isSettledTransaction(t) && t.estado !== 'Anulado');

    // 1) Inscripciones Jugadores
      // PRESUPUESTADO = suma de TODAS las cuotas creadas (cualquier estado) deduplicadas por jugador/mes/modo
      // EJECUTADO = suma de las mismas cuotas pero solo con estado 'Pagado'
      let inscripciones = 0;
      let inscripcionesPresupuestado = 0;
      try {
        const paymentsRaw = await base44.entities.Payment.list();
        const allPayments = (paymentsRaw || []).filter(p =>
          normalizeSeason(p.temporada) === targetSeasonKey && p.is_deleted !== true
        );

        // Dedupe por clave estable: plan:jugador:mes | unico:jugador | mes:jugador:mes
        const rank = (s) => (s === 'Pagado' ? 3 : s === 'En revisión' ? 2 : s === 'Pendiente' ? 1 : 0);
        const byKey = {};
        (allPayments || []).forEach(p => {
          const tipo = (p.tipo_pago || '').toLowerCase();
          let key = '';
          if (tipo.includes('plan')) key = `plan:${p.jugador_id}:${p.mes || p.id}`;
          else if (tipo.includes('único') || tipo.includes('unico')) key = `unico:${p.jugador_id}`;
          else key = `mes:${p.jugador_id}:${p.mes || p.id}`;
          if (!byKey[key] || rank(p.estado) > rank(byKey[key].estado)) byKey[key] = p;
        });

        const deduped = Object.values(byKey);
        inscripcionesPresupuestado = deduped.reduce((sum, p) => sum + (Number(p.cantidad) || 0), 0);
        inscripciones = deduped.filter(p => p.estado === 'Pagado').reduce((sum, p) => sum + (Number(p.cantidad) || 0), 0);

        // Incluir cuotas de Plan Especial activas sin pagos creados aún
        try {
          const allPlans = await base44.entities.CustomPaymentPlan.list();
          const activePlans = (allPlans || []).filter(pl => pl.estado === 'Activo' && (!pl.temporada || normalizeSeason(pl.temporada) === targetSeasonKey));
          const covered = new Set(deduped.filter(p => (p.tipo_pago || '').toLowerCase().includes('plan')).map(p => `${p.jugador_id}:${p.mes || p.id}`));
          activePlans.forEach(pl => {
            (pl.cuotas || []).forEach((c, idx) => {
              const k = `${pl.jugador_id}:${c.mes || idx}`;
              if (!covered.has(k)) inscripcionesPresupuestado += Number(c.cantidad) || 0;
            });
          });
        } catch {}
      } catch {}

    // 2) Cuotas Socios -> ClubMember.estado_pago==Pagado multiplicado por precio_socio
    let socios = 0;
    try {
      const precioSocio = Number(active?.precio_socio) || 25;
      const miembros = await base44.entities.ClubMember.filter({ estado_pago: 'Pagado' });
      const miembrosTemporada = (miembros || []).filter(m => !m.temporada || m.temporada === seasonStr || inRange(m.fecha_pago));
      socios = (miembrosTemporada.length || 0) * precioSocio;
    } catch {}

    // 3) Patrocinios: usar movimientos cobrados si existen; mantener compatibilidad con temporadas antiguas sin asientos.
    let patrocinios = 0;
    try {
      const sponsorshipTransactions = seasonTransactions.filter(t => t.categoria === 'Patrocinios' && t.tipo === 'Ingreso' && t.estado !== 'Anulado');
      const settledSponsorshipTransactions = sponsorshipTransactions.filter(isSettledTransaction);
      if (settledSponsorshipTransactions.length) {
        patrocinios = sum(settledSponsorshipTransactions, t => t.cantidad);
      } else {
        const sponsors = await base44.entities.Sponsor.filter({ activo: true });
        const inSeason = (s) => inRange(s.fecha_inicio) || inRange(s.fecha_fin);
        patrocinios = sum((sponsors || []).filter(inSeason), s => s.precio_anual || 0);
      }
    } catch {}

    // 4) Lotería Navidad: usar movimientos cobrados si existen; fallback a pedidos pagados.
    let loteria = 0;
    try {
      const lotteryTransactions = seasonTransactions.filter(t => t.categoria === 'Lotería' && t.tipo === 'Ingreso' && t.estado !== 'Anulado');
      const settledLotteryTransactions = lotteryTransactions.filter(isSettledTransaction);
      if (settledLotteryTransactions.length) {
        loteria = sum(settledLotteryTransactions, t => t.cantidad);
      } else {
        const orders = await base44.entities.LotteryOrder.filter({ temporada: seasonStr, pagado: true });
        if (orders?.length) {
          const precioDecimo = Number(active?.precio_decimo_loteria) || 22;
          loteria = orders.reduce((acc, o) => {
            const n = Number(o.decimos || o.cantidad || 0);
            const total = Number(o.total || 0);
            return acc + (total > 0 ? total : n * precioDecimo);
          }, 0);
        }
      }
    } catch {}

    // 5) Venta Equipación -> ClothingOrder.pagado==true
    let equipacion = 0;
    try {
      const pedidos = await base44.entities.ClothingOrder.filter({ temporada: seasonStr, pagado: true });
      equipacion = sum(pedidos, p => (p.precio_final ?? p.precio_total) || 0);
    } catch {}

    // Merge en partidas existentes o crear si faltan
    const ensurePartida = (arr, nombre, categoria, ejecutado, presupuestado) => {
      if (ejecutado == null && presupuestado == null) return arr;
      const key = (p) => `${(p.nombre||'').toLowerCase()}|${(p.categoria||'').toLowerCase()}`;
      const targetKey = `${nombre.toLowerCase()}|${categoria.toLowerCase()}`;
      const idx = (arr || []).findIndex(p => key(p) === targetKey || (p.nombre||'').toLowerCase() === nombre.toLowerCase());
      if (idx >= 0) {
        const updated = [...arr];
        updated[idx] = { 
          ...updated[idx], 
          ejecutado: ejecutado != null ? Number(ejecutado) : updated[idx].ejecutado,
          presupuestado: presupuestado != null ? Number(presupuestado) : updated[idx].presupuestado
        };
        return updated;
      }
      return [ ...(arr || []), { 
        id: `partida_exec_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, 
        nombre, 
        categoria, 
        presupuestado: presupuestado != null ? Number(presupuestado) : 0, 
        ejecutado: ejecutado != null ? Number(ejecutado) : 0
      } ];
    };

    let partidas = budget.partidas || [];
    partidas = ensurePartida(partidas, 'Inscripciones Jugadores', 'Ingresos', inscripciones, inscripcionesPresupuestado);
    partidas = ensurePartida(partidas, 'Cuotas Socios', 'Ingresos', socios);
    partidas = ensurePartida(partidas, 'Patrocinios', 'Ingresos', patrocinios);
    partidas = ensurePartida(partidas, 'Lotería Navidad', 'Ingresos', loteria);
    partidas = ensurePartida(partidas, 'Venta Equipación', 'Ingresos', equipacion);

    // Actualizar el ejecutado de las demás partidas con movimientos cobrados/pagados.
    // Las cinco partidas anteriores tienen una fuente específica para evitar duplicar cuotas/pedidos.
    const partidasConFuentePropia = new Set([
      'inscripciones jugadores', 'cuotas socios', 'patrocinios', 'lotería navidad', 'venta equipación'
    ]);
    partidas = (partidas || []).map(partida => {
      if (partidasConFuentePropia.has(normalizeText(partida.nombre))) return partida;
      const esIngreso = partida.categoria === 'Ingresos';
      const movimientosPartida = settledTransactions.filter(t => {
        if (t.tipo !== (esIngreso ? 'Ingreso' : 'Gasto')) return false;
        if (t.partida_id) return t.partida_id === partida.id;
        if (t.partida_nombre) return normalizeText(t.partida_nombre) === normalizeText(partida.nombre);
        return normalizeText(t.categoria) === normalizeText(partida.nombre);
      });
      if (!movimientosPartida.length) return partida;
      return {
        ...partida,
        ejecutado: sum(movimientosPartida, t => t.cantidad)
      };
    });

    await base44.asServiceRole.entities.Budget.update(budgetId, {
      partidas,
      fecha_ultima_actualizacion_ejecutado: new Date().toISOString()
    });

    return Response.json({
      success: true,
      season: seasonStr,
      ejecutado: { inscripciones, socios, patrocinios, loteria, equipacion }
    });
  } catch (err) {
    console.error('updateBudgetExecuted error:', err);
    return Response.json({ error: err?.message || 'Internal error' }, { status: 500 });
  }
});