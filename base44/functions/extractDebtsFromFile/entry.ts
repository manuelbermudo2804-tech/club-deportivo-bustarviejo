import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Extrae deudas (nombre, DNI, importe, concepto, temporada) de un archivo (imagen/PDF/Excel/CSV)
 * y las empareja con los jugadores existentes en el club.
 *
 * Payload: { file_url: string }
 * Solo admin.
 */

// Normaliza string: minúsculas, sin tildes, sin espacios extra
function normalize(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

// Match jugador: 1) DNI exacto, 2) email, 3) nombre exacto, 4) nombre similar (primer nombre+1er apellido)
function findPlayerMatch(extracted, players) {
  if (!extracted) return null;

  const targetDni = normalize(extracted.dni || extracted.dni_jugador || '').toUpperCase();
  const targetDniTutor = normalize(extracted.dni_tutor || '').toUpperCase();
  const targetEmail = normalize(extracted.email || extracted.email_familia || '');
  const targetName = normalize(extracted.nombre || extracted.jugador_nombre || '');
  const targetTutor = normalize(extracted.tutor_nombre || '');

  // 1) Match por DNI del jugador
  if (targetDni) {
    const byDni = players.find(p => p.dni_jugador && normalize(p.dni_jugador).toUpperCase() === targetDni);
    if (byDni) return { player: byDni, confidence: 'alta', reason: 'DNI jugador' };
  }

  // 2) Match por DNI del tutor
  if (targetDniTutor) {
    const byDniTutor = players.find(p => p.dni_tutor_legal && normalize(p.dni_tutor_legal).toUpperCase() === targetDniTutor);
    if (byDniTutor) return { player: byDniTutor, confidence: 'alta', reason: 'DNI tutor' };
  }

  // 3) Match por email
  if (targetEmail) {
    const byEmail = players.find(p =>
      (p.email_padre && normalize(p.email_padre) === targetEmail) ||
      (p.email_tutor_2 && normalize(p.email_tutor_2) === targetEmail) ||
      (p.email_jugador && normalize(p.email_jugador) === targetEmail)
    );
    if (byEmail) return { player: byEmail, confidence: 'alta', reason: 'Email' };
  }

  // 4) Match por nombre exacto del jugador
  if (targetName) {
    const byName = players.find(p => p.nombre && normalize(p.nombre) === targetName);
    if (byName) return { player: byName, confidence: 'media', reason: 'Nombre exacto' };

    // 5) Match por nombre+apellido (primeras 2 palabras)
    const targetParts = targetName.split(' ').filter(Boolean);
    if (targetParts.length >= 2) {
      const targetKey = targetParts.slice(0, 2).join(' ');
      const byPartial = players.find(p => {
        if (!p.nombre) return false;
        const pParts = normalize(p.nombre).split(' ').filter(Boolean);
        if (pParts.length < 2) return false;
        return pParts.slice(0, 2).join(' ') === targetKey;
      });
      if (byPartial) return { player: byPartial, confidence: 'media', reason: 'Nombre y apellido' };
    }
  }

  // 6) Match por nombre del tutor
  if (targetTutor) {
    const byTutor = players.find(p => p.nombre_tutor_legal && normalize(p.nombre_tutor_legal) === targetTutor);
    if (byTutor) return { player: byTutor, confidence: 'media', reason: 'Nombre tutor' };
  }

  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: solo admin' }, { status: 403 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url requerido' }, { status: 400 });
    }

    // 1) Extraer datos con IA (visión + razonamiento)
    const extractionSchema = {
      type: 'object',
      properties: {
        deudas: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nombre: { type: 'string', description: 'Nombre completo del jugador o de la persona deudora tal como aparece en el archivo' },
              dni: { type: 'string', description: 'DNI/NIE del jugador si aparece' },
              dni_tutor: { type: 'string', description: 'DNI/NIE del tutor si aparece' },
              email: { type: 'string', description: 'Email si aparece' },
              tutor_nombre: { type: 'string', description: 'Nombre del padre/madre/tutor si aparece' },
              importe: { type: 'number', description: 'Importe de la deuda en euros (solo el número)' },
              concepto: { type: 'string', description: 'Concepto o descripción del impago (ej: cuota septiembre, inscripción, etc.)' },
              temporada: { type: 'string', description: 'Temporada a la que pertenece la deuda (ej: 2024-2025) si aparece' }
            }
          }
        }
      }
    };

    const prompt = `Analiza este archivo (puede ser una imagen, PDF, captura de pantalla, extracto bancario, hoja de cálculo, listado de WhatsApp, etc.) y extrae TODAS las deudas/impagos de personas que encuentres.

Para cada deuda, extrae:
- nombre: nombre completo de la persona (jugador o tutor)
- dni: DNI del jugador si aparece
- dni_tutor: DNI del tutor si aparece
- email: email si aparece
- tutor_nombre: nombre del tutor/padre/madre si es distinto al jugador
- importe: cantidad adeudada (solo número, ej: 75.50)
- concepto: motivo del impago (ej: "Cuota septiembre 2024", "Inscripción", "Pago fraccionado")
- temporada: temporada deportiva (ej: "2024-2025") si la puedes inferir

Si un dato no aparece, déjalo en blanco. Devuelve TODAS las deudas que encuentres, no resumas ni agrupes.`;

    const extractionResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      file_urls: [file_url],
      response_json_schema: extractionSchema,
      model: 'claude_sonnet_4_6'
    });

    const deudasExtraidas = Array.isArray(extractionResult?.deudas) ? extractionResult.deudas : [];
    console.log(`[extractDebtsFromFile] IA extrajo ${deudasExtraidas.length} deudas`);

    if (deudasExtraidas.length === 0) {
      return Response.json({
        success: true,
        deudas: [],
        message: 'No se detectaron deudas en el archivo'
      });
    }

    // 2) Cargar jugadores activos para emparejamiento
    const players = await base44.asServiceRole.entities.Player.list('-created_date', 2000);

    // 3) Emparejar cada deuda con un jugador
    const resultado = deudasExtraidas.map(d => {
      const match = findPlayerMatch(d, players);
      return {
        nombre_extraido: d.nombre || '',
        dni_extraido: d.dni || '',
        dni_tutor_extraido: d.dni_tutor || '',
        email_extraido: d.email || '',
        tutor_nombre_extraido: d.tutor_nombre || '',
        importe: Number(d.importe) || 0,
        concepto: d.concepto || '',
        temporada: d.temporada || '',
        jugador_match: match ? {
          id: match.player.id,
          nombre: match.player.nombre,
          email_padre: match.player.email_padre,
          dni_jugador: match.player.dni_jugador,
          dni_tutor_legal: match.player.dni_tutor_legal,
          confidence: match.confidence,
          reason: match.reason
        } : null
      };
    });

    return Response.json({
      success: true,
      deudas: resultado,
      total_extraidas: resultado.length,
      total_emparejadas: resultado.filter(r => r.jugador_match).length
    });

  } catch (error) {
    console.error('[extractDebtsFromFile] Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});