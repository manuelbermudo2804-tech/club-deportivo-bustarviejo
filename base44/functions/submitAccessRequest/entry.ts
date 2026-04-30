import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const DISPOSABLE_DOMAINS = ['mailinator.com', 'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'trashmail.com', 'yopmail.com', 'throwaway.email', 'fakeinbox.com'];

const FAKE_NAME_PATTERNS = [
  /^(test|prueba|asdf|qwerty|aaaa|bbbb|xxxx|zzzz|nombre|name)$/i,
  /^(.)\1{3,}$/,
  /^[0-9]+$/,
  /^[^a-záéíóúñü\s]+$/i,
];

function isFakeName(name) {
  if (!name || name.trim().length < 4) return true;
  const trimmed = name.trim();
  if (!trimmed.includes(' ')) return true; // Debe tener al menos nombre + apellido
  return FAKE_NAME_PATTERNS.some(p => p.test(trimmed));
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, nombre_progenitor, categoria, nombre_jugador, device_fingerprint, user_agent, website } = body;

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
      return Response.json({ error: 'Ya tienes una solicitud pendiente. Te enviaremos el código pronto.' }, { status: 400 });
    }

    // 6. Crear solicitud
    await base44.asServiceRole.entities.AccessRequest.create({
      email: emailLower,
      nombre_progenitor: nombre_progenitor.trim(),
      categoria,
      nombre_jugador: nombre_jugador || '',
      estado: 'pendiente',
      device_fingerprint: device_fingerprint || '',
      user_agent: user_agent || '',
    });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});