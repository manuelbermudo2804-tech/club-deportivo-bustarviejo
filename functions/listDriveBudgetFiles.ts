import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener access token de Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    if (!accessToken) {
      return Response.json({ 
        error: 'Google Drive not authorized',
        needsAuth: true 
      }, { status: 401 });
    }

    // Buscar archivos Excel en Drive
    const query = encodeURIComponent(
      "mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' and trashed=false and name contains 'Presupuesto'"
    );

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&fields=id,name,modifiedTime,size&pageSize=20&orderBy=modifiedTime desc`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('Drive API error:', error);
      return Response.json({ 
        error: 'Error accessing Google Drive',
        details: error 
      }, { status: response.status });
    }

    const data = await response.json();

    return Response.json({
      success: true,
      files: (data.files || []).map(f => ({
        id: f.id,
        name: f.name,
        modified: f.modifiedTime,
        size: f.size
      })),
      total: data.files?.length || 0
    });

  } catch (error) {
    console.error('Error listing Drive files:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});