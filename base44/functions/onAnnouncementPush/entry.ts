import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';
import webpush from 'npm:web-push@3.6.7';

webpush.setVapidDetails(
  'mailto:CDBUSTARVIEJO@GMAIL.COM',
  Deno.env.get('VAPID_PUBLIC_KEY'),
  Deno.env.get('VAPID_PRIVATE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const announcement = body.data;
    if (!announcement) {
      return Response.json({ error: 'No data' }, { status: 400 });
    }

    // Solo enviar si está publicado
    if (!announcement.publicado) {
      return Response.json({ message: 'Anuncio no publicado, skip' });
    }

    // Evitar reenvíos: marcar que ya se notificó por push
    if (announcement.push_enviada) {
      return Response.json({ message: 'Push ya enviada, skip' });
    }

    const categoria = announcement.destinatarios_tipo || 'Todos';
    const titulo = announcement.titulo || 'Nuevo anuncio del club';
    const prioridad = announcement.prioridad || 'Normal';

    // Icono según prioridad
    const prefijo = prioridad === 'Urgente' ? '🚨' : prioridad === 'Importante' ? '⚠️' : '📢';

    // Obtener jugadores de la categoría para filtrar emails
    let targetEmails = [];

    if (categoria === 'Todos') {
      // Enviar a TODOS los suscriptores activos
      const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({ activa: true });
      targetEmails = [...new Set(allSubs.map(s => s.usuario_email))];
    } else {
      // Buscar jugadores de esa categoría y recoger emails de padres
      const players = await base44.asServiceRole.entities.Player.filter({ 
        categoria_principal: categoria, 
        activo: true 
      });
      const emailSet = new Set();
      for (const p of players) {
        if (p.email_padre) emailSet.add(p.email_padre);
        if (p.email_tutor_2) emailSet.add(p.email_tutor_2);
        if (p.email_jugador) emailSet.add(p.email_jugador);
        if (p.acceso_menor_email) emailSet.add(p.acceso_menor_email);
      }
      targetEmails = [...emailSet];
    }

    if (targetEmails.length === 0) {
      return Response.json({ message: 'Sin destinatarios', sent: 0 });
    }

    // Obtener todas las suscripciones activas de esos emails
    const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({ activa: true });
    const relevantSubs = allSubs.filter(s => targetEmails.includes(s.usuario_email));

    let sent = 0;
    let errors = 0;

    // Truncar contenido para el body de la push
    const contenidoClean = (announcement.contenido || '')
      .replace(/<[^>]*>/g, '')
      .substring(0, 120);
    const pushBody = contenidoClean || 'Toca para ver el anuncio completo';

    for (const sub of relevantSubs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth_key,
            p256dh: sub.p256dh_key
          }
        };

        const payloadJson = JSON.stringify({
          title: `${prefijo} ${titulo}`,
          body: pushBody,
          tag: `announcement-${announcement.id || Date.now()}`,
          badgeCount: 1,
          requireInteraction: prioridad === 'Urgente',
          data: {
            url: '/Announcements',
            timestamp: new Date().toISOString()
          }
        });

        await webpush.sendNotification(pushSubscription, payloadJson);
        sent++;
      } catch (error) {
        if (error.statusCode === 410 || error.statusCode === 404) {
          await base44.asServiceRole.entities.PushSubscription.update(sub.id, { activa: false });
        }
        errors++;
      }
    }

    // Marcar que la push fue enviada para no repetir
    try {
      await base44.asServiceRole.entities.Announcement.update(announcement.id, { push_enviada: true });
    } catch (e) {
      console.error('Error marcando push_enviada:', e.message);
    }

    console.log(`Push anuncio "${titulo}" → ${sent} enviadas, ${errors} errores, ${relevantSubs.length} subs`);

    return Response.json({ success: true, sent, errors, totalSubs: relevantSubs.length });
  } catch (error) {
    console.error('Error en onAnnouncementPush:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});