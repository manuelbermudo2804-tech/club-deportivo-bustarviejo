import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { budgetId } = await req.json();

    if (!budgetId) {
      return Response.json({ error: 'budgetId required' }, { status: 400 });
    }

    const budgets = await base44.entities.Budget.list();
    const budget = budgets.find(b => b.id === budgetId);

    if (!budget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Obtener datos para cálculos automáticos
    const [players, payments, seasonConfigs] = await Promise.all([
      base44.entities.Player.list(),
      base44.entities.Payment.list(),
      base44.entities.SeasonConfig.list()
    ]);

    // Obtener cuota de la temporada
    const seasonConfig = seasonConfigs.find(s => s.temporada === budget.temporada);
    const cuotaUnica = seasonConfig?.cuota_unica || 0;

    const xlsx = await import('npm:xlsx@0.18.5');
    const XLSX = xlsx.default;

    // Obtener partidas del presupuesto o generar automáticas
    let partidas = budget.partidas || [];
    
    // Si no hay partidas, generarlas automáticamente
    if (partidas.length === 0) {
      // Contar jugadores por categoría
      const playersByCategory = {};
      players.forEach(p => {
        if (p.activo && (p.categoria_principal || p.deporte)) {
          const cat = p.categoria_principal || p.deporte;
          playersByCategory[cat] = (playersByCategory[cat] || 0) + 1;
        }
      });

      // Generar partidas de ingresos por categoría
      partidas = Object.entries(playersByCategory).map(([categoria, count]) => ({
        nombre: `Cuotas ${categoria}`,
        categoria: 'Ingresos',
        presupuestado: count * cuotaUnica,
        ejecutado: 0,
        id: Math.random().toString()
      }));
    }

    // Calcular ejecutado real desde payments
    const paymentsByPartida = {};
    payments.forEach(p => {
      if (p.temporada === budget.temporada && p.estado === 'Pagado') {
        const key = p.jugador_id || 'sin_asignar';
        paymentsByPartida[key] = (paymentsByPartida[key] || 0) + (p.cantidad || 0);
      }
    });

    // Actualizar ejecutado en las partidas
    partidas = partidas.map(p => {
      if (p.categoria === 'Ingresos') {
        // Calcular ejecutado sumando todos los pagos
        const totalEjecutado = Object.values(paymentsByPartida).reduce((sum, amount) => sum + amount, 0);
        return { ...p, ejecutado: totalEjecutado };
      }
      return p;
    });

    const categorías = ['Ingresos', 'Gastos Fijos', 'Gastos Variables', 'Inversiones'];
    
    // Crear datos en formato de array
    const data = [];
    
    // Título
    data.push([budget.nombre || 'Presupuesto', '', '', '']);
    data.push([`Temporada ${budget.temporada}`, '', '', '']);
    data.push(['', '', '', '']);
    
    // Encabezados
    data.push(['Partida', 'Presupuestado', 'Ejecutado', 'Diferencia']);

    // Datos por categoría
    categorías.forEach(categoria => {
      const items = partidas.filter(p => p.categoria === categoria);
      
      if (items.length === 0) return;

      // Título de categoría
      data.push([categoria.toUpperCase(), '', '', '']);

      // Items
      items.forEach(item => {
        const diff = (item.presupuestado || 0) - (item.ejecutado || 0);
        data.push([
          item.nombre || '',
          item.presupuestado || 0,
          item.ejecutado || 0,
          diff
        ]);
      });

      // Subtotal
      const subtotalPres = items.reduce((sum, i) => sum + (i.presupuestado || 0), 0);
      const subtotalEjec = items.reduce((sum, i) => sum + (i.ejecutado || 0), 0);
      data.push([
        `SUBTOTAL ${categoria}`,
        subtotalPres,
        subtotalEjec,
        subtotalPres - subtotalEjec
      ]);
      data.push(['', '', '', '']);
    });

    // Total general
    const totalPres = budget.total_presupuestado_ingresos + (budget.total_presupuestado_gastos || 0);
    const totalEjec = budget.total_ejecutado_ingresos + (budget.total_ejecutado_gastos || 0);
    data.push([
      'TOTAL GENERAL',
      totalPres,
      totalEjec,
      totalPres - totalEjec
    ]);

    // Crear worksheet
    const ws = XLSX.utils.aoa_to_sheet(data);
    
    // Ancho de columnas
    ws['!cols'] = [
      { wch: 30 },
      { wch: 15 },
      { wch: 15 },
      { wch: 15 }
    ];

    // Crear workbook y añadir worksheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto');
    
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const base64 = btoa(String.fromCharCode(...new Uint8Array(excelBuffer)));

    return Response.json({
      file_base64: base64,
      filename: `Presupuesto_${(budget.nombre || 'presupuesto').replace(/\s+/g, '_')}_${budget.temporada}.xlsx`
    });

  } catch (error) {
    console.error('Error generating Excel:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});