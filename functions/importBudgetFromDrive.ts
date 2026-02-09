import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileId, budgetId } = await req.json();

    if (!fileId || !budgetId) {
      return Response.json({ error: 'fileId and budgetId required' }, { status: 400 });
    }

    // Obtener presupuesto
    const budget = await base44.entities.Budget.list().then(list => 
      list.find(b => b.id === budgetId)
    );

    if (!budget) {
      return Response.json({ error: 'Budget not found' }, { status: 404 });
    }

    // Obtener token de Google Drive
    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    } catch (err) {
      return Response.json({ error: 'Google Drive no autorizado' }, { status: 403 });
    }

    // Descargar archivo de Drive
    const fileResponse = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!fileResponse.ok) {
      return Response.json({ error: 'Error al descargar archivo' }, { status: fileResponse.status });
    }

    const buffer = await fileResponse.arrayBuffer();
    
    // Procesar Excel
    const xlsxModule = await import('npm:xlsx@0.18.5');
    const XLSX = xlsxModule.default;

    const workbook = XLSX.read(buffer, { type: 'array' });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Actualizar partidas con los datos del Excel
    const updatedPartidas = budget.partidas.map(partida => {
      const rowData = data.find(row => row['Partida'] === partida.nombre);
      if (rowData) {
        return {
          ...partida,
          presupuestado: Number(rowData['Presupuestado']) || partida.presupuestado,
          ejecutado: Number(rowData['Ejecutado']) || partida.ejecutado
        };
      }
      return partida;
    });

    // Guardar cambios
    await base44.entities.Budget.update(budgetId, {
      partidas: updatedPartidas,
      fecha_ultima_actualizacion_ejecutado: new Date().toISOString()
    });

    return Response.json({
      success: true,
      message: 'Presupuesto actualizado correctamente'
    });

  } catch (error) {
    console.error('Error importing budget:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});