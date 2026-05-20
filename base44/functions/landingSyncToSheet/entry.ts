import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Sincroniza una submission a Google Sheets cuando hay sheet_id configurado en la landing.
// Se invoca como automation de entidad on-create de LandingSubmission.
// También funciona como webhook personalizado si la landing tiene webhook_url.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // Caso 1: invocación directa con submissionId
    // Caso 2: automation entity payload con event/data
    const submissionId = body?.submissionId || body?.event?.entity_id;
    const submissionData = body?.data || null;

    let submission = submissionData;
    if (!submission && submissionId) {
      submission = await base44.asServiceRole.entities.LandingSubmission.get(submissionId);
    }
    if (!submission) return Response.json({ ok: false, reason: 'no_submission' });

    // Solo procesamos submissions reales (no bots ni lista de espera)
    if (submission.id === 'bot' || submission.estado === 'pendiente_pago') {
      return Response.json({ ok: true, skipped: true });
    }

    const page = await base44.asServiceRole.entities.LandingPage.get(submission.landing_page_id);
    if (!page) return Response.json({ ok: false, reason: 'no_page' });

    const integraciones = page.config?.integraciones || {};
    const results = { sheet: null, webhook: null };

    // ---- Google Sheets sync ----
    if (integraciones.google_sheet_id && !submission.synced_to_sheet) {
      try {
        const { accessToken } = await base44.asServiceRole.connectors.getConnection('googlesheets');

        // Construir fila: columnas estándar + datos del form
        const campos = page.config?.formulario?.campos || [];
        const labelMap = {};
        campos.forEach((c) => { labelMap[c.id] = c.etiqueta || c.id; });

        const row = [
          new Date(submission.created_date).toLocaleString('es-ES'),
          submission.nombre || '',
          submission.email || '',
          submission.telefono || '',
          submission.estado || '',
          submission.pago_estado || '',
          submission.pago_importe_total || '',
          submission.utm_source || '',
          submission.utm_medium || '',
          submission.utm_campaign || '',
        ];

        // Datos del form (en orden de campos definidos)
        campos.forEach((c) => {
          const v = submission.datos?.[c.id];
          row.push(typeof v === 'object' ? JSON.stringify(v) : (v ?? '').toString());
        });

        // Asegurar headers (best-effort, ignorar si falla)
        const headers = [
          'Fecha', 'Nombre', 'Email', 'Teléfono', 'Estado', 'Pago', 'Importe',
          'UTM Source', 'UTM Medium', 'UTM Campaign',
          ...campos.map((c) => c.etiqueta || c.id),
        ];

        // Append fila
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${integraciones.google_sheet_id}/values/A1:append?valueInputOption=USER_ENTERED`;
        const resp = await fetch(url, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: [row] }),
        });

        if (resp.ok) {
          results.sheet = 'ok';
          try {
            await base44.asServiceRole.entities.LandingSubmission.update(submission.id, { synced_to_sheet: true });
          } catch {}
        } else {
          results.sheet = 'error: ' + resp.status;
          console.error('[landingSyncToSheet] Sheets error:', resp.status, await resp.text());
        }
      } catch (e) {
        results.sheet = 'error: ' + (e?.message || e);
        console.error('[landingSyncToSheet] Sheets exception:', e?.message || e);
      }
    }

    // ---- Webhook personalizado ----
    if (integraciones.webhook_url) {
      try {
        await fetch(integraciones.webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'landing.submission',
            landing: { id: page.id, slug: page.slug, nombre: page.nombre },
            submission,
          }),
        });
        results.webhook = 'ok';
      } catch (e) {
        results.webhook = 'error: ' + (e?.message || e);
      }
    }

    return Response.json({ ok: true, results });
  } catch (error) {
    console.error('landingSyncToSheet error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});