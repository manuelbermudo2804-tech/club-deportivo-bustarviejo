import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import webpush from 'npm:web-push@3.6.7';

webpush.setVapidDetails(
  'mailto:CDBUSTARVIEJO@GMAIL.COM',
  Deno.env.get('VAPID_PUBLIC_KEY'),
  Deno.env.get('VAPID_PRIVATE_KEY')
);

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { survey_id } = await req.json();
    if (!survey_id) {
      return Response.json({ error: 'Falta survey_id' }, { status: 400 });
    }

    const surveys = await base44.asServiceRole.entities.Survey.filter({ id: survey_id });
    const survey = surveys?.[0];
    if (!survey) {
      return Response.json({ error: 'Encuesta no encontrada' }, { status: 404 });
    }

    // Identificar emails destinatarios
    const targetEmails = new Set();
    const allPlayers = await base44.asServiceRole.entities.Player.list();

    if (survey.destinatarios === 'Todos') {
      // Todos los padres y jugadores con email
      allPlayers.forEach(p => {
        if (p.email_padre) targetEmails.add(p.email_padre.toLowerCase());
        if (p.email_tutor_2) targetEmails.add(p.email_tutor_2.toLowerCase());
        if (p.email_jugador) targetEmails.add(p.email_jugador.toLowerCase());
      });
    } else {
      // Filtrar por categoría (soporta deporte legacy + categorias[] + categoria_principal)
      const matchPlayers = allPlayers.filter(p => {
        if (p.deporte === survey.destinatarios) return true;
        if (Array.isArray(p.categorias) && p.categorias.includes(survey.destinatarios)) return true;
        if (p.categoria_principal === survey.destinatarios) return true;
        return false;
      });
      matchPlayers.forEach(p => {
        if (p.email_padre) targetEmails.add(p.email_padre.toLowerCase());
        if (p.email_tutor_2) targetEmails.add(p.email_tutor_2.toLowerCase());
        if (p.email_jugador) targetEmails.add(p.email_jugador.toLowerCase());
      });
    }

    if (targetEmails.size === 0) {
      return Response.json({ message: 'Sin destinatarios', sent: 0 });
    }

    // Obtener suscripciones push activas
    const allSubs = await base44.asServiceRole.entities.PushSubscription.filter({ activa: true });
    const targetSubs = allSubs.filter(s => s.usuario_email && targetEmails.has(s.usuario_email.toLowerCase()));

    let sent = 0;
    let failed = 0;
    for (const sub of targetSubs) {
      try {
        const pushSubscription = {
          endpoint: sub.endpoint,
          keys: {
            auth: sub.auth_key || sub.keys?.auth,
            p256dh: sub.p256dh_key || sub.keys?.p256dh
          }
        };
        const payload = JSON.stringify({
          title: '📋 Nueva encuesta del club',
          body: survey.titulo,
          tag: `survey-${survey.id}`,
          requireInteraction: false,
          data: { url: '/Surveys', timestamp: new Date().toISOString() }
        });
        await webpush.sendNotification(pushSubscription, payload);
        sent++;
      } catch (error) {
        failed++;
        if (error.statusCode === 410 || error.statusCode === 404) {
          try { await base44.asServiceRole.entities.PushSubscription.delete(sub.id); } catch {}
        }
      }
    }

    return Response.json({ success: true, recipients: targetEmails.size, sent, failed });
  } catch (error) {
    console.error('Error en notifySurveyCreated:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});