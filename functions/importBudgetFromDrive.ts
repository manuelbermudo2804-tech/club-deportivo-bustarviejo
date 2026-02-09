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
      return Response.json({ error: 'fileId and budgetId are required' }, { status: 400 });
    }

    // Obtener access token
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    if (!accessToken) {
      return Response.json({ error: 'Google Drive not authorized' }, { status: 401 });
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
      return Response.json({ error: 'Error downloading file from Drive' }, { status: fileResponse.status });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Subir a Base44 y extraer datos
    const blob = new Blob([fileBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    });

    const { file_url } = await base44.integrations.Core.UploadFile({ file: blob });

    // Extraer datos del Excel
    const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: "object",
        properties: {
          partidas: {
            type: "array",
            items: {
              type: "object",
              properties: {
                categoria: { type: "string" },
                nombre: { type: "string" },
                presupuestado: { type: "number" },
                ejecutado: { type: "number" }
              }
            }
          }
        }
      }
    });

    if (result.status === "success" && result.output?.partidas?.length > 0) {
      const importedPartidas = result.output.partidas
        .filter(p => p.nombre && p.nombre.trim() !== "SUMA TOTAL")
        .map((p, idx) => ({
          id: `partida_import_${Date.now()}_${idx}`,
          nombre: p.nombre,
          categoria: p.categoria || "Gastos Variables",
          presupuestado: Number(p.presupuestado || 0),
          ejecutado: Number(p.ejecutado || 0)
        }));

      // Actualizar presupuesto
      await base44.entities.Budget.update(budgetId, { 
        partidas: importedPartidas 
      });

      return Response.json({
        success: true,
        imported: importedPartidas.length,
        message: `${importedPartidas.length} partidas importadas correctamente`
      });
    }

    return Response.json({ 
      error: 'No se pudieron extraer partidas del archivo',
      details: result.details 
    }, { status: 400 });

  } catch (error) {
    console.error('Error importing from Drive:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});