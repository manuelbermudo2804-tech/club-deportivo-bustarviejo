import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Obtener token de Google Drive
    let accessToken;
    try {
      accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');
    } catch (err) {
      return Response.json({ 
        error: 'Google Drive no autorizado',
        needsAuth: true 
      }, { status: 403 });
    }

    // Listar archivos Excel en Drive
    const response = await fetch(
      'https://www.googleapis.com/drive/v3/files?q=mimeType%3D%22application%2Fvnd.openxmlformats-officedocument.spreadsheetml.sheet%22&spaces=drive&fields=files(id,name,modifiedTime,size)&pageSize=50',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok) {
      return Response.json({ error: 'Error al listar archivos' }, { status: response.status });
    }

    const data = await response.json();
    const files = (data.files || []).map(f => ({
      id: f.id,
      name: f.name,
      modified: f.modifiedTime,
      size: f.size
    }));

    return Response.json({ files });

  } catch (error) {
    console.error('Error listing Drive files:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});