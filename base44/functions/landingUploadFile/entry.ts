import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Sube un archivo asociado a un campo de formulario público. Devuelve { file_url }.
Deno.serve(async (req) => {
  if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
  try {
    const base44 = createClientFromRequest(req);
    const formData = await req.formData();
    const file = formData.get('file');
    if (!file) return Response.json({ error: 'Falta archivo' }, { status: 400 });

    // Límite 8MB
    if (file.size > 8 * 1024 * 1024) {
      return Response.json({ error: 'Archivo demasiado grande (max 8MB)' }, { status: 413 });
    }

    const result = await base44.asServiceRole.integrations.Core.UploadFile({ file });
    return Response.json({ file_url: result?.file_url || null });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});