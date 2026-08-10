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
      let subs = [];
      if (page?.id) {
        try {
          // Cargar paginado para evitar traer miles de filas (max 2000 por seguridad)
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
      // Sumar plazas reservadas manualmente (gente apuntada por fuera: teléfono, en persona…)
      const reservadasManual = parseInt(page?.config?.limites?.plazas_reservadas_manual) || 0;
      plazas_ocupadas += reservadasManual;
      // Sumar también las reservas manuales hechas por categoría al total general
      const reservasCatTotal = page?.config?.limites?.reservas_categoria || {};
      for (const n of Object.values(reservasCatTotal)) {
        plazas_ocupadas += parseInt(n) || 0;
      }

      // Cupo por categoría: contar ocupadas por cada valor de la categoría elegida.
      let plazas_por_categoria = null;
      const limitesCfg = page?.config?.limites || {};
      if (limitesCfg.cupos_categoria_activo && limitesCfg.cupos_categoria_campo) {
        const campoId = limitesCfg.cupos_categoria_campo;
        const tienePagoCat = !!page?.config?.pago?.activo;
        const cuentaSub = (s) => {
          if (s.estado === 'cancelado' || s.estado === 'lista_espera') return false;
          if (tienePagoCat) {
            if (s.pago_estado === 'pagado') return true;
            if (s.pago_estado === 'pendiente') {
              const created = new Date(s.created_date).getTime();
              return Date.now() - created < 30 * 60 * 1000;
            }
            return false;
          }
          return true;
        };
        const conteo = {};
        for (const s of subs) {
          if (!cuentaSub(s)) continue;
          const val = s?.datos?.[campoId];
          if (val === undefined || val === null || val === '') continue;
          conteo[val] = (conteo[val] || 0) + 1;
        }
        // Sumar reservas manuales por categoría (plazas ocupadas fuera de la web)
        const reservasCat = limitesCfg.reservas_categoria || {};
        for (const [cat, n] of Object.entries(reservasCat)) {
          const num = parseInt(n) || 0;
          if (num > 0) conteo[cat] = (conteo[cat] || 0) + num;
        }
        plazas_por_categoria = conteo;
      }

      return Response.json({ page, plazas_ocupadas, plazas_por_categoria });
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

      // Anti-spam: honeypot.
      // IMPORTANTE: el autocompletado de algunos navegadores móviles rellena este
      // campo oculto con datos del usuario (nombre/teléfono), marcando por error a
      // personas reales como bots. Por eso SOLO descartamos si el contenido parece
      // realmente de bot (contiene una URL/enlace), no cualquier texto.
      const hp = String(body.honeypot || '').trim();
      if (hp && /https?:\/\/|www\.|<a\s|\.com|\.ru|\[url\]/i.test(hp)) {
        return Response.json({ ok: true, submission_id: 'bot' });
      }

      // Validar plazas (si hay límite configurado)
      const limitesSubmit = page?.config?.limites || {};
      const plazasMax = parseInt(limitesSubmit.plazas_maximas) || 0;
      const cupoCatActivo = !!limitesSubmit.cupos_categoria_activo && !!limitesSubmit.cupos_categoria_campo;
      if (plazasMax > 0 || cupoCatActivo) {
        const subsAll = await base44.asServiceRole.entities.LandingSubmission.filter({ landing_page_id: pageId });
        const validas = (subsAll || []).filter(s => s.estado !== 'cancelado' && s.estado !== 'lista_espera');
        const reservadasManual = parseInt(limitesSubmit.plazas_reservadas_manual) || 0;

        const reservasCat = limitesSubmit.reservas_categoria || {};
        const reservasCatTotal = Object.values(reservasCat).reduce((sum, n) => sum + (parseInt(n) || 0), 0);

        if (plazasMax > 0) {
          const ocupadas = validas.length + reservadasManual + reservasCatTotal;
          if (ocupadas >= plazasMax) {
            return Response.json({
              error: limitesSubmit.mensaje_plazas_agotadas || 'Lo sentimos, ya no quedan plazas disponibles.',
              plazas_agotadas: true,
            }, { status: 409 });
          }
        }

        // Cupo de la categoría concreta que ha elegido este inscrito
        if (cupoCatActivo) {
          const campoId = limitesSubmit.cupos_categoria_campo;
          const categoria = body?.datos?.[campoId];
          const cupoCat = parseInt(limitesSubmit.cupos_categoria?.[categoria]);
          if (categoria && Number.isFinite(cupoCat) && cupoCat > 0) {
            const enCategoria = validas.filter(s => s?.datos?.[campoId] === categoria).length
              + (parseInt(reservasCat[categoria]) || 0);
            if (enCategoria >= cupoCat) {
              return Response.json({
                error: `Lo sentimos, la categoría "${categoria}" ya está completa.`,
                plazas_agotadas: true,
                categoria_agotada: categoria,
              }, { status: 409 });
            }
          }
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