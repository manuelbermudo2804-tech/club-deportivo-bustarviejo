import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  // Manejo de CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  // Construir la URL base de las funciones
  // req.url es algo como "https://<deployment>.deno.dev/getPublicWebUrl"
  // Queremos devolver "https://<deployment>.deno.dev/publicWeb"
  
  const urlObj = new URL(req.url);
  const baseUrl = urlObj.origin; // https://....deno.dev
  
  // Construir las URLs públicas finales
  const socioUrl = `${baseUrl}/publicWeb/socio`;
  const femeninoUrl = `${baseUrl}/publicWeb/femenino`;

  return Response.json({ 
    socio: socioUrl,
    femenino: femeninoUrl
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  });
});