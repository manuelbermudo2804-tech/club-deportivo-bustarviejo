import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { action, submission_id, estado, preinscripcion_id } = await req.json();

    // ── Promover una pre-inscripción (equipo a medias) a la lista oficial de inscritos ──
    if (action === 'promote_preinscripcion') {
      if (!preinscripcion_id) return Response.json({ error: 'Falta preinscripcion_id' }, { status: 400 });
      const pre = await base44.asServiceRole.entities.PreInscripcion.get(preinscripcion_id);
      if (!pre) return Response.json({ error: 'Pre-inscripción no encontrada' }, { status: 404 });

      const page = await base44.asServiceRole.entities.LandingPage.get(pre.landing_page_id);
      const isAdmin = user.role === 'admin';
      const authorized = (page?.panel_gestion?.emails_autorizados || []).map((e) => (e || '').toLowerCase().trim());
      const myEmail = (user.email || '').toLowerCase().trim();
      if (!isAdmin && !authorized.includes(myEmail)) {
        return Response.json({ error: 'Sin permiso para esta página' }, { status: 403 });
      }

      if (!page) return Response.json({ error: 'Página de la pre-inscripción no encontrada' }, { status: 404 });

      // Si el envío automático ya recuperó esta sesión, reutilizar esa inscripción
      // en vez de crear otra al pulsar "Pasar a inscritos oficiales".
      let existente = null;
      if (pre.session_id) {
        const encontradas = await base44.asServiceRole.entities.LandingSubmission.filter({
          landing_page_id: pre.landing_page_id,
          device_fingerprint: pre.session_id,
        });
        existente = encontradas?.[0] || null;
      }

      const submission = existente || await base44.asServiceRole.entities.LandingSubmission.create({
        landing_page_id: pre.landing_page_id,
        landing_slug: pre.landing_slug || page.slug || '',
        nombre: pre.nombre_equipo || pre.nombre || 'Sin nombre',
        email: pre.email || undefined,
        telefono: pre.telefono || undefined,
        datos: pre.datos || {},
        estado: 'nuevo',
        device_fingerprint: pre.session_id || undefined,
        notas_admin: 'Recuperado manualmente desde pre-inscritos (equipo a medias)',
      });

      await base44.asServiceRole.entities.PreInscripcion.update(preinscripcion_id, { estado: 'recuperado', completada: true });
      return Response.json({ ok: true, submission_id: submission.id, already_exists: !!existente });
    }

    if (!action || !submission_id) {
      return Response.json({ error: 'Faltan parámetros' }, { status: 400 });
    }

    // Cargar la inscripción y su página para validar autorización
    const submission = await base44.asServiceRole.entities.LandingSubmission.get(submission_id);
    if (!submission) return Response.json({ error: 'Inscripción no encontrada' }, { status: 404 });

    const page = await base44.asServiceRole.entities.LandingPage.get(submission.landing_page_id);
    const isAdmin = user.role === 'admin';
    const authorized = (page?.panel_gestion?.emails_autorizados || [])
      .map((e) => (e || '').toLowerCase().trim());
    const myEmail = (user.email || '').toLowerCase().trim();

    if (!isAdmin && !authorized.includes(myEmail)) {
      return Response.json({ error: 'Sin permiso para esta página' }, { status: 403 });
    }

    if (action === 'update_estado') {
      // Lista blanca según el esquema de LandingSubmission. Los estados de pago
      // se gestionan por su acción específica y no se aceptan aquí.
      const estadosPermitidos = ['nuevo', 'contactado', 'confirmado', 'cancelado', 'pendiente_pago', 'lista_espera'];
      if (!estadosPermitidos.includes(estado)) {
        return Response.json({ error: 'Estado no válido' }, { status: 400 });
      }
      await base44.asServiceRole.entities.LandingSubmission.update(submission_id, { estado });
      return Response.json({ ok: true });
    }

    // Marcar/desmarcar una inscripción como pagada manualmente (para pruebas o pagos fuera de la web)
    if (action === 'marcar_pagado') {
      const pagar = estado === 'pagado';
      await base44.asServiceRole.entities.LandingSubmission.update(submission_id, {
        pago_estado: pagar ? 'pagado' : 'pendiente',
        pago_fecha: pagar ? new Date().toISOString() : null,
      });
      return Response.json({ ok: true });
    }

    if (action === 'delete') {
      await base44.asServiceRole.entities.LandingSubmission.delete(submission_id);
      return Response.json({ ok: true });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});