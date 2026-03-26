import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

const VAPID_PUBLIC = Deno.env.get('VAPID_PUBLIC_KEY');
const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY');

if (VAPID_PUBLIC && VAPID_PRIVATE) {
  webpush.setVapidDetails('mailto:CDBUSTARVIEJO@GMAIL.COM', VAPID_PUBLIC, VAPID_PRIVATE);
}

const ALL_MESSAGES = [
  { tag: 'test-chat', title: '💬 Juan García', body: '¡Buen partido chicos! A seguir así 💪', url: '/FamilyChatsHub' },
  { tag: 'test-callup', title: '⚽ Jornada 16 vs Robledo', body: '29/03/2026 a las 11:00 - Confirma asistencia', url: '/ParentCallups' },
  { tag: 'test-announcement', title: '📢 Cambio horario entrenamientos', body: 'A partir de abril los entrenamientos pasan a las 18:30', url: '/Announcements' },
  { tag: 'test-signature', title: '✍️ Firma pendiente', body: 'Pablo García tiene documentos de federación pendientes de firmar', url: '/FederationSignatures' },
  { tag: 'test-private', title: '💬 Entrenador Marcos', body: 'Hola, quería comentarte sobre el próximo torneo...', url: '/FamilyChatsHub' },
  { tag: 'test-coordinator', title: '📋 Coordinador López', body: 'Recordad traer la documentación antes del viernes', url: '/CoordinatorChatsHub' },
  { tag: 'test-admin', title: '🔒 Administración Club', body: 'Tu solicitud ha sido procesada correctamente', url: '/AdminChatsHub' },
  { tag: 'test-staff', title: '👥 Staff: Director Deportivo', body: 'Reunión de coordinación el lunes a las 20:00', url: '/StaffChat' },
  { tag: 'test-evaluation', title: '⭐ Nueva evaluación', body: 'Entrenador Marcos ha evaluado a Pablo García', url: '/PlayerEvaluations' },
  { tag: 'test-event', title: '📅 Fiesta Fin de Temporada', body: '15/06/2026 a las 13:00 — Campo Municipal', url: '/CalendarAndSchedules' },
  { tag: 'test-extra-charge', title: '💰 Equipación 2ª Temporada', body: 'Tienes un nuevo cobro pendiente', url: '/' },
  { tag: 'test-manual-push', title: '📢 Aviso del Club', body: 'Este es un ejemplo de notificación manual del administrador', url: '/' },
  { tag: 'test-junior', title: '📬 ¡Te han respondido!', body: 'El club ha respondido a tu mensaje', url: '/JuniorMailbox' },
  { tag: 'test-survey', title: '📊 Encuesta de satisfacción', body: 'Hay una nueva encuesta disponible — tu opinión nos importa', url: '/Surveys' },
  { tag: 'test-market', title: '🛒 ¡Reserva en Mercadillo!', body: 'María López quiere tu artículo "Botas Adidas talla 38"', url: '/Mercadillo' },
];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const { email, batch } = await req.json();
    if (!email) return Response.json({ error: 'email required' }, { status: 400 });

    const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({ usuario_email: email, activa: true });
    if (!allSubs.length) return Response.json({ error: `No hay suscripciones push activas para ${email}` }, { status: 404 });

    // batch=1 → first 10, batch=2 → last 5
    const messages = batch === 2 ? ALL_MESSAGES.slice(10) : ALL_MESSAGES.slice(0, 10);

    const results = [];
    for (const msg of messages) {
      const payload = JSON.stringify({
        title: msg.title, body: msg.body, tag: msg.tag,
        badgeCount: messages.length - results.length,
        renotify: true, requireInteraction: false,
        data: { url: msg.url, timestamp: new Date().toISOString() }
      });

      let sent = 0, failed = 0;
      for (const sub of allSubs) {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { auth: sub.auth_key, p256dh: sub.p256dh_key } },
            payload, { urgency: 'high', TTL: 86400 }
          );
          sent++;
        } catch (err) {
          failed++;
          if (err.statusCode === 410 || err.statusCode === 404) {
            try { await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false }); } catch {}
          }
        }
      }
      results.push({ type: msg.tag, title: msg.title, sent, failed });
      await new Promise(r => setTimeout(r, 1500));
    }

    return Response.json({ success: true, batch: batch || 1, email, types_sent: results.length, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});