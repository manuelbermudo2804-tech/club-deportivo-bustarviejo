import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return Response.json({ error: 'No autenticado' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const announcementId = String(body.announcement_id || '');
    if (!announcementId) return Response.json({ error: 'Falta announcement_id' }, { status: 400 });

    const matches = await base44.asServiceRole.entities.Announcement.filter({ id: announcementId });
    const announcement = matches?.[0];
    if (!announcement || !announcement.publicado || !announcement.requiere_confirmacion) {
      return Response.json({ error: 'El anuncio ya no requiere confirmación o no existe' }, { status: 404 });
    }

    const email = String(user.email).trim().toLowerCase();
    const targeted = Array.isArray(announcement.destinatarios_emails) ? announcement.destinatarios_emails : [];
    if (targeted.length && !targeted.some(e => String(e).trim().toLowerCase() === email)) {
      return Response.json({ error: 'No eres destinatario de este anuncio' }, { status: 403 });
    }

    const confirmed = Array.isArray(announcement.confirmado_por) ? [...announcement.confirmado_por] : [];
    if (!confirmed.some(c => String(c?.email || '').trim().toLowerCase() === email)) {
      confirmed.push({ email, nombre: user.full_name || user.name || email, fecha: new Date().toISOString() });
    }
    const read = Array.isArray(announcement.leido_por) ? [...announcement.leido_por] : [];
    if (!read.some(c => String(c?.email || '').trim().toLowerCase() === email)) {
      read.push({ email, nombre: user.full_name || user.name || email, fecha: new Date().toISOString() });
    }

    await base44.asServiceRole.entities.Announcement.update(announcementId, {
      confirmado_por: confirmed,
      leido_por: read
    });
    return Response.json({ success: true, announcement_id: announcementId });
  } catch (error) {
    console.error('[confirmAnnouncementRead] Error:', error);
    return Response.json({ error: error?.message || 'Error interno al guardar la confirmación' }, { status: 500 });
  }
});