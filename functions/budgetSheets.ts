import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, budgetId, spreadsheetId } = await req.json();
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    // Acción 1: Crear/Actualizar Sheet desde presupuesto de la app
    if (action === 'createOrUpdateSheet') {
      const budgets = await base44.entities.Budget.filter({ id: budgetId });
      const budget = budgets[0];
      
      if (!budget) {
        return Response.json({ error: 'Presupuesto no encontrado' }, { status: 404 });
      }

      let sheetId = budget.google_sheet_id;
      let sheetUrl = budget.google_sheet_url;

      // Si no tiene sheet, crear uno nuevo
      if (!sheetId) {
        const createResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            properties: {
              title: `Presupuesto ${budget.nombre} - ${budget.temporada}`
            },
            sheets: [{
              properties: {
                title: 'Presupuesto',
                gridProperties: { frozenRowCount: 1 }
              }
            }]
          })
        });

        const newSheet = await createResponse.json();
        sheetId = newSheet.spreadsheetId;
        sheetUrl = newSheet.spreadsheetUrl;

        // Guardar el ID en el presupuesto
        await base44.asServiceRole.entities.Budget.update(budgetId, {
          google_sheet_id: sheetId,
          google_sheet_url: sheetUrl
        });
      }

      // Preparar datos para la hoja
      const headers = [['Categoría', 'Nombre', 'Presupuestado (€)', 'Ejecutado (€)', 'Desviación (€)', '% Ejecución']];
      const rows = (budget.partidas || []).map(p => [
        p.categoria || '',
        p.nombre || '',
        p.presupuestado || 0,
        p.ejecutado || 0,
        (p.ejecutado || 0) - (p.presupuestado || 0),
        p.presupuestado > 0 ? ((p.ejecutado || 0) / p.presupuestado * 100).toFixed(1) + '%' : '0%'
      ]);

      const allData = [...headers, ...rows];

      // Actualizar datos
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/Presupuesto!A1:F${allData.length}?valueInputOption=USER_ENTERED`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: allData
        })
      });

      // Formatear encabezados
      await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [
            {
              repeatCell: {
                range: { sheetId: 0, startRowIndex: 0, endRowIndex: 1 },
                cell: {
                  userEnteredFormat: {
                    backgroundColor: { red: 0.2, green: 0.5, blue: 0.3 },
                    textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true },
                    horizontalAlignment: 'CENTER'
                  }
                },
                fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment)'
              }
            }
          ]
        })
      });

      return Response.json({ 
        success: true, 
        spreadsheetId: sheetId,
        spreadsheetUrl: sheetUrl 
      });
    }

    // Acción 2: Sincronizar desde Sheet a la app
    if (action === 'syncFromSheet') {
      if (!spreadsheetId) {
        return Response.json({ error: 'No hay hoja vinculada' }, { status: 400 });
      }

      // Leer datos de la hoja
      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Presupuesto!A2:D1000`,
        {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        }
      );

      const data = await response.json();
      const rows = data.values || [];

      // Convertir rows a partidas
      const syncedPartidas = rows
        .filter(row => row[0] && row[1]) // Debe tener categoría y nombre
        .map((row, idx) => ({
          id: `partida_sync_${Date.now()}_${idx}`,
          categoria: row[0] || 'Gastos Variables',
          nombre: row[1] || '',
          presupuestado: parseFloat(row[2]) || 0,
          ejecutado: parseFloat(row[3]) || 0
        }));

      // Actualizar presupuesto con los datos sincronizados
      await base44.asServiceRole.entities.Budget.update(budgetId, {
        partidas: syncedPartidas,
        fecha_ultima_sync: new Date().toISOString()
      });

      return Response.json({ 
        success: true, 
        partidasSincronizadas: syncedPartidas.length 
      });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error en budgetSheets:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});