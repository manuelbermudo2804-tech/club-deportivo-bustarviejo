// Función pública (no requiere login) para registrar eventos de diagnóstico
// del formulario /SolicitarAcceso. Necesaria porque el SDK exige token y
// los visitantes anónimos no lo tienen — así sus eventos llegan vía service role.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }
  try {
    const body = await req.json();
    const {
      event_type = 'app_error',
      context,
      error_message,
      user_email,
      page_path,
      user_agent,
      device,
      extra_data,
      severity,
    } = body || {};

    if (!context) {
      return Response.json({ error: 'context required' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);
    await base44.asServiceRole.entities.UploadDiagnostic.create({
      event_type,
      context: String(context).slice(0, 200),
      error_message: error_message ? String(error_message).slice(0, 500) : undefined,
      user_email: user_email || 'anónimo',
      page_path: page_path || null,
      user_agent: user_agent ? String(user_agent).slice(0, 500) : undefined,
      device: device || null,
      extra_data: extra_data || {},
      severity: severity || 'info',
    });

    return Response.json({ ok: true });
  } catch (error) {
    // No bloqueamos al cliente si esto falla — solo log interno
    console.error('logPublicEvent error:', error?.message);
    return Response.json({ ok: false, error: error?.message }, { status: 500 });
  }
});