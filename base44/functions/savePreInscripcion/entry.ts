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

    // RED DE SEGURIDAD DEFINITIVA:
    // Si el envío normal falló (envio_fallido) pero el formulario estaba validado
    // y completo, creamos DIRECTAMENTE la inscripción real (LandingSubmission) para
    // que salte a la página de Inscritos sin intervención manual. Nunca se pierde
    // una inscripción por un corte de red. Evitamos duplicados por session_id.
    let submissionRescatada = null;
    if (envio_fallido === true && landing_page_id) {
      try {
        const yaExiste = await base44.asServiceRole.entities.LandingSubmission.filter({
          landing_page_id,
          device_fingerprint: payload.session_id,
        });
        if (!yaExiste || yaExiste.length === 0) {
          submissionRescatada = await base44.asServiceRole.entities.LandingSubmission.create({
            landing_page_id,
            landing_slug: payload.landing_slug,
            nombre: payload.nombre || payload.nombre_equipo || 'Sin nombre',
            email: payload.email || '',
            telefono: payload.telefono || '',
            datos: payload.datos || {},
            estado: 'nuevo',
            device_fingerprint: payload.session_id,
            notas_admin: 'Rescatada automáticamente: el envío falló por red pero los datos estaban completos.',
          });
          // El pre-registro pasa a "recuperado" porque ya es una inscripción real
          payload.completada = true;
          payload.estado = 'recuperado';
          payload.envio_fallido = false;
        }
      } catch (e) {
        console.error('savePreInscripcion rescate error:', e?.message);
      }
    }

    // Buscar si ya existe un borrador de esta sesión
    const existentes = await base44.asServiceRole.entities.PreInscripcion.filter({ session_id: payload.session_id });
    if (existentes && existentes.length > 0) {
      await base44.asServiceRole.entities.PreInscripcion.update(existentes[0].id, payload);
      return Response.json({ ok: true, id: existentes[0].id, updated: true, submission_id: submissionRescatada?.id || null });
    }

    const rec = await base44.asServiceRole.entities.PreInscripcion.create(payload);
    return Response.json({ ok: true, id: rec.id, created: true, submission_id: submissionRescatada?.id || null });
  } catch (error) {
    console.error('savePreInscripcion error:', error?.message);
    return Response.json({ ok: false, error: error?.message }, { status: 500 });
  }
});