import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';

// Endpoint PÚBLICO para que la landing page externa cree un socio + sesión Stripe.
// Usa asServiceRole porque no hay usuario autenticado (llamada externa).
Deno.serve(async (req) => {
  // CORS para llamadas desde la landing (GitHub Pages u otro dominio)
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log('[publicMemberCheckout] Payload recibido:', JSON.stringify(body));

    const {
      nombre_completo,
      dni,
      telefono,
      email,
      direccion,
      municipio,
      fecha_nacimiento,
      tipo_pago,
      tipo_inscripcion,
      referido_por,
      es_segundo_progenitor,
      success_url,
      cancel_url,
    } = body;

    // Validaciones básicas
    if (!nombre_completo || !email) {
      return Response.json({ error: 'Nombre y email son obligatorios' }, { status: 400, headers: corsHeaders });
    }

    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      console.error('[publicMemberCheckout] STRIPE_SECRET_KEY no configurada');
      return Response.json({ error: 'Stripe no configurado' }, { status: 500, headers: corsHeaders });
    }

    // Inicializar Base44 SDK - usar service role directamente para endpoints públicos
    const base44 = createClientFromRequest(req);
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    // Obtener temporada activa desde SeasonConfig
    let temporada;
    try {
      const seasonConfigs = await base44.asServiceRole.entities.SeasonConfig.list();
      const activeConfig = seasonConfigs.find(c => c.activa === true);
      temporada = activeConfig?.temporada;
    } catch (e) {
      console.error('[publicMemberCheckout] Error obteniendo SeasonConfig:', e.message);
    }
    if (!temporada) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth() + 1;
      temporada = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    }
    console.log('[publicMemberCheckout] Temporada:', temporada, '| Email:', email);

    // Verificar si ya existe un socio con ese email para esta temporada
    let existingMembers = [];
    try {
      existingMembers = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
      console.log('[publicMemberCheckout] Socios existentes:', existingMembers.length);
    } catch (filterErr) {
      console.error('[publicMemberCheckout] Error buscando socios:', filterErr.message);
    }

    let membership = existingMembers?.[0] || null;

    if (membership && membership.estado_pago === 'Pagado') {
      return Response.json({ error: 'Ya eres socio esta temporada y tu pago esta confirmado.' }, { status: 400, headers: corsHeaders });
    }

    // Crear o reutilizar el ClubMember
    if (!membership) {
      // Generar número de socio único
      let allMembers = [];
      try {
        allMembers = await base44.asServiceRole.entities.ClubMember.list();
      } catch (listErr) {
        console.error('[publicMemberCheckout] Error listando socios:', listErr.message);
      }
      const currentYear = new Date().getFullYear();
      const membersThisYear = allMembers.filter(m => m.numero_socio && m.numero_socio.includes('CDB-' + currentYear));
      const nextNumber = membersThisYear.length + 1;
      const numeroSocio = 'CDB-' + currentYear + '-' + String(nextNumber).padStart(4, '0');

      console.log('[publicMemberCheckout] Creando nuevo socio:', numeroSocio);

      membership = await base44.asServiceRole.entities.ClubMember.create({
        numero_socio: numeroSocio,
        tipo_inscripcion: tipo_inscripcion || 'Nueva Inscripcion',
        nombre_completo,
        dni: dni || '',
        telefono: telefono || '',
        email,
        direccion: direccion || '',
        municipio: municipio || '',
        fecha_nacimiento: fecha_nacimiento || '',
        es_segundo_progenitor: es_segundo_progenitor === true || es_segundo_progenitor === 'true',
        es_socio_externo: true,
        cuota_socio: 25,
        estado_pago: 'Pendiente',
        metodo_pago: 'Tarjeta',
        temporada,
        activo: false,
        referido_por: referido_por || '',
        notas: 'Registro desde web externa - pendiente de pago Stripe',
      });

      console.log('[publicMemberCheckout] Socio creado ID:', membership.id);
    } else {
      console.log('[publicMemberCheckout] Reutilizando socio existente ID:', membership.id);
    }

    // Crear sesión de Stripe Checkout
    const isSuscripcion = tipo_pago === 'suscripcion';

    const metadata = {
      tipo: 'cuota_socio',
      membership_id: membership.id,
      nombre_completo,
      dni: dni || '',
      telefono: telefono || '',
      email,
      direccion: direccion || '',
      municipio: municipio || '',
      temporada,
      tipo_inscripcion: tipo_inscripcion || 'Nueva Inscripcion',
      referido_por: referido_por || '',
      es_segundo_progenitor: String(es_segundo_progenitor || false),
      origen: 'web_externa',
      origen_pago: isSuscripcion ? 'stripe_suscripcion' : 'stripe_unico',
    };

    const defaultSuccessUrl = success_url || ('https://manuelbermudo2804-tech.github.io/-club-landing-page-Bustarviejo/?paid=ok&membership_id=' + membership.id);
    const defaultCancelUrl = cancel_url || ('https://manuelbermudo2804-tech.github.io/-club-landing-page-Bustarviejo/?canceled=socio&membership_id=' + membership.id);

    console.log('[publicMemberCheckout] Creando sesion Stripe, modo:', isSuscripcion ? 'subscription' : 'payment');
    console.log('[publicMemberCheckout] success_url:', defaultSuccessUrl);
    console.log('[publicMemberCheckout] cancel_url:', defaultCancelUrl);

    let sessionUrl;

    if (isSuscripcion) {
      const session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        customer_email: email,
        success_url: defaultSuccessUrl,
        cancel_url: defaultCancelUrl,
        subscription_data: { metadata },
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: 'Cuota Socio CD Bustarviejo (Anual)' },
            unit_amount: 2500,
            recurring: { interval: 'year' },
          },
          quantity: 1,
        }],
        metadata,
      });
      sessionUrl = session.url;
    } else {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        customer_email: email,
        success_url: defaultSuccessUrl,
        cancel_url: defaultCancelUrl,
        line_items: [{
          price_data: {
            currency: 'eur',
            product_data: { name: 'Cuota Socio CD Bustarviejo (Pago Unico)' },
            unit_amount: 2500,
          },
          quantity: 1,
        }],
        metadata,
      });
      sessionUrl = session.url;
    }

    console.log('[publicMemberCheckout] Sesion Stripe creada, URL:', sessionUrl ? 'OK' : 'VACIA');

    return Response.json({
      success: true,
      url: sessionUrl,
      membership_id: membership.id,
    }, { headers: corsHeaders });

  } catch (error) {
    console.error('[publicMemberCheckout] Error:', error?.message || error);
    console.error('[publicMemberCheckout] Stack:', error?.stack || 'N/A');
    return Response.json({ error: error?.message || 'Error interno' }, { status: 500, headers: corsHeaders });
  }
});