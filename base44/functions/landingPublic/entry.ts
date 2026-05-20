import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint PÚBLICO (sin auth) para el constructor de páginas.
// Acciones:
//   - action="get"     → devuelve { page } por slug
//   - action="submit"  → crea LandingSubmission y dispara email de confirmación
//   - action="visit"   → incrementa contador de visitas (best-effort)
Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === 'get') {
      const slug = (body.slug || '').toString().trim();
      if (!slug) return Response.json({ page: null });
      const results = await base44.asServiceRole.entities.LandingPage.filter({ slug });
      const page = results?.[0] || null;
      let plazas_ocupadas = 0;
      if (page?.id) {
        try {
          // Cargar paginado para evitar traer miles de filas (max 2000 por seguridad)
          let subs = [];
          let offset = 0;
          const pageSize = 500;
          while (offset < 2000) {
            const chunk = await base44.asServiceRole.entities.LandingSubmission.filter(
              { landing_page_id: page.id },
              "-created_date",
              pageSize,
              offset
            );
            if (!chunk || chunk.length === 0) break;
            subs = subs.concat(chunk);
            if (chunk.length < pageSize) break;
            offset += pageSize;
          }
          const tienePago = !!page?.config?.pago?.activo;
          plazas_ocupadas = (subs || []).filter((s) => {
            if (s.estado === 'cancelado') return false;
            if (tienePago) {
              // Solo cuentan las pagadas + pendientes recientes (30 min)
              if (s.pago_estado === 'pagado') return true;
              if (s.pago_estado === 'pendiente') {
                const created = new Date(s.created_date).getTime();
                return Date.now() - created < 30 * 60 * 1000;
              }
              return false;
            }
            // Sin pago: cualquier inscripción no cancelada cuenta
            return true;
          }).length;
        } catch {}
      }
      return Response.json({ page, plazas_ocupadas });
    }

    if (action === 'visit') {
      const pageId = (body.page_id || '').toString();
      if (!pageId) return Response.json({ ok: false });
      try {
        const page = await base44.asServiceRole.entities.LandingPage.get(pageId);
        const visitas = (page?.estadisticas?.visitas || 0) + 1;
        await base44.asServiceRole.entities.LandingPage.update(pageId, {
          estadisticas: { ...(page?.estadisticas || {}), visitas },
        });
      } catch {}
      return Response.json({ ok: true });
    }

    if (action === 'submit') {
      const pageId = (body.landing_page_id || '').toString();
      if (!pageId) return Response.json({ error: 'landing_page_id requerido' }, { status: 400 });
      const page = await base44.asServiceRole.entities.LandingPage.get(pageId);
      if (!page) return Response.json({ error: 'Página no encontrada' }, { status: 404 });
      if (page.estado === 'cerrada' || page.estado === 'archivada') {
        return Response.json({ error: 'Inscripciones cerradas' }, { status: 403 });
      }

      // Anti-spam: honeypot
      if (body.honeypot && String(body.honeypot).length > 0) {
        return Response.json({ ok: true, submission_id: 'bot' });
      }

      // Validar plazas (si hay límite configurado)
      const plazasMax = parseInt(page?.config?.limites?.plazas_maximas) || 0;
      if (plazasMax > 0) {
        const subs = await base44.asServiceRole.entities.LandingSubmission.filter({ landing_page_id: pageId });
        const ocupadas = (subs || []).filter(s => s.estado !== 'cancelado' && s.estado !== 'lista_espera').length;
        if (ocupadas >= plazasMax) {
          return Response.json({
            error: page?.config?.limites?.mensaje_plazas_agotadas || 'Lo sentimos, ya no quedan plazas disponibles.',
            plazas_agotadas: true,
          }, { status: 409 });
        }
      }

      const submission = await base44.asServiceRole.entities.LandingSubmission.create({
        landing_page_id: pageId,
        landing_slug: page.slug || body.landing_slug || '',
        nombre: body.nombre || '',
        email: body.email || '',
        telefono: body.telefono || '',
        datos: body.datos || {},
        archivos: body.archivos || [],
        estado: 'nuevo',
        user_agent: body.user_agent || '',
        referrer: body.referrer || '',
        utm_source: body.utm_source || '',
        utm_medium: body.utm_medium || '',
        utm_campaign: body.utm_campaign || '',
      });

      // Actualizar estadísticas (best-effort)
      try {
        const stats = page.estadisticas || {};
        await base44.asServiceRole.entities.LandingPage.update(pageId, {
          estadisticas: {
            ...stats,
            inscripciones: (stats.inscripciones || 0) + 1,
            ultima_inscripcion: new Date().toISOString(),
          },
        });
      } catch {}

      // Disparar email de confirmación (best-effort, no bloquea respuesta)
      try {
        base44.asServiceRole.functions
          .invoke('sendLandingConfirmation', { submissionId: submission.id })
          .catch(() => {});
      } catch {}

      // Notificar al admin (push)
      try {
        if (page?.panel_gestion?.notificar_push !== false) {
          base44.asServiceRole.functions
            .invoke('notifyLandingSubmission', { submissionId: submission.id })
            .catch(() => {});
        }
      } catch {}

      return Response.json({ ok: true, submission_id: submission.id });
    }

    return Response.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('landingPublic error:', error);
    return Response.json({ error: error.message || 'Error' }, { status: 500 });
  }
});