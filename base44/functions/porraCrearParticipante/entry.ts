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
    if (!nombre || !email || !alias_equipo || !telefono) {
      return Response.json({ error: 'Faltan campos obligatorios (nombre, email, alias_equipo, telefono)' }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Email inválido' }, { status: 400 });
    }
    if (alias_equipo.length < 2 || alias_equipo.length > 40) {
      return Response.json({ error: 'El alias debe tener entre 2 y 40 caracteres' }, { status: 400 });
    }
    // Validar teléfono español (9 dígitos, opcionalmente con prefijo +34 y espacios)
    const telefonoLimpio = String(telefono).replace(/[\s\-+]/g, '').replace(/^34/, '');
    if (!/^[6789]\d{8}$/.test(telefonoLimpio)) {
      return Response.json({ error: 'Teléfono inválido. Debe ser un número español de 9 dígitos.' }, { status: 400 });
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

    // Validar alias único — case-insensitive (España == españa == ESPAÑA)
    const aliasNormalizado = alias_equipo.trim().toLowerCase();
    const allParts = await base44.asServiceRole.entities.PorraParticipante.list('', 5000);
    const aliasColisiona = allParts.some(p => (p.alias_equipo || '').trim().toLowerCase() === aliasNormalizado);
    if (aliasColisiona) {
      return Response.json({ error: 'Ese alias ya está cogido. Elige otro.' }, { status: 409 });
    }
    // Bloquear caracteres raros / inyección visual
    if (/[<>"`]/.test(alias_equipo)) {
      return Response.json({ error: 'El alias contiene caracteres no permitidos' }, { status: 400 });
    }

    // Límite de porras por email
    const emailLimpio = email.toLowerCase().trim();
    const existing = await base44.asServiceRole.entities.PorraParticipante.filter({ email: emailLimpio });
    const pagadas = existing.filter(e => e.estado_pago === 'pagado');
    if (!config.permitir_multiples_porras) {
      // Solo 1 porra por email
      if (pagadas.length > 0) {
        return Response.json({ error: 'Ya tienes una porra creada con este email' }, { status: 409 });
      }
    } else {
      // Máximo 3 porras por email
      const MAX_PORRAS_POR_EMAIL = 3;
      if (pagadas.length >= MAX_PORRAS_POR_EMAIL) {
        return Response.json({ error: `Has alcanzado el máximo de ${MAX_PORRAS_POR_EMAIL} porras por email. Si quieres meter más, usa otro email.` }, { status: 409 });
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
    const modoTest = !!config.modo_test;

    const participante = await base44.asServiceRole.entities.PorraParticipante.create({
      nombre: nombre.trim(),
      email: email.toLowerCase().trim(),
      alias_equipo: alias_equipo.trim(),
      telefono: telefono?.trim() || '',
      token_acceso: token,
      estado_pago: modoTest ? 'pagado' : 'pendiente',
      cantidad_pagada: modoTest ? 0 : 0,
      fecha_pago: modoTest ? new Date().toISOString() : null,
      predicciones_grupos: {},
      clasificacion_grupos: {},
      desempates_resueltos: {},
      predicciones_eliminatorias: {},
      predicciones_especiales: {},
      mini_liga_codigos: miniLigaCodigos,
      ip_creacion: req.headers.get('x-forwarded-for') || '',
      user_agent: req.headers.get('user-agent') || '',
    });

    // ============ MODO TEST: saltar Stripe y mandar email mágico directamente ============
    if (modoTest) {
      try {
        const baseUrlT = return_url || req.headers.get('origin') || 'https://app.cdbustarviejo.com';
        const enlaceMagico = `${baseUrlT}/PorraMiPorra?token=${token}`;
        const aliasSafe = alias_equipo.trim().replace(/[<>]/g, '');
        const nombreSafe = nombre.trim().replace(/[<>]/g, '');

        const emailHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="font-family:'Segoe UI',Arial,sans-serif;margin:0;padding:0;background:#f1f5f9">
<div style="max-width:600px;margin:0 auto;background:#ffffff">
<div style="background:linear-gradient(135deg,#dc2626,#ea580c,#f59e0b);padding:40px 24px;text-align:center">
<div style="font-size:64px;margin-bottom:8px">🏆</div>
<h1 style="color:#ffffff;margin:0;font-size:28px;font-weight:900">¡Estás dentro! <span style="font-size:14px;background:#fbbf24;color:#78350f;padding:4px 10px;border-radius:6px;vertical-align:middle">MODO TEST</span></h1>
<p style="color:rgba(255,255,255,0.95);margin:8px 0 0;font-size:16px;font-weight:600">Porra Mundial 2026 · CD Bustarviejo</p>
</div>
<div style="padding:32px 24px">
<p style="margin:0 0 16px;font-size:16px;color:#1e293b">Hola <strong>${nombreSafe}</strong>,</p>
<div style="background:#fef3c7;border:2px solid #f59e0b;padding:14px;border-radius:8px;margin:0 0 18px">
<p style="margin:0;font-size:13px;color:#78350f;font-weight:700">🧪 Esta porra se ha creado en <strong>MODO TEST</strong> (sin cobro). Es solo para pruebas.</p>
</div>
<div style="background:linear-gradient(135deg,#fff7ed,#fed7aa);border:2px solid #fb923c;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
<p style="margin:0 0 4px;font-size:12px;color:#9a3412;text-transform:uppercase;letter-spacing:1px;font-weight:700">Tu equipo</p>
<p style="margin:0;font-size:22px;font-weight:900;color:#7c2d12">${aliasSafe}</p>
</div>
<div style="text-align:center;margin:28px 0">
<a href="${enlaceMagico}" style="display:inline-block;background-color:#dc2626;color:#ffffff;text-decoration:none;padding:16px 36px;border-radius:12px;font-weight:900;font-size:16px;box-shadow:0 8px 20px rgba(220,38,38,0.3)">
🏆 EMPEZAR A PREDECIR
</a>
</div>
<p style="margin:8px 0;font-size:11px;color:#94a3b8;text-align:center;word-break:break-all">Si el botón no funciona, copia este enlace:<br/><a href="${enlaceMagico}" style="color:#ea580c">${enlaceMagico}</a></p>
<p style="margin:20px 0 0;font-size:13px;color:#64748b"><strong>CD Bustarviejo</strong></p>
</div>
</div></body></html>`;

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email.toLowerCase().trim(),
          subject: `🧪 [TEST] Tu porra de prueba está lista — ${aliasSafe}`,
          body: emailHtml,
        });
        console.log('[porraCrearParticipante] MODO TEST: email mágico enviado a', email);
      } catch (emailErr) {
        console.error('[porraCrearParticipante] MODO TEST email error:', emailErr?.message || emailErr);
      }

      return Response.json({
        ok: true,
        modo_test: true,
        participante_id: participante.id,
        token,
        redirect_url: `/PorraExito?token=${token}&test=1`,
      });
    }

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