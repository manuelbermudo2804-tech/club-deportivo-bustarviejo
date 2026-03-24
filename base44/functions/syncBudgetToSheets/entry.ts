import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { google } from 'npm:googleapis@118.0.0';

const sheets = google.sheets('v4');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const { sheetsId } = await req.json();

    if (!sheetsId) {
      return Response.json({ error: 'Missing sheetsId' }, { status: 400 });
    }

    // Obtener token de Google Sheets
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googlesheets');

    const authClient = new google.auth.OAuth2();
    authClient.setCredentials({ access_token: accessToken });

    // ==================== INGRESOS PREVISTOS ====================
    // Calcular ingresos previstos basados en jugadores y configuración
    const [players, config, payments] = await Promise.all([
      base44.entities.Player.filter({ activo: true }),
      base44.entities.SeasonConfig.filter({ activa: true }),
      base44.entities.Payment.filter({}),
    ]);

    const seasonConfig = config[0];
    if (!seasonConfig) {
      return Response.json({ error: 'No active season config' }, { status: 400 });
    }

    // Agrupar jugadores por categoría
    const playersByCategory = {};
    (players || []).forEach(p => {
      const cat = p.categoria_principal || p.deporte || 'Sin categoría';
      if (!playersByCategory[cat]) playersByCategory[cat] = 0;
      playersByCategory[cat]++;
    });

    // Calcular ingresos previstos (asumiendo cuota única)
    const predictedIncomes = [];
    Object.entries(playersByCategory).forEach(([cat, count]) => {
      predictedIncomes.push({
        categoria: cat,
        jugadores: count,
        cuota_unitaria: seasonConfig.cuota_unica,
        total: count * seasonConfig.cuota_unitaria,
      });
    });

    // Ingresos de socios previstos (asumimos 10% de conversion o lo que configuren)
    const membersCount = 0; // En el futuro podrían querer una previsión aquí
    predictedIncomes.push({
      categoria: 'SOCIOS',
      jugadores: membersCount,
      cuota_unitaria: seasonConfig.precio_socio,
      total: membersCount * seasonConfig.precio_socio,
    });

    // ==================== INGRESOS REALES ====================
    const activeSeasonPayments = (payments || []).filter(p => 
      p.temporada === seasonConfig.temporada && 
      p.estado === 'Pagado'
    );

    const realIncomesByCategory = {};
    (activeSeasonPayments || []).forEach(p => {
      const cat = p.categoria_pago || 'Sin categoría';
      if (!realIncomesByCategory[cat]) realIncomesByCategory[cat] = 0;
      realIncomesByCategory[cat] += p.cantidad || 0;
    });

    // ==================== ESCRIBIR EN SHEETS ====================
    // Actualizar "Ingresos Previstos"
    const predictedData = [
      ['Categoría', 'Jugadores', 'Cuota Unitaria', 'Total Previsto'],
      ...predictedIncomes.map(item => [
        item.categoria,
        item.jugadores,
        item.cuota_unitaria,
        item.total,
      ]),
    ];

    await sheets.spreadsheets.values.update({
      auth: authClient,
      spreadsheetId: sheetsId,
      range: "'Ingresos Previstos'!A1",
      valueInputOption: 'RAW',
      requestBody: {
        values: predictedData,
      },
    });

    // Actualizar "Ingresos Reales APP"
    const realData = [
      ['Categoría', 'Total Ingresado'],
      ...Object.entries(realIncomesByCategory).map(([cat, total]) => [cat, total]),
    ];

    await sheets.spreadsheets.values.update({
      auth: authClient,
      spreadsheetId: sheetsId,
      range: "'Ingresos Reales APP'!A1",
      valueInputOption: 'RAW',
      requestBody: {
        values: realData,
      },
    });

    return Response.json({
      success: true,
      predictedIncomes,
      realIncomes: realIncomesByCategory,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('syncBudgetToSheets error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});