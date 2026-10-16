import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const json = (body, status = 200) => Response.json(body, { status });

async function hashParticipant(surveyId, email) {
  const bytes = new TextEncoder().encode(`${String(surveyId)}|${String(email).trim().toLowerCase()}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

function madridDateKey() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}

function legacyAnonymousMarker(email) {
  try {
    return `anon_${btoa(String(email)).slice(0, 12)}`;
  } catch {
    return '';
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user?.email) return json({ error: 'Debes iniciar sesión para responder' }, 401);

    const body = await req.json();
    const action = body?.action;
    const surveyId = String(body?.survey_id || '').trim();
    if (!surveyId) return json({ error: 'Falta el identificador de la encuesta' }, 400);

    const survey = await base44.asServiceRole.entities.Survey.get(surveyId);
    if (!survey) return json({ error: 'Encuesta no encontrada' }, 404);

    if (action === 'has_responded') {
      const participantHash = await hashParticipant(surveyId, user.email);
      const participation = await base44.asServiceRole.entities.SurveyParticipation.filter({
        survey_id: surveyId,
        participant_hash: participantHash,
      });
      if (participation?.length) return json({ hasResponded: true });

      // Compatibilidad con respuestas anteriores a la protección de servidor.
      const legacyEmail = await base44.asServiceRole.entities.SurveyResponse.filter({
        survey_id: surveyId,
        respondente_email: String(user.email).trim().toLowerCase(),
      });
      const oldMarker = survey.anonima ? legacyAnonymousMarker(user.email) : '';
      const legacyAnon = oldMarker ? await base44.asServiceRole.entities.SurveyResponse.filter({
        survey_id: surveyId,
        respondente_email: oldMarker,
      }) : [];
      return json({ hasResponded: !!(legacyEmail?.length || legacyAnon?.length) });
    }

    if (action !== 'submit') return json({ error: 'Acción no válida' }, 400);
    if (user.role === 'admin') return json({ error: 'Las cuentas administradoras no pueden responder encuestas desde este formulario' }, 403);

    const today = madridDateKey();
    if (!survey.activa || !survey.fecha_inicio || !survey.fecha_fin ||
        today < survey.fecha_inicio || today > survey.fecha_fin) {
      return json({ error: 'Esta encuesta está fuera de su periodo de respuesta' }, 400);
    }

    if (!Array.isArray(survey.preguntas) || !Array.isArray(body.respuestas) ||
        body.respuestas.length !== survey.preguntas.length) {
      return json({ error: 'Las respuestas no coinciden con las preguntas de la encuesta' }, 400);
    }

    const normalizedResponses = [];
    for (let i = 0; i < survey.preguntas.length; i++) {
      const question = survey.preguntas[i];
      const submitted = body.respuestas[i] || {};
      const answer = String(submitted.respuesta ?? '').trim();

      if (question.obligatoria && !answer) {
        return json({ error: 'Contesta todas las preguntas obligatorias' }, 400);
      }
      if (question.tipo_respuesta === 'rating' && answer && !['1', '2', '3', '4', '5'].includes(answer)) {
        return json({ error: 'Una valoración no es válida' }, 400);
      }
      if (question.tipo_respuesta === 'multiple' && answer &&
          (!Array.isArray(question.opciones) || !question.opciones.includes(answer))) {
        return json({ error: 'Una de las opciones seleccionadas no es válida' }, 400);
      }
      if (question.tipo_respuesta === 'texto' && answer.length > 5000) {
        return json({ error: 'Una respuesta de texto supera el límite permitido' }, 400);
      }

      normalizedResponses.push({
        pregunta: String(question.pregunta || '').slice(0, 500),
        respuesta: answer.slice(0, 5000),
      });
    }

    const participantHash = await hashParticipant(surveyId, user.email);
    const existingParticipation = await base44.asServiceRole.entities.SurveyParticipation.filter({
      survey_id: surveyId,
      participant_hash: participantHash,
    });
    const legacyEmail = await base44.asServiceRole.entities.SurveyResponse.filter({
      survey_id: surveyId,
      respondente_email: String(user.email).trim().toLowerCase(),
    });
    const oldMarker = survey.anonima ? legacyAnonymousMarker(user.email) : '';
    const legacyAnon = oldMarker ? await base44.asServiceRole.entities.SurveyResponse.filter({
      survey_id: surveyId,
      respondente_email: oldMarker,
    }) : [];

    if (existingParticipation?.length || legacyEmail?.length || legacyAnon?.length) {
      return json({ ok: false, alreadyResponded: true, error: 'Ya has respondido a esta encuesta' }, 409);
    }

    // Registro separado de participación: en encuestas anónimas la respuesta
    // no contiene email, nombre ni hash del participante.
    let participation;
    try {
      participation = await base44.asServiceRole.entities.SurveyParticipation.create({
        survey_id: surveyId,
        participant_hash: participantHash,
      });
    } catch (error) {
      console.error('No se pudo registrar la participación:', error?.message);
      return json({ error: 'No se ha podido registrar la participación. Inténtalo de nuevo.' }, 500);
    }

    try {
      await base44.asServiceRole.entities.SurveyResponse.create({
        survey_id: surveyId,
        survey_titulo: String(survey.titulo || '').slice(0, 300),
        respondente_email: survey.anonima ? '' : String(user.email).trim().toLowerCase(),
        respondente_nombre: survey.anonima ? '' : String(user.full_name || '').slice(0, 200),
        respuestas: normalizedResponses,
        fecha_respuesta: new Date().toISOString(),
      });
    } catch (error) {
      try { await base44.asServiceRole.entities.SurveyParticipation.delete(participation.id); } catch {}
      console.error('No se pudo guardar la respuesta:', error?.message);
      return json({ error: 'No se ha podido guardar la respuesta. Puedes volver a intentarlo.' }, 500);
    }

    // Actualizar contadores desde los valores más recientes disponibles.
    // No se confía en contadores enviados por el navegador.
    const latestSurvey = await base44.asServiceRole.entities.Survey.get(surveyId);
    await base44.asServiceRole.entities.Survey.update(surveyId, {
      respuestas_count: (Number(latestSurvey?.respuestas_count) || 0) + 1,
      respuestas_nuevas: (Number(latestSurvey?.respuestas_nuevas) || 0) + 1,
      ultima_respuesta_fecha: new Date().toISOString(),
    });

    return json({ ok: true });
  } catch (error) {
    console.error('surveyResponseSecure error:', error?.message);
    return json({ error: 'Error interno al procesar la encuesta' }, 500);
  }
});
