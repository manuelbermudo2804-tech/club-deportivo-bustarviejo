import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { landing_page_id } = await req.json();
    if (!landing_page_id) return Response.json({ error: 'Falta landing_page_id' }, { status: 400 });

    // Cargar la página con permisos de servicio para comprobar autorización
    const page = await base44.asServiceRole.entities.LandingPage.get(landing_page_id);
    if (!page) return Response.json({ error: 'Página no encontrada' }, { status: 404 });

    const isAdmin = user.role === 'admin';
    const authorized = (page.panel_gestion?.emails_autorizados || [])
      .map((e) => (e || '').toLowerCase().trim());
    const myEmail = (user.email || '').toLowerCase().trim();

    if (!isAdmin && !authorized.includes(myEmail)) {
      return Response.json({ error: 'Sin permiso para esta página' }, { status: 403 });
    }

    // El usuario está autorizado → devolver las inscripciones con permisos de servicio
    const submissions = await base44.asServiceRole.entities.LandingSubmission.filter(
      { landing_page_id },
      '-created_date',
      500
    );

    // Si la página pertenece a una Junta de Socios, sumar también las respuestas hechas desde la app
    const all = [...(submissions || [])];
    if (page.slug) {
      const juntas = await base44.asServiceRole.entities.JuntaSocios.filter({ landing_slug: page.slug });
      if (juntas.length) {
        const webEmails = new Set(all.map((s) => (s.email || '').toLowerCase().trim()));
        const etiqueta = { voy: 'Asistiré', no_voy: 'No asistiré', delego: 'Delego el voto' };
        for (const j of juntas) {
          const app = await base44.asServiceRole.entities.JuntaAsistencia.filter({ junta_id: j.id }, '-updated_date', 1000);
          for (const a of app) {
            const em = (a.email || '').toLowerCase().trim();
            if (webEmails.has(em)) continue;
            webEmails.add(em);
            all.push({
              id: a.id, origen: 'App', landing_page_id, landing_slug: page.slug,
              nombre: a.nombre || a.email, email: a.email, estado: 'nuevo', created_date: a.created_date,
              respuesta: a.respuesta, personas: a.personas, pregunta: a.pregunta, ludoteca: a.ludoteca, ninos_ludoteca: a.ninos_ludoteca, updated_date: a.updated_date,
              datos: {
                'Origen': 'App', 'Respuesta': etiqueta[a.respuesta] || a.respuesta, 'Personas': a.personas,
                'Pregunta': a.pregunta || '', 'Ludoteca': a.ludoteca || '', 'Niños ludoteca': a.ninos_ludoteca ?? '',
              },
            });
          }
        }
        all.sort((x, y) => String(y.created_date).localeCompare(String(x.created_date)));
      }
    }

    const es_junta = !!page.slug && (await base44.asServiceRole.entities.JuntaSocios.filter({ landing_slug: page.slug })).length > 0;
    return Response.json({ submissions: all, page, es_junta });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});