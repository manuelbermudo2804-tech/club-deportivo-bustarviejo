// Función pública (sin login) que captura un "pre-registro" de una inscripción
// en cuanto el usuario escribe nombre de equipo + un dato de contacto, AUNQUE
// no termine el formulario. Así nunca se pierde un equipo que empezó a apuntarse.
// Identifica el borrador por session_id para actualizarlo en vez de duplicar.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const body = await req.json();
    const {
      landing_slug,
      landing_page_id,
      session_id,
      nombre_equipo,
      nombre,
      email,
      telefono,
      datos,
      completada,
      envio_fallido,
    } = body || {};

    if (!landing_slug || !session_id) {
      return Response.json({ error: 'landing_slug y session_id requeridos' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const payload = {
      landing_slug: String(landing_slug).slice(0, 200),
      landing_page_id: landing_page_id || null,
      session_id: String(session_id).slice(0, 100),
      nombre_equipo: nombre_equipo ? String(nombre_equipo).slice(0, 200) : undefined,
      nombre: nombre ? String(nombre).slice(0, 200) : undefined,
      email: email ? String(email).slice(0, 200) : undefined,
      telefono: telefono ? String(telefono).slice(0, 50) : undefined,
      datos: datos || {},
    };
    if (typeof completada === 'boolean') {
      payload.completada = completada;
      if (completada) payload.estado = 'recuperado';
    }
    if (typeof envio_fallido === 'boolean') {
      payload.envio_fallido = envio_fallido;
    }

    // Buscar si ya existe un borrador de esta sesión
    const existentes = await base44.asServiceRole.entities.PreInscripcion.filter({ session_id: payload.session_id });
    if (existentes && existentes.length > 0) {
      await base44.asServiceRole.entities.PreInscripcion.update(existentes[0].id, payload);
      return Response.json({ ok: true, id: existentes[0].id, updated: true });
    }

    const rec = await base44.asServiceRole.entities.PreInscripcion.create(payload);
    return Response.json({ ok: true, id: rec.id, created: true });
  } catch (error) {
    console.error('savePreInscripcion error:', error?.message);
    return Response.json({ ok: false, error: error?.message }, { status: 500 });
  }
});