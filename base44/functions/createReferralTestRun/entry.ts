import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generateReferralCode(email: string) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 8);
}

Deno.serve(async (req) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers });
  if (req.method !== 'POST') return Response.json({ success: false, error: 'Método no permitido' }, { status: 405, headers });

  try {
    const body = await req.json();
    const nombre = String(body.nombre_completo || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const telefono = String(body.telefono || '').trim();
    const code = String(body.code || '').trim().toUpperCase();

    if (!nombre || !email || !code || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ success: false, error: 'Nombre, email y enlace de referido válido son obligatorios.' }, { status: 400, headers });
    }

    const base44 = createClientFromRequest(req);
    const configs = await base44.asServiceRole.entities.SeasonConfig.list();
    const cfg = configs.find((c: any) => c.activa === true);
    const testerEmail = String(cfg?.programa_referidos_usuario_prueba_email || '').trim().toLowerCase();

    if (!cfg || cfg.programa_referidos_modo_prueba !== true || cfg.programa_referidos_activo === true || !testerEmail) {
      return Response.json({ success: false, error: 'El modo de pruebas no está activo.' }, { status: 403, headers });
    }

    const users = await base44.asServiceRole.entities.User.list('', 5000);
    const referrer = users.find((u: any) => u.email && generateReferralCode(String(u.email).toLowerCase()) === code);
    if (!referrer || String(referrer.email).trim().toLowerCase() !== testerEmail) {
      return Response.json({ success: false, error: 'Este enlace no pertenece al usuario autorizado para las pruebas.' }, { status: 403, headers });
    }

    if (email === testerEmail) {
      return Response.json({ success: false, error: 'El usuario que recomienda no puede inscribirse a sí mismo.' }, { status: 400, headers });
    }

    const token = `ref-test-${crypto.randomUUID()}`;
    await base44.asServiceRole.entities.ReferralTestRun.create({
      tipo_registro: 'sesion',
      session_token: token,
      referidor_email: testerEmail,
      referidor_nombre: referrer.full_name || testerEmail,
      estado_prueba: 'abierta',
      fecha_prueba: new Date().toISOString()
    });
    await base44.asServiceRole.entities.ReferralTestRun.create({
      tipo_registro: 'referido',
      session_token: token,
      flujo: 'automatic',
      referidor_email: testerEmail,
      referido_nombre: nombre,
      referido_email: email,
      referido_telefono: telefono,
      estado_prueba: 'pendiente_validacion',
      pago_simulado: true,
      fecha_prueba: new Date().toISOString()
    });

    return Response.json({ success: true, message: 'Inscripción de prueba registrada.' }, { headers });
  } catch (error) {
    console.error('[createReferralTestRun] Error:', error);
    return Response.json({ success: false, error: 'No se ha podido registrar la inscripción de prueba.' }, { status: 500, headers });
  }
});
