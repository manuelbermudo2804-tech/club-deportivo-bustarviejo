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

// ============================================================
// AUTO-ENVÍO INTELIGENTE
// Solo se dispara cuando la confianza es "verde": el email
// coincide EXACTAMENTE con el de un tutor (o jugador) de un
// jugador ACTIVO en el club. En cualquier otro caso, la
// solicitud queda pendiente para revisión manual del admin.
// ============================================================
function normalize(s) {
  return String(s || "").trim().toLowerCase();
}

async function isTrustedRequest(base44, emailLower) {
  try {
    // Buscamos jugadores activos cuyo tutor/jugador tenga este email
    const playersA = await base44.asServiceRole.entities.Player.filter({ email_padre: emailLower, activo: true });
    if (playersA.length > 0) return { trusted: true, player: playersA[0] };

    const playersB = await base44.asServiceRole.entities.Player.filter({ email_tutor_2: emailLower, activo: true });
    if (playersB.length > 0) return { trusted: true, player: playersB[0] };

    const playersC = await base44.asServiceRole.entities.Player.filter({ email_jugador: emailLower, activo: true });
    if (playersC.length > 0) return { trusted: true, player: playersC[0] };

    return { trusted: false };
  } catch (e) {
    console.error('[submitAccessRequest] Error evaluando confianza:', e.message);
    return { trusted: false };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { email, nombre_progenitor, telefono, categoria, nombre_jugador, device_fingerprint, user_agent, website } = body;

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
    const emailLower = normalize(email);
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
    const created = await base44.asServiceRole.entities.AccessRequest.create({
      email: emailLower,
      nombre_progenitor: nombre_progenitor.trim(),
      telefono: (telefono || '').trim(),
      categoria,
      nombre_jugador: nombre_jugador || '',
      estado: 'pendiente',
      device_fingerprint: device_fingerprint || '',
      user_agent: user_agent || '',
    });

    // 7. AUTO-ENVÍO si la solicitud es de confianza (email coincide con tutor de jugador activo)
    let autoSent = false;
    try {
      const trust = await isTrustedRequest(base44, emailLower);
      if (trust.trusted) {
        console.log('[submitAccessRequest] ✅ Solicitud de confianza, enviando código automáticamente a', emailLower);
        const { data: result } = await base44.asServiceRole.functions.invoke('generateAccessCode', {
          email: emailLower,
          tipo: 'padre_nuevo',
          nombre_destino: nombre_progenitor.trim(),
          mensaje_personalizado: '',
        });

        if (result?.success && result?.id) {
          await base44.asServiceRole.entities.AccessRequest.update(created.id, {
            estado: 'codigo_enviado',
            codigo_enviado_id: result.id,
          });
          autoSent = true;
        }
      }
    } catch (autoErr) {
      // Si falla el auto-envío, la solicitud queda pendiente para revisión manual (comportamiento clásico)
      console.error('[submitAccessRequest] Auto-envío falló (queda pendiente para revisión manual):', autoErr.message);
    }

    return Response.json({ success: true, auto_sent: autoSent });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});