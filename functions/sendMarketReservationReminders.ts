import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Buscar anuncios reservados >48h y que no hayan recibido recordatorio en las últimas 24h
    const now = Date.now();
    const listings = await base44.asServiceRole.entities.MarketListing.filter({ estado: 'reservado' });

    let processed = 0;
    for (const l of listings || []) {
      try {
        const t = l?.reservado_fecha ? new Date(l.reservado_fecha).getTime() : null;
        if (!t) continue;
        const over48h = now - t >= 48 * 60 * 60 * 1000;
        if (!over48h) continue;
        const last = l?.ultimo_recordatorio_reserva ? new Date(l.ultimo_recordatorio_reserva).getTime() : 0;
        const over24hSinceLast = now - last >= 24 * 60 * 60 * 1000;
        if (!over24hSinceLast) continue;

        const vendedorEmail = l.vendedor_email || l.created_by;
        const compradorNombre = l.reservado_por_nombre || l.reservado_por_email || 'Comprador';

        // Notificación en app
        if (vendedorEmail) {
          await base44.asServiceRole.entities.AppNotification.create({
            usuario_email: vendedorEmail,
            titulo: `Recordatorio: cierra tu anuncio reservado`,
            mensaje: `${compradorNombre} reservó "${l.titulo}" hace más de 48h. Márcalo como Vendido o Entregado.`,
            tipo: 'importante',
            icono: '🛍️',
            enlace: ''
          });
        }

        // Email
        if (vendedorEmail) {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: vendedorEmail,
            subject: `Recordatorio: cierra tu anuncio reservado - ${l.titulo}`,
            body: `Hola,\n\nEste es un recordatorio automático. Tu anuncio \"${l.titulo}\" está en estado RESERVADO desde hace más de 48 horas.\n\nPor favor, cierra el anuncio marcándolo como \"Vendido\"${l.tipo === 'donacion' ? ' o \"Entregado\"' : ''} para mantener el mercadillo actualizado.\n\nGracias.`
          });
        }

        // Marcar fecha de último recordatorio
        await base44.asServiceRole.entities.MarketListing.update(l.id, {
          ultimo_recordatorio_reserva: new Date().toISOString(),
        });
        processed++;
      } catch (e) {
        console.error('Error processing listing', l?.id, e?.message || e);
      }
    }

    return Response.json({ ok: true, processed });
  } catch (error) {
    console.error('sendMarketReservationReminders error', error?.message || error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});