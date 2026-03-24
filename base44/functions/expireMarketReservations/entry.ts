import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date().toISOString();

    // Buscar anuncios reservados cuya reserva temporal haya caducado
    const expiring = await base44.asServiceRole.entities.MarketListing.filter({
      estado: 'reservado',
      reserva_temporal_hasta: { $lt: now }
    });

    let released = 0;
    for (const item of (expiring || [])) {
      // Liberar anuncio
      await base44.asServiceRole.entities.MarketListing.update(item.id, {
        estado: 'activo',
        reservado_por_email: null,
        reservado_por_nombre: null,
        reservado_fecha: null,
        reserva_temporal_hasta: null
      });

      // Notificar al vendedor que la reserva ha caducado
      const vendedorEmail = item.vendedor_email || item.created_by;
      if (vendedorEmail) {
        await base44.asServiceRole.entities.AppNotification.create({
          usuario_email: vendedorEmail,
          titulo: 'Reserva caducada',
          mensaje: `La reserva temporal de "${item.titulo}" ha caducado. El anuncio vuelve a estar activo.`,
          tipo: 'info',
          icono: '⏰',
          enlace: ''
        });
      }

      released += 1;
    }

    return Response.json({ success: true, releasedCount: released, checkedAt: now });
  } catch (error) {
    console.error('expireMarketReservations error:', error);
    return Response.json({ success: false, error: error.message }, { status: 500 });
  }
});