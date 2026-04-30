import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Helpers de validación (duplicados en backend para seguridad)
const normalizeName = (s) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const cleanPhone = (p) => (p || "").replace(/[\s\-().+]/g, "").replace(/^34/, "");
const FAKE_PHONE = [/^(\d)\1{8}$/, /^123456789$/, /^987654321$/, /^000000000$/];
const DISPOSABLE = ["tempmail.com","mailinator.com","10minutemail.com","guerrillamail.com","yopmail.com","trashmail.com","throwaway.email","fakeinbox.com"];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    const { modalidad, nombre_responsable, telefono_responsable, email_responsable,
            jugador_nombre, nombre_equipo, jugador_1, jugador_2, jugador_3, notas,
            device_fingerprint, user_agent, _hp } = body;

    // Honeypot: si está relleno es un bot
    if (_hp && _hp.length > 0) {
      return Response.json({ error: 'Inscripción bloqueada' }, { status: 400 });
    }

    if (!modalidad || !nombre_responsable || !telefono_responsable) {
      return Response.json({ error: 'Faltan campos obligatorios' }, { status: 400 });
    }

    // Validar dispositivo bloqueado
    if (device_fingerprint) {
      const blocked = await base44.asServiceRole.entities.SanIsidroBlockedDevice.filter({ device_fingerprint });
      if (blocked.length > 0) {
        return Response.json({ error: 'No puedes realizar más inscripciones desde este dispositivo. Contacta con el club si crees que es un error.' }, { status: 403 });
      }
    }

    // Filtro nombres falsos
    const FAKE_NAME = [/^(.)\1{2,}$/, /^(asdf|qwer|test|prueba|aaaa|xxxx|jaja|lol)/i, /^[0-9]+$/, /[a-zA-Z]{15,}/, /<|>|@|#|\$/];
    const isNameFake = (n) => {
      if (!n) return false;
      const t = n.trim();
      if (t.length < 4 || !t.includes(' ')) return true;
      return FAKE_NAME.some(p => p.test(t));
    };
    const allNames = [nombre_responsable, jugador_nombre, jugador_1, jugador_2, jugador_3].filter(Boolean);
    if (allNames.some(isNameFake)) {
      return Response.json({ error: 'Por favor, introduce nombres reales (nombre y apellidos).' }, { status: 400 });
    }
    if (nombre_equipo && /^(test|prueba|asdf|aaaa|xxxx)$/i.test(nombre_equipo.trim())) {
      return Response.json({ error: 'Por favor, pon un nombre real al equipo.' }, { status: 400 });
    }

    // Validar teléfono
    const phone = cleanPhone(telefono_responsable);
    if (phone.length !== 9 || !/^[679]/.test(phone) || FAKE_PHONE.some(p => p.test(phone))) {
      return Response.json({ error: 'El teléfono no es válido. Introduce un número español real (9 dígitos, empieza por 6, 7 o 9).' }, { status: 400 });
    }

    // Validar email (si se proporciona)
    if (email_responsable) {
      const em = email_responsable.trim().toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em)) {
        return Response.json({ error: 'El email no tiene un formato válido' }, { status: 400 });
      }
      const domain = em.split('@')[1];
      if (DISPOSABLE.includes(domain)) {
        return Response.json({ error: 'No se admiten emails desechables' }, { status: 400 });
      }
    }

    // Validar plazas disponibles por modalidad
    const LIMITS = {
      "Fútbol Chapa - Niños/Jóvenes": 16,
      "Fútbol Chapa - Adultos": 16,
      "3 para 3 (7-10 años)": 8,
      "3 para 3 (11-15 años)": 8,
    };
    const limit = LIMITS[modalidad];
    const existingMod = await base44.asServiceRole.entities.SanIsidroRegistration.filter({ modalidad });
    if (limit && existingMod.length >= limit) {
      return Response.json({ error: `Lo sentimos, ya no quedan plazas en "${modalidad}". Se han ocupado las ${limit} disponibles.` }, { status: 400 });
    }

    // Rate limit: máximo 3 inscripciones desde el mismo teléfono en 10 minutos
    const allRecent = await base44.asServiceRole.entities.SanIsidroRegistration.list('-created_date', 100);
    const tenMinAgo = Date.now() - 10 * 60 * 1000;
    const samePhoneRecent = allRecent.filter(r =>
      cleanPhone(r.telefono_responsable) === phone &&
      new Date(r.created_date).getTime() > tenMinAgo
    );
    if (samePhoneRecent.length >= 3) {
      return Response.json({ error: 'Has hecho demasiadas inscripciones seguidas. Espera unos minutos antes de intentarlo de nuevo.' }, { status: 429 });
    }

    // Límite por dispositivo: máximo 3 inscripciones por móvil
    if (device_fingerprint) {
      const sameDevice = allRecent.filter(r => r.device_fingerprint === device_fingerprint);
      if (sameDevice.length >= 5) {
        return Response.json({ error: 'Has alcanzado el máximo de inscripciones desde este dispositivo (5). Si necesitas inscribir más, contacta directamente con el club.' }, { status: 429 });
      }
    }

    // Detectar duplicados de jugadores (BLOQUEAR solo en 3x3)
    const is3x3 = modalidad.startsWith('3 para 3');
    if (is3x3) {
      const newPlayers = [jugador_1, jugador_2, jugador_3].filter(Boolean).map(normalizeName);
      const existingNames = new Set();
      existingMod.forEach(r => {
        [r.jugador_1, r.jugador_2, r.jugador_3].forEach(n => { if (n) existingNames.add(normalizeName(n)); });
      });
      const duplicates = newPlayers.filter(n => existingNames.has(n));
      if (duplicates.length > 0) {
        // Buscar en qué equipos están para mensaje claro
        const dupInfo = duplicates.map(dup => {
          const team = existingMod.find(r => [r.jugador_1, r.jugador_2, r.jugador_3].some(n => normalizeName(n) === dup));
          const original = [team?.jugador_1, team?.jugador_2, team?.jugador_3].find(n => normalizeName(n) === dup);
          return `"${original}" (en equipo "${team?.nombre_equipo}")`;
        });
        return Response.json({
          error: `❌ Inscripción duplicada: ${dupInfo.join(', ')} ya está apuntado en otro equipo de ${modalidad}. Cada jugador solo puede inscribirse una vez en este torneo.`
        }, { status: 409 });
      }
      // Equipo con nombre idéntico
      if (nombre_equipo) {
        const sameTeam = existingMod.find(r => normalizeName(r.nombre_equipo) === normalizeName(nombre_equipo));
        if (sameTeam) {
          return Response.json({
            error: `Ya existe un equipo con el nombre "${nombre_equipo}" en este torneo. Por favor, elige otro nombre.`
          }, { status: 409 });
        }
      }
    }

    const data = {
      modalidad,
      nombre_responsable,
      telefono_responsable,
    };
    if (email_responsable) data.email_responsable = email_responsable;
    if (jugador_nombre) data.jugador_nombre = jugador_nombre;
    if (nombre_equipo) data.nombre_equipo = nombre_equipo;
    if (jugador_1) data.jugador_1 = jugador_1;
    if (jugador_2) data.jugador_2 = jugador_2;
    if (jugador_3) data.jugador_3 = jugador_3;
    if (notas) data.notas = notas;

    // Persistir metadata anti-spam
    if (device_fingerprint) data.device_fingerprint = device_fingerprint;
    if (user_agent) data.user_agent = user_agent;

    const record = await base44.asServiceRole.entities.SanIsidroRegistration.create(data);

    return Response.json({ success: true, id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});