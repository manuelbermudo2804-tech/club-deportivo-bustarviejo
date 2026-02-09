import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function parseSeasonRange(seasonStr, fallbackStart, fallbackEnd) {
  try {
    if (!seasonStr || !seasonStr.includes('/')) return { start: fallbackStart, end: fallbackEnd };
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
    const { start: fallbackStart, end: fallbackEnd } = { start: new Date(new Date().getFullYear(), 0, 1), end: new Date() };
    const { start: seasonStart, end: seasonEnd } = active?.fecha_inicio && active?.fecha_fin
      ? { start: new Date(active.fecha_inicio), end: new Date(active.fecha_fin) }
      : parseSeasonRange(seasonStr, fallbackStart, fallbackEnd);

    // Helpers
    const sum = (arr, sel) => (arr || []).reduce((acc, x) => acc + (Number(sel(x)) || 0), 0);
    const inRange = (d) => {
      if (!d) return true;
      try { const dt = new Date(d); return dt >= seasonStart && dt <= seasonEnd; } catch { return true; }
    };

    // 1) Inscripciones Jugadores -> Payment.estado==Pagado && temporada==budget.temporada
    // PRESUPUESTADO: jugadores activos × cuota única
    let inscripciones = 0;
    let inscripcionesPresupuestado = 0;
    try {
      const pagos = await base44.entities.Payment.filter({ temporada: seasonStr, estado: 'Pagado', is_deleted: false });
      inscripciones = sum(pagos, p => p.cantidad);
      
      // Calcular presupuestado: jugadores activos × cuota_unica
      const jugadores = await base44.entities.Player.list();
      const jugadoresActivos = jugadores.filter(p => p.activo === true).length;
      const cuotaUnica = Number(active?.cuota_unica) || 0;
      inscripcionesPresupuestado = jugadoresActivos * cuotaUnica;
    } catch {}

    // 2) Cuotas Socios -> ClubMember.estado_pago==Pagado multiplicado por precio_socio
    let socios = 0;
    try {
      const precioSocio = Number(active?.precio_socio) || 25;
      const miembros = await base44.entities.ClubMember.filter({ estado_pago: 'Pagado' });
      const miembrosTemporada = (miembros || []).filter(m => !m.temporada || m.temporada === seasonStr || inRange(m.fecha_pago));
      socios = (miembrosTemporada.length || 0) * precioSocio;
    } catch {}

    // 3) Patrocinios -> Preferir FinancialTransaction.categoria==='Patrocinios'; fallback a Sponsor.precio_anual activos en rango
    let patrocinios = 0;
    try {
      try {
        const tx = await base44.entities.FinancialTransaction.filter({ categoria: 'Patrocinios', temporada: seasonStr });
        patrocinios = sum(tx, t => t.importe || t.amount || 0);
      } catch {
        const sponsors = await base44.entities.Sponsor.filter({ activo: true });
        const inSeason = (s) => inRange(s.fecha_inicio) || inRange(s.fecha_fin);
        patrocinios = sum((sponsors || []).filter(inSeason), s => s.precio_anual || 0);
      }
    } catch {}

    // 4) Lotería Navidad -> Preferir FinancialTransaction.categoria==='Lotería'; fallback a LotteryOrder pagados
    let loteria = 0;
    try {
      try {
        const tx = await base44.entities.FinancialTransaction.filter({ categoria: 'Lotería', temporada: seasonStr });
        loteria = sum(tx, t => t.importe || t.amount || 0);
      } catch {
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
    const ensurePartida = (arr, nombre, categoria, ejecutado) => {
      if (ejecutado == null) return arr;
      const key = (p) => `${(p.nombre||'').toLowerCase()}|${(p.categoria||'').toLowerCase()}`;
      const targetKey = `${nombre.toLowerCase()}|${categoria.toLowerCase()}`;
      const idx = (arr || []).findIndex(p => key(p) === targetKey || (p.nombre||'').toLowerCase() === nombre.toLowerCase());
      if (idx >= 0) {
        const updated = [...arr];
        updated[idx] = { ...updated[idx], ejecutado: Number(ejecutado) };
        return updated;
      }
      return [ ...(arr || []), { id: `partida_exec_${Date.now()}_${Math.random().toString(36).slice(2,8)}`, nombre, categoria, presupuestado: 0, ejecutado: Number(ejecutado) } ];
    };

    let partidas = budget.partidas || [];
    partidas = ensurePartida(partidas, 'Inscripciones Jugadores', 'Ingresos', inscripciones);
    partidas = ensurePartida(partidas, 'Cuotas Socios', 'Ingresos', socios);
    partidas = ensurePartida(partidas, 'Patrocinios', 'Ingresos', patrocinios);
    partidas = ensurePartida(partidas, 'Lotería Navidad', 'Ingresos', loteria);
    partidas = ensurePartida(partidas, 'Venta Equipación', 'Ingresos', equipacion);

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