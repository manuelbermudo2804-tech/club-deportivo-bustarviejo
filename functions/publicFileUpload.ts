import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

// Función pública para subir archivos desde landing page externa
// Convierte el archivo a base64 y lo guarda en un "documento virtual" enviado por email
Deno.serve(async (req) => {
  // Permitir CORS para la landing page externa
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    
    // Obtener el archivo del form data
    const formData = await req.formData();
    const file = formData.get('file');
    
    if (!file) {
      return new Response(JSON.stringify({ error: 'No se proporcionó ningún archivo' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    // Convertir archivo a base64
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < uint8Array.length; i++) {
      binary += String.fromCharCode(uint8Array[i]);
    }
    const base64 = btoa(binary);
    
    // Generar un ID único para el archivo
    const fileId = `SOCIO_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const fileName = file.name || 'justificante';
    const fileType = file.type || 'application/octet-stream';
    
    // Crear una URL de datos (data URL) que se puede usar directamente
    const dataUrl = `data:${fileType};base64,${base64}`;
    
    // Guardar referencia en una variable temporal (el archivo se enviará junto con el formulario)
    // En lugar de subir, devolvemos el base64 para incluirlo en el registro del socio
    
    return new Response(JSON.stringify({ 
      success: true, 
      file_url: dataUrl,
      file_id: fileId,
      file_name: fileName,
      file_type: fileType,
      file_size: file.size
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });

  } catch (error) {
    console.error("Error processing file:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  }
});