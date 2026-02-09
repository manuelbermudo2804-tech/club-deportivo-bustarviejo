import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user?.role === 'admin') {
      return Response.json({ error: 'Solo admins pueden sincronizar' }, { status: 403 });
    }

    const { action, sheetId } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // ACCIÓN 1: Crear Sheet nuevo (3 hojas)
    if (action === 'createSheet') {
      const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `Presupuesto CD Bustarviejo - 2024/2025`
          },
          sheets: [
            { properties: { title: 'Presupuestos', gridProperties: { frozenRowCount: 1 } } },
            { properties: { title: 'Ingresos', gridProperties: { frozenRowCount: 1 } } },
            { properties: { title: 'Resumen', gridProperties: { frozenRowCount: 1 } } }
          ]
        })
      });

      const newSheet = await createResponse.json();
      const spreadsheetId = newSheet.spreadsheetId;

      // Guardar en SeasonConfig
      const configs = await base44.entities.SeasonConfig.filter({ activa: true });
      if (configs[0]) {
        await base44.asServiceRole.entities.SeasonConfig.update(configs[0].id, {
          google_sheets_id: spreadsheetId
        });
      }

      return Response.json({ success: true, spreadsheetId });
    }

    // ACCIÓN 2: Sincronizar datos a Sheets (se llamará automáticamente)
    if (action === 'syncToSheet') {
      if (!sheetId) return Response.json({ error: 'No hay sheet' }, { status: 400 });

      // 1. Obtener Presupuestos (gastos) - de Budget entity
      const budgets = await base44.entities.Budget.filter({ activo: true });
      const budget = budgets[0];
      const presupuestosData = [
        ['Categoría', 'Concepto', 'Presupuestado (€)', 'Ejecutado (€)', 'Desviación', '% Ejecución']
      ];
      
      if (budget?.partidas) {
        budget.partidas.forEach(p => {
          presupuestosData.push([
            p.categoria || '',
            p.nombre || '',
            p.presupuestado || 0,
            p.ejecutado || 0,
            (p.ejecutado || 0) - (p.presupuestado || 0),
            p.presupuestado > 0 ? ((p.ejecutado || 0) / p.presupuestado * 100).toFixed(1) : 0
          ]);
        });
      }

      // 2. Obtener Ingresos (cálculos automáticos)
      const players = await base44.entities.Player.filter({ activo: true });
      const payments = await base44.entities.Payment.filter({ estado: 'Pagado' });
      const seasonConfigs = await base44.entities.SeasonConfig.filter({ activa: true });
      const seasonConfig = seasonConfigs[0];

      // Ingresos previstos por categoría
      const categoriesMap = {};
      players.forEach(p => {
        const cat = p.categoria_principal || 'Sin asignar';
        if (!categoriesMap[cat]) categoriesMap[cat] = 0;
        categoriesMap[cat]++;
      });

      const ingresosData = [
        ['Concepto', 'Presupuestado (€)', 'Real (€)', 'Desviación', '% Cumplimiento']
      ];

      // Agregar cuotas por categoría
      Object.entries(categoriesMap).forEach(([cat, count]) => {
        const presupuestado = count * (seasonConfig?.cuota_unica || 0);
        const real = payments.filter(p => p.jugador_categoria === cat).reduce((sum, p) => sum + p.cantidad, 0);
        ingresosData.push([
          `Cuotas ${cat}`,
          presupuestado,
          real,
          real - presupuestado,
          presupuestado > 0 ? ((real / presupuestado) * 100).toFixed(1) : 0
        ]);
      });

      // Agregar otros ingresos
      const totalPayments = payments.reduce((sum, p) => sum + p.cantidad, 0);
      ingresosData.push(['Total Ingresos', '', totalPayments, '', '']);

      // 3. Resumen (balance)
      const totalGastosPresupuestado = budget?.partidas?.filter(p => p.categoria !== 'Ingresos').reduce((sum, p) => sum + (p.presupuestado || 0), 0) || 0;
      const totalGastosEjecutado = budget?.partidas?.filter(p => p.categoria !== 'Ingresos').reduce((sum, p) => sum + (p.ejecutado || 0), 0) || 0;
      
      const resumenData = [
        ['Concepto', 'Presupuestado (€)', 'Ejecutado (€)'],
        ['Total Ingresos', '', totalPayments],
        ['Total Gastos', totalGastosPresupuestado, totalGastosEjecutado],
        ['Balance', totalPayments - totalGastosPresupuestado, totalPayments - totalGastosEjecutado]
      ];

      // Escribir en las 3 hojas
      await Promise.all([
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Presupuestos!A1:F${presupuestosData.length}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: presupuestosData })
        }),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Ingresos!A1:E${ingresosData.length}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: ingresosData })
        }),
        fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Resumen!A1:C${resumenData.length}?valueInputOption=USER_ENTERED`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ values: resumenData })
        })
      ]);

      return Response.json({ success: true, message: 'Datos sincronizados' });
    }

    // ACCIÓN 3: Leer Presupuestos desde Sheet y actualizar app
    if (action === 'syncFromSheet') {
      if (!sheetId) return Response.json({ error: 'No hay sheet' }, { status: 400 });

      // Leer la hoja "Presupuestos"
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Presupuestos!A2:D1000`,
        { headers: { 'Authorization': `Bearer ${accessToken}` } }
      );

      const data = await response.json();
      const rows = data.values || [];

      // Convertir a partidas
      const partidas = rows
        .filter(row => row[0] && row[1])
        .map((row, idx) => ({
          id: `partida_${Date.now()}_${idx}`,
          categoria: row[0],
          nombre: row[1],
          presupuestado: parseFloat(row[2]) || 0,
          ejecutado: parseFloat(row[3]) || 0
        }));

      // Actualizar Budget
      const budgets = await base44.entities.Budget.filter({ activo: true });
      if (budgets[0]) {
        await base44.asServiceRole.entities.Budget.update(budgets[0].id, {
          partidas: partidas,
          fecha_ultima_sync: new Date().toISOString()
        });
      }

      return Response.json({ success: true, partidasSincronizadas: partidas.length });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error budgetSyncRealtime:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});