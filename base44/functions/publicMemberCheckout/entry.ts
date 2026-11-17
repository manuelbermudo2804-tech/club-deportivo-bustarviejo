import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import Stripe from 'npm:stripe@14.21.0';


function generateReferralCode(email: string) {
  const normalized = String(email || '').trim().toLowerCase();
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
}

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
    console.log('[publicMemberCheckout] Solicitud recibida:', { email_present: !!body.email, dni_present: !!body.dni, campus: !!body.campus_registration_id });

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
      referidor_nombre,
      referidor_email,
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

    // La atribución se resolverá en servidor después de conocer la temporada activa.
    // Nunca confiamos en el nombre o email de referidor enviado por el navegador.
    let trustedReferrer = null;

    // Obtener temporada activa desde SeasonConfig
    let temporada;
    let precioSocio = 25;
    try {
      const seasonConfigs = await base44.asServiceRole.entities.SeasonConfig.list();
      const activeConfig = seasonConfigs.find(c => c.activa === true);
      temporada = activeConfig?.temporada;
      const configuredPrice = Number(activeConfig?.precio_socio);
      if (Number.isFinite(configuredPrice) && configuredPrice > 0) precioSocio = configuredPrice;
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

    // Solo aceptamos enlaces de socios con la cuota pagada en la temporada activa.
    if (referido_por) {
      try {
        const users = await base44.asServiceRole.entities.User.list('', 5000);
        const code = String(referido_por).trim().toUpperCase();
        const referrerMatches = users.filter(u => u.email && generateReferralCode(u.email) === code);
        const match = referrerMatches.length === 1 ? referrerMatches[0] : null;
        if (match) {
          const refEmail = String(match.email).trim().toLowerCase();
          if (refEmail !== String(email).trim().toLowerCase()) {
            const refMemberships = await base44.asServiceRole.entities.ClubMember.filter({ email: refEmail, temporada });
            const paidMembership = refMemberships.find(m => m.estado_pago === 'Pagado');
            if (paidMembership) {
              trustedReferrer = {
                email: refEmail,
                name: match.full_name || paidMembership.nombre_completo || refEmail.split('@')[0],
              };
            }
          }
        }
      } catch (refErr) {
        console.error('[publicMemberCheckout] No se pudo validar el socio referidor:', refErr?.message || refErr);
      }
    }

    // Verificar si ya existe un socio con ese email para esta temporada
    let byEmail = [], byDni = [];
    try {
      byEmail = await base44.asServiceRole.entities.ClubMember.filter({ email, temporada });
      if (dni) byDni = await base44.asServiceRole.entities.ClubMember.filter({ dni, temporada });
    } catch (filterErr) {
      console.error('[publicMemberCheckout] Error buscando socio existente:', filterErr.message);
      return Response.json({ error: 'No se ha podido comprobar si ya existe una ficha de socio. Inténtalo de nuevo.' }, { status: 503, headers: corsHeaders });
    }
    const matches = [...new Map([...byEmail, ...byDni].map(m=>[m.id,m])).values()];
    if (matches.length > 1) return Response.json({ error: 'Hemos encontrado fichas distintas con ese correo y DNI. Contacta con el club para evitar duplicados.' }, { status: 409, headers: corsHeaders });
    let membership = matches[0] || null;
    if (membership && dni && membership.dni && membership.dni.replace(/[.\\s-]/g,'').toUpperCase() !== dni.replace(/[.\\s-]/g,'').toUpperCase()) {
      return Response.json({ error: 'El correo ya está asociado a una ficha con otro DNI. Contacta con el club.' }, { status: 409, headers: corsHeaders });
    }

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
        cuota_socio: precioSocio,
        estado_pago: 'Pendiente',
        metodo_pago: 'Tarjeta',
        temporada,
        activo: false,
        referido_por: trustedReferrer?.name || '',
        referido_por_email: trustedReferrer?.email || '',
        notas: 'Registro desde web externa - pendiente de pago Stripe',
      });

      console.log('[publicMemberCheckout] Socio creado ID:', membership.id);
    } else {
      console.log('[publicMemberCheckout] Reutilizando socio existente ID:', membership.id);
      if (membership.estado_pago !== 'Pagado' && trustedReferrer) {
        await base44.asServiceRole.entities.ClubMember.update(membership.id, {
          referido_por: trustedReferrer.name,
          referido_por_email: trustedReferrer.email,
        });
      }
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
      referido_por: trustedReferrer ? String(referido_por).trim().toUpperCase() : '',
      referidor_nombre: trustedReferrer?.name || '',
      referidor_email: trustedReferrer?.email || '',
      es_segundo_progenitor: String(es_segundo_progenitor || false),
      origen: body.campus_registration_id ? 'campus_2027' : 'web_externa',
      campus_registration_id: body.campus_registration_id || '',
      origen_pago: isSuscripcion ? 'stripe_suscripcion' : 'stripe_unico',
    };

    const allowedReturnHosts = new Set(['app.cdbustarviejo.com', 'www.cdbustarviejo.com', 'cdbustarviejo.com', 'alta-socio.vercel.app', 'manuelbermudo2804-tech.github.io']);
    const safeReturnUrl = (candidate, fallback) => {
      try {
        const parsed = new URL(candidate || fallback);
        return parsed.protocol === 'https:' && allowedReturnHosts.has(parsed.hostname) ? parsed.toString() : fallback;
      } catch { return fallback; }
    };
    const fallbackSuccess = 'https://app.cdbustarviejo.com/ClubMembership?paid=ok&membership_id=' + membership.id;
    const fallbackCancel = 'https://app.cdbustarviejo.com/ClubMembership?canceled=socio&membership_id=' + membership.id;
    const defaultSuccessUrl = safeReturnUrl(success_url, fallbackSuccess);
    const defaultCancelUrl = safeReturnUrl(cancel_url, fallbackCancel);

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
            unit_amount: Math.round(precioSocio * 100),
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
            unit_amount: Math.round(precioSocio * 100),
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