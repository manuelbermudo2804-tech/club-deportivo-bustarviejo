import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// PASO 2 del envío público de fotos/vídeos: guarda el envío en el Centro de
// Contenido con estado "pendiente". El archivo ya viene subido (enviarContenidoWebArchivo).
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const equipo = String(body?.equipo || '').trim();
    const nombre = String(body?.nombre || '').trim();
    const email = String(body?.email || '').trim();
    const descripcion = String(body?.descripcion || '').trim();
    const archivoUrl = String(body?.archivo_url || '').trim();
    const tipo = body?.tipo === 'video' ? 'video' : 'foto';

    if (!archivoUrl) return Response.json({ error: 'Falta el archivo' }, { status: 400 });
    if (!equipo) return Response.json({ error: 'Falta indicar el equipo' }, { status: 400 });
    if (!nombre) return Response.json({ error: 'Falta tu nombre' }, { status: 400 });

    const now = new Date();
    const y = now.getFullYear();
    const temporada = now.getMonth() + 1 >= 9 ? `${y}/${y + 1}` : `${y - 1}/${y}`;

    const registro = await base44.asServiceRole.entities.ContenidoClub.create({
      tipo,
      archivo_url: archivoUrl,
      descripcion,
      equipo,
      autor_nombre: nombre,
      autor_email: email,
      estado: 'pendiente',
      temporada,
      notas_admin: 'Enviado desde la web pública',
    });

    return Response.json({ success: true, id: registro?.id || null });
  } catch (error) {
    console.error('[enviarContenidoWeb] error', error);
    return Response.json({ error: error.message || 'Error inesperado' }, { status: 500 });
  }
});