// Crea un participante provisional de la Porra y lanza Stripe Checkout
// Genera un token único de acceso que se envía por email tras el pago
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';
import Stripe from 'npm:stripe@14.21.0';

function generarToken() {
  // Token único de 32 caracteres alfanuméricos
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return Response.json({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { nombre, email, alias_equipo, telefono, mini_liga_codigo, return_url } = body || {};

    // Validaciones básicas
    if (!nombre || !email || !alias_equipo) {
      return Response.json({ error: 'Faltan campos obligatorios (nombre, email, alias_equipo)' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Email inválido' }, { status: 400 });
    }
    if (alias_equipo.length < 2 || alias_equipo.length > 40) {
      return Response.json({ error: 'El alias debe tener entre 2 y 40 caracteres' }, { status: 400 });
    }

    // Cargar configuración
    const configs = await base44.asServiceRole.entities.PorraConfig.list();
    const config = configs[0];
    if (!config || !config.activa) {
      return Response.json({ error: 'La porra no está activa' }, { status: 403 });
    }

    // Comprobar fecha límite
    if (config.fecha_limite_predicciones) {
      const limite = new Date(config.fecha_limite_predicciones).getTime();
      if (Date.now() > limite) {
        return Response.json({ error: 'Plazo de inscripciones cerrado' }, { status: 403 });
      }
    }

    // Validar alias único (entre los pagados o pendientes)
    const existingAlias = await base44.asServiceRole.entities.PorraParticipante.filter({ alias_equipo });
    if (existingAlias.length > 0) {
      return Response.json({ error: 'Ese alias ya está cogido. Elige otro.' }, { status: 409 });
    }

    // Si permite múltiples porras → permitimos varios registros con el mismo email
    if (!config.permitir_multiples_porras) {
      const existing = await base44.asServiceRole.entities.PorraParticipante.filter({ email });
      if (existing.some(e => e.estado_pago === 'pagado')) {
        return Response.json({ error: 'Ya tienes una porra creada con este email' }, { status: 409 });
      }
    }

    // Validar mini-liga si viene un código
    let miniLigaCodigos = [];
    if (mini_liga_codigo) {
      const ligas = await base44.asServiceRole.entities.PorraLiga.filter({ codigo: mini_liga_codigo.toUpperCase() });
      if (ligas.length === 0) {
        return Response.json({ error: 'Código de mini-liga no encontrado' }, { status: 404 });
      }
      miniLigaCodigos = [mini_liga_codigo.toUpperCase()];
    }

    // Crear participante provisional
    const token = generarToken();
    const precio = Number(config.precio_entrada || 15);

    const participante = await base44.asServiceRole.entities.PorraParticipante.create({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      alias_equipo: alias_equipo.trim(),
      telefono: telefono?.trim() || '',
      token_acceso: token,
      estado_pago: 'pendiente',
      cantidad_pagada: 0,
      predicciones_grupos: {},
      clasificacion_grupos: {},
      desempates_resueltos: {},
      predicciones_eliminatorias: {},
      predicciones_especiales: {},
      mini_liga_codigos: miniLigaCodigos,
      ip_creacion: req.headers.get('x-forwarded-for') || '',
      user_agent: req.headers.get('user-agent') || '',
    });

    // Stripe Checkout
    const stripeSecret = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecret) {
      return Response.json({ error: 'Stripe no configurado' }, { status: 500 });
    }
    const stripe = new Stripe(stripeSecret, { apiVersion: '2024-06-20' });

    const baseUrl = return_url || req.headers.get('origin') || 'https://app.cdbustarviejo.com';

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'eur',
          product_data: {
            name: `🏆 Porra Mundial 2026 — ${alias_equipo}`,
            description: `Entrada para la porra del Mundial 2026 by CD Bustarviejo. El ${config.comision_club_porcentaje || 10}% va destinado a ${config.destino_comision_club || 'el club'}.`,
          },
          unit_amount: Math.round(precio * 100),
        },
        quantity: 1,
      }],
      success_url: `${baseUrl}/PorraExito?token=${token}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/Porra`,
      metadata: {
        tipo: 'porra',
        participante_id: participante.id,
        token_acceso: token,
        alias_equipo: alias_equipo.trim(),
        nombre: nombre.trim(),
        user_email: email.toLowerCase().trim(),
        base44_app_id: Deno.env.get('BASE44_APP_ID') || 'unknown',
      },
    });

    // Guardar session_id en el participante para reconciliar después
    await base44.asServiceRole.entities.PorraParticipante.update(participante.id, {
      stripe_session_id: session.id,
    });

    return Response.json({
      ok: true,
      checkout_url: session.url,
      participante_id: participante.id,
      token,
    });
  } catch (error) {
    console.error('[porraCrearParticipante] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});