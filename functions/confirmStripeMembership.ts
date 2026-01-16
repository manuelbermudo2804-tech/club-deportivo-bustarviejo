import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await req.json();
    if (!sessionId) {
      return Response.json({ error: 'Missing sessionId' }, { status: 400 });
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      console.error('[confirmStripeMembership] Missing STRIPE_SECRET_KEY');
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    // Recuperar la sesión para verificar el pago
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const paid = (session.payment_status === 'paid') || (session.status === 'complete');
    if (!paid) {
      return Response.json({ success: false, message: 'Session not paid yet' });
    }

    const meta = session.metadata || {};
    const emailFromMeta = (meta.email || '').toLowerCase();
    const email = (emailFromMeta || session.customer_details?.email || session.customer_email || user.email || '').toLowerCase();
    const name = meta.nombre_completo || session.customer_details?.name || user.full_name || email;
    const amount = (session.amount_total || 0) / 100;
    const tipo = meta.tipo || 'cuota_socio';

    // Temporada fallback
    let temporada = meta.temporada || '';
    if (!temporada) {
      try {
        const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
        temporada = configs?.[0]?.temporada || '';
      } catch (_) {}
      if (!temporada) {
        const now = new Date();
        const y = now.getFullYear();
        const m = now.getMonth() + 1;
        temporada = m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`;
      }
    }

    if ((tipo === 'cuota_socio' || !tipo) && email) {
      const existing = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
      if (existing && existing.length > 0) {
        const member = existing[0];
        await base44.asServiceRole.entities.ClubMember.update(member.id, {
          estado_pago: 'Pagado',
          cuota_pagada: amount || 25,
          fecha_pago: new Date().toISOString().split('T')[0],
          metodo_pago: 'Tarjeta'
        });
        return Response.json({ success: true, updated: true, id: member.id });
      } else {
        const created = await base44.asServiceRole.entities.ClubMember.create({
          numero_socio: `CDB-${new Date().getFullYear()}-${Math.floor(Math.random()*10000).toString().padStart(4,'0')}`,
          nombre_completo: name || email,
          dni: meta.dni || '',
          telefono: meta.telefono || '',
          email,
          direccion: meta.direccion || '',
          municipio: meta.municipio || '',
          cuota_socio: amount || 25,
          cuota_pagada: amount || 25,
          tipo_inscripcion: meta.tipo_inscripcion || 'Nueva Inscripción',
          estado_pago: 'Pagado',
          temporada,
          activo: true,
          es_socio_externo: (meta.es_socio_externo === 'true') || false,
          metodo_pago: 'Tarjeta',
          referido_por: meta.referido_por || ''
        });
        return Response.json({ success: true, created: true, id: created.id });
      }
    }

    return Response.json({ success: false, message: 'Missing email or invalid tipo' }, { status: 400 });
  } catch (error) {
    console.error('[confirmStripeMembership] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});