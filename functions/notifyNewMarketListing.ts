import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    
    const { data, event } = body;
    
    // Solo notificar anuncios nuevos activos
    if (!data || event?.type !== 'create') {
      return Response.json({ ok: true, skipped: true });
    }

    const listing = data;
    
    // No notificar si no está activo
    if (listing.estado && listing.estado !== 'activo') {
      return Response.json({ ok: true, skipped: true, reason: 'not active' });
    }

    const titulo = listing.titulo || 'Nuevo anuncio';
    const precio = listing.tipo === 'donacion' || Number(listing.precio || 0) === 0
      ? 'GRATIS'
      : `${Number(listing.precio || 0).toFixed(2)} €`;
    const categoria = listing.categoria || '';
    const vendedor = listing.vendedor_nombre || 'Un socio';

    // Obtener todos los usuarios del club
    let users = [];
    try {
      users = await base44.asServiceRole.entities.User.list();
    } catch (e) {
      console.error('Error listing users:', e);
      return Response.json({ error: 'Error listing users' }, { status: 500 });
    }

    // Excluir al propio vendedor
    const vendedorEmail = listing.vendedor_email || listing.created_by;
    const recipients = (users || []).filter(u => u.email && u.email !== vendedorEmail);

    console.log(`Notificando nuevo anuncio "${titulo}" a ${recipients.length} usuarios`);

    // 1) Notificaciones in-app (AppNotification) en lotes
    const notifPayloads = recipients.map(u => ({
      usuario_email: u.email,
      titulo: `🛍️ Nuevo en el Mercadillo`,
      mensaje: `${vendedor} ha publicado: "${titulo}" (${precio}). ¡Échale un vistazo!`,
      tipo: 'info',
      icono: '🛍️',
      enlace: ''
    }));

    // Crear en lotes de 20
    for (let i = 0; i < notifPayloads.length; i += 20) {
      const batch = notifPayloads.slice(i, i + 20);
      try {
        await base44.asServiceRole.entities.AppNotification.bulkCreate(batch);
      } catch (e) {
        console.error(`Error creating notifications batch ${i}:`, e);
      }
    }

    // 2) Emails en lotes (sin bloquear)
    const emailSubject = `🛍️ Nuevo en el Mercadillo: ${titulo}`;
    const emailBody = `
<div style="font-family:system-ui,sans-serif;max-width:500px;margin:auto;padding:20px;">
  <div style="background:linear-gradient(135deg,#ea580c,#c2410c);color:white;padding:20px;border-radius:12px 12px 0 0;text-align:center;">
    <h1 style="margin:0;font-size:24px;">🛍️ Nuevo en el Mercadillo</h1>
    <p style="margin:4px 0 0;opacity:0.9;font-size:14px;">CD Bustarviejo</p>
  </div>
  <div style="background:#fff;border:1px solid #e2e8f0;border-top:0;padding:24px;border-radius:0 0 12px 12px;">
    <h2 style="margin:0 0 8px;font-size:20px;color:#1e293b;">${titulo}</h2>
    <p style="margin:0 0 4px;color:#64748b;font-size:14px;">${categoria} · Publicado por ${vendedor}</p>
    <div style="margin:16px 0;padding:12px;background:#f8fafc;border-radius:8px;text-align:center;">
      <span style="font-size:28px;font-weight:800;color:${precio === 'GRATIS' ? '#16a34a' : '#1e293b'};">${precio}</span>
    </div>
    ${listing.descripcion ? `<p style="color:#475569;font-size:14px;margin:12px 0;">${listing.descripcion.substring(0, 200)}${listing.descripcion.length > 200 ? '...' : ''}</p>` : ''}
    <p style="margin:20px 0 0;text-align:center;">
      <a href="https://app.cdbustarviejo.com/Mercadillo" target="_blank" style="display:inline-block;background:#ea580c;color:white;padding:12px 24px;border-radius:8px;font-weight:bold;font-size:14px;text-decoration:none;">
        Abrir Mercadillo en la App →
      </a>
    </p>
  </div>
  <p style="text-align:center;color:#94a3b8;font-size:11px;margin-top:12px;">CD Bustarviejo · Mercadillo Deportivo</p>
</div>`.trim();

    // Enviar emails en lotes de 5 para no saturar
    for (let i = 0; i < recipients.length; i += 5) {
      const batch = recipients.slice(i, i + 5);
      const promises = batch.map(u =>
        base44.asServiceRole.integrations.Core.SendEmail({
          to: u.email,
          subject: emailSubject,
          body: emailBody,
          from_name: 'CD Bustarviejo - Mercadillo'
        }).catch(e => console.error(`Email error for ${u.email}:`, e))
      );
      await Promise.all(promises);
    }

    return Response.json({ ok: true, notified: recipients.length });
  } catch (error) {
    console.error('notifyNewMarketListing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});