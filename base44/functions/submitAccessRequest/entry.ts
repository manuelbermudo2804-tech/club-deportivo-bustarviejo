import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DISPOSABLE_DOMAINS = ['mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'trashmail.com', 'yopmail.com', 'throwaway.email', 'fakeinbox.com'];

const FAKE_NAME_PATTERNS = [
  /^(test|prueba|asdf|qwerty|aaaa|bbbb|xxxx|zzzz|nombre|name)$/i,
  /^(.)\1{3,}$/,
  /^[0-9]+$/,
  /^[^a-záéíóúñü\s]+$/i,
];

function isFakeName(name) {
  if (!name || name.trim().length < 3) return true;
  const trimmed = name.trim();
  // YA NO exigimos espacio (nombre + apellido) — muchas familias ponen solo el nombre
  // y eso bloqueaba solicitudes legítimas. Solo bloqueamos patrones obviamente falsos.
  return FAKE_NAME_PATTERNS.some(p => p.test(trimmed));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, nombre_progenitor, tipo_solicitante, telefono, categoria, nombre_jugador, prefiere_whatsapp, device_fingerprint, user_agent, website } = body;

    // 1. Honeypot: si el campo "website" está relleno, es un bot
    if (website && website.trim() !== '') {
      return Response.json({ success: true }); // Falso éxito para no alertar al bot
    }

    if (!email || !nombre_progenitor || !categoria) {
      return Response.json({ error: 'Email, nombre y categoría son obligatorios' }, { status: 400 });
    }

    // 2. Validar nombre real
    if (isFakeName(nombre_progenitor)) {
      return Response.json({ error: 'Por favor introduce tu nombre y apellidos completos.' }, { status: 400 });
    }

    // 3. Validar email
    const emailLower = email.toLowerCase().trim();
    const emailDomain = emailLower.split('@')[1];
    if (!emailDomain || DISPOSABLE_DOMAINS.includes(emailDomain)) {
      return Response.json({ error: 'Por favor usa un email válido y permanente.' }, { status: 400 });
    }

    // 4. Bloqueo por dispositivo
    if (device_fingerprint) {
      const blocked = await base44.asServiceRole.entities.SanIsidroBlockedDevice.filter({ device_fingerprint });
      if (blocked.length > 0) {
        return Response.json({ error: 'Este dispositivo ha sido bloqueado. Contacta directamente con el club.' }, { status: 403 });
      }

      // Rate limit por dispositivo (máximo 3 solicitudes)
      const sameDevice = await base44.asServiceRole.entities.AccessRequest.filter({ device_fingerprint });
      if (sameDevice.length >= 3) {
        return Response.json({ error: 'Has alcanzado el máximo de solicitudes desde este dispositivo. Contacta directamente con el club.' }, { status: 429 });
      }
    }

    // 5. Duplicados pendientes
    const existing = await base44.asServiceRole.entities.AccessRequest.filter({
      email: emailLower,
      estado: 'pendiente',
    });

    if (existing.length > 0) {
      // No tratamos como error: la familia ya solicitó, devolvemos success para no asustar
      // y el admin ya tiene la solicitud en la bandeja.
      // Devolvemos el id REAL del request existente para que el frontend pueda
      // distinguir "creada de cero" vs "ya existía" y no aparezca como fantasma.
      console.log('[submitAccessRequest] Duplicado pendiente, devolviendo success silencioso para', emailLower, 'id:', existing[0].id);
      return Response.json({ success: true, duplicate: true, request_id: existing[0].id });
    }

    // 5.b Rate limit por email (máx 2 solicitudes en 24h, sea cual sea el estado)
    const allWithEmail = await base44.asServiceRole.entities.AccessRequest.filter({ email: emailLower });
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const recentByEmail = allWithEmail.filter(r => new Date(r.created_date).getTime() > since);
    if (recentByEmail.length >= 2) {
      return Response.json({ error: 'Has enviado demasiadas solicitudes con este email. Espera 24h o escríbenos a info@cdbustarviejo.com.' }, { status: 429 });
    }

    // 6. Crear solicitud
    const ALLOWED_TIPOS = ['padre', 'madre', 'tutor', 'jugador_adulto'];
    const created = await base44.asServiceRole.entities.AccessRequest.create({
      email: emailLower,
      nombre_progenitor: nombre_progenitor.trim(),
      tipo_solicitante: ALLOWED_TIPOS.includes(tipo_solicitante) ? tipo_solicitante : undefined,
      telefono: (telefono || '').trim(),
      categoria,
      nombre_jugador: nombre_jugador || '',
      prefiere_whatsapp: !!prefiere_whatsapp,
      estado: 'pendiente',
      device_fingerprint: device_fingerprint || '',
      user_agent: user_agent || '',
    });

    console.log('[submitAccessRequest] Solicitud creada OK', { id: created?.id, email: emailLower, nombre: nombre_progenitor });

    // La notificación a admin (push + email) la dispara una automatización entity create
    // sobre AccessRequest → notifyAdminNewAccessRequest. Es más fiable que invocar la
    // función internamente (lo que devolvía 403 al cruzar service-role entre funciones).

    // VERIFICACIÓN POST-CREACIÓN: re-leemos el registro para confirmar que está en la BD.
    // Si por cualquier motivo (race condition, error silencioso del SDK) no quedó guardado,
    // devolvemos error explícito al frontend para que la familia sepa que NO se envió.
    let verified = null;
    try {
      verified = await base44.asServiceRole.entities.AccessRequest.get(created.id);
    } catch (e) {
      console.error('[submitAccessRequest] No se pudo verificar la creación:', e?.message);
    }
    if (!verified) {
      console.error('[submitAccessRequest] ⚠️ create() devolvió OK pero el registro NO está en la BD', { id: created?.id, email: emailLower });
      return Response.json({ error: 'No se pudo guardar tu solicitud. Por favor inténtalo de nuevo en unos segundos.' }, { status: 500 });
    }

    return Response.json({ success: true, request_id: created.id });
  } catch (error) {
    console.error('[submitAccessRequest] Error fatal:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});