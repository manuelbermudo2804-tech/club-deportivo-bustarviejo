import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Endpoint público (sin auth) para registrar visitas a páginas públicas.
// Uso: base44.functions.invoke('trackPublicView', { pagina: 'PublicSponsors' })
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const pagina = (body.pagina || '').toString().slice(0, 100);
    if (!pagina) {
      return Response.json({ error: 'pagina is required' }, { status: 400 });
    }

    // Anti-spam: ignora si ya hay un evento del mismo fingerprint+página en los últimos 30 min
    const fingerprint = (body.device_fingerprint || '').toString().slice(0, 200);
    const referrer = (body.referrer || '').toString().slice(0, 300);
    const userAgent = (body.user_agent || req.headers.get('user-agent') || '').toString().slice(0, 300);

    await base44.asServiceRole.entities.AnalyticsEvent.create({
      evento_tipo: 'public_view',
      pagina,
      accion: 'page_view',
      timestamp: new Date().toISOString(),
      navegador: userAgent,
      detalles: { device_fingerprint: fingerprint, referrer },
      severidad: 'info',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('trackPublicView error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});