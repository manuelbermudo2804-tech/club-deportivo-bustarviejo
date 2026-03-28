import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

webpush.setVapidDetails(
  'mailto:info@cdbustarviejo.com',
  Deno.env.get('VAPID_PUBLIC_KEY'),
  Deno.env.get('VAPID_PRIVATE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { email } = await req.json().catch(() => ({}));
    const targetEmail = email || user.email;

    // Get push subscriptions for this user
    const subs = await base44.asServiceRole.entities.PushSubscription.filter({ usuario_email: targetEmail, activa: true });
    console.log(`[TestPush] Found ${subs.length} active subscriptions for ${targetEmail}`);

    if (!subs.length) {
      return Response.json({ success: false, error: `No hay suscripciones push activas para ${targetEmail}` });
    }

    // Simulate the unpublished callup alert push
    const title = '🚨 Convocatoria sin publicar';
    const body = 'Jornada 20 vs Miraflores es MAÑANA y NO está publicada. Los padres no lo saben.';

    let sent = 0;
    let failed = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh_key, auth: sub.auth_key } },
          JSON.stringify({ title, body, url: '/CoachCallups', tag: `test-unpublished-${Date.now()}` })
        );
        sent++;
      } catch (err) {
        console.error(`[TestPush] Error:`, err.statusCode, err.message);
        if (err.statusCode === 410 || err.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false });
        }
        failed++;
      }
    }

    return Response.json({ success: true, email: targetEmail, subscriptions: subs.length, sent, failed });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});