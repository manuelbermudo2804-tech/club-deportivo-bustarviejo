import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function isValidIsoDate(value: string): boolean {
  if (!/^\\d{4}-\\d{2}-\\d{2}$/.test(value || '')) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

// Analiza con IA las bases de una convocatoria de subvención y devuelve qué
// documentos necesita el club y qué proyecto/memoria hay que preparar.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { alertId } = await req.json();
    if (!alertId) return Response.json({ error: 'Falta alertId' }, { status: 400 });

    const alert = await base44.asServiceRole.entities.GrantAlert.get(alertId);
    if (!alert) return Response.json({ error: 'Subvención no encontrada' }, { status: 404 });

    const prompt = `Eres un experto en subvenciones públicas para clubes deportivos en España.
Analiza esta convocatoria de subvención y explica de forma clara y práctica qué necesita un club deportivo de base (Club Deportivo Bustarviejo, fútbol y baloncesto, niños y jóvenes) para presentarse.

CONVOCATORIA:
- Título: ${alert.titulo}
- Organismo/ámbito: ${alert.resumen || ''}
- Categoría: ${alert.categoria || ''}
- Enlace oficial: ${alert.enlace || 'no disponible'}

Investiga primero la convocatoria oficial enlazada y sus bases, extracto, anexos y resolución si existen. La prioridad absoluta es la evidencia oficial concreta, no las prácticas habituales. NO inventes requisitos, importes ni plazos. Si no puedes verificar un requisito clave o no encuentras bases completas, la decisión debe ser REVISAR, nunca PRESENTAR por suposición. Considera el perfil del CD Bustarviejo: club deportivo sin ánimo de lucro de Bustarviejo (Madrid), fútbol base, cantera y menores, equipos federados, deporte femenino y actividades comunitarias. No des por cumplido ningún requisito del club que no esté acreditado.

Devuelve una recomendación operativa para la junta:
- PRESENTAR solo si la convocatoria oficial es identificable, el plazo está abierto o confirmado, la elegibilidad del club está razonablemente acreditada y no hay bloqueos críticos conocidos.
- REVISAR si falta evidencia, hay incertidumbre en elegibilidad, documentación o plazo, o el beneficio/obligaciones no están claros.
- NO_PRESENTAR solo si las bases oficiales muestran incompatibilidad, plazo cerrado sin posibilidad de solicitud o un requisito obligatorio incumplido.
Cita el documento oficial y apartado que sustentan cada requisito o bloqueo. Separa hechos confirmados, inferencias y dudas. Explica el siguiente paso concreto y la documentación pendiente. Responde en español claro.`;

    const analisis = await base44.integrations.Core.InvokeLLM({
      prompt,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          resumen: { type: 'string', description: 'Resumen en 2-3 frases de qué es esta subvención y para qué sirve' },
          quien_puede: { type: 'string', description: 'Quién puede solicitarla y si el club encaja' },
          que_cubre: { type: 'string', description: 'Qué gastos cubre (equipaciones, material, escuelas, eventos...)' },
          importe: { type: 'string', description: 'Importe aproximado o cómo se calcula. Si no se sabe, indicarlo.' },
          fecha_limite: { type: 'string', description: 'Plazo o fecha límite si se conoce. Si no, indicarlo.' },
          fecha_limite_iso: { type: 'string', description: 'La fecha límite de solicitud EXACTA en formato AAAA-MM-DD (ej: 2026-07-15). Déjalo VACÍO si no encuentras una fecha de cierre concreta y oficial.' },
          documentos: {
            type: 'array',
            description: 'Lista de documentos concretos que hay que presentar',
            items: { type: 'string' },
          },
          proyecto_necesario: { type: 'string', description: 'Qué proyecto o memoria hay que redactar y qué debe incluir' },
          pasos: {
            type: 'array',
            description: 'Pasos concretos a seguir para presentar la solicitud, en orden',
            items: { type: 'string' },
          },
          consejos: { type: 'string', description: 'Consejos prácticos para aumentar las opciones de que la concedan' },
          fiabilidad: { type: 'string', enum: ['alta', 'media', 'baja'], description: 'Si la info viene de la convocatoria real (alta) o es estimación general (baja)' },
          decision: { type: 'string', enum: ['PRESENTAR', 'REVISAR', 'NO_PRESENTAR'], description: 'Recomendación de actuación con las reglas de elegibilidad y evidencia indicadas' },
          prioridad: { type: 'string', enum: ['urgente', 'alta', 'media', 'baja'] },
          elegibilidad: { type: 'string', enum: ['cumple', 'probable', 'desconocida', 'no_cumple'] },
          esfuerzo: { type: 'string', enum: ['bajo', 'medio', 'alto', 'desconocido'] },
          motivos: { type: 'array', items: { type: 'string' }, description: 'Motivos breves y específicos que justifican la recomendación' },
          requisitos_confirmados: { type: 'array', items: { type: 'string' } },
          dudas_criticas: { type: 'array', items: { type: 'string' }, description: 'Bloqueos o datos que hay que verificar antes de decidir' },
          siguiente_accion: { type: 'string', description: 'Acción concreta inmediata para el club' },
          evidencias: { type: 'array', items: { type: 'object', properties: { documento: { type: 'string' }, apartado: { type: 'string' }, url: { type: 'string' }, extracto: { type: 'string' } } } },
        },
        required: ['resumen', 'documentos', 'proyecto_necesario', 'pasos', 'fiabilidad', 'decision', 'prioridad', 'elegibilidad', 'esfuerzo', 'motivos', 'requisitos_confirmados', 'dudas_criticas', 'siguiente_accion', 'evidencias', 'fecha_limite_iso'],
      },
    });

    // Guardar el análisis en la alerta para no repetir la consulta
    const updates = {
      analisis_ia: JSON.stringify(analisis),
      analisis_fecha: new Date().toISOString(),
    };
    // Si la IA detectó una fecha límite concreta y la alerta aún no la tiene, rellenarla
    // automáticamente para activar los avisos de cierre (7/3/1 días).
    const iso = (analisis.fecha_limite_iso || '').trim();
    if (!alert.fecha_limite && isValidIsoDate(iso)) {
      updates.fecha_limite = iso;
      updates.avisos_plazo_enviados = [];
    }
    await base44.asServiceRole.entities.GrantAlert.update(alertId, updates);

    // Persistir una recomendación operativa estructurada para el panel de decisión.
    // Si no hay fecha oficial o existen dudas críticas, no se fuerza PRESENTAR.
    let decision = analisis.decision || 'REVISAR';
    const dudas = Array.isArray(analisis.dudas_criticas) ? analisis.dudas_criticas : [];
    const fechaCandidata = (analisis.fecha_limite_iso || alert.fecha_limite || '').trim();
    const fecha = isValidIsoDate(fechaCandidata) ? fechaCandidata : '';
    const hoy = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Madrid', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const evidencias = Array.isArray(analisis.evidencias) ? analisis.evidencias : [];
    if (decision === 'PRESENTAR' && (!fecha || fecha < hoy || dudas.length > 0 || analisis.fiabilidad !== 'alta' || !['cumple', 'probable'].includes(analisis.elegibilidad) || evidencias.length === 0)) decision = 'REVISAR';
    if (decision === 'NO_PRESENTAR' && (analisis.fiabilidad !== 'alta' || evidencias.length === 0)) decision = 'REVISAR';
    // La decisión final protegida por las reglas del servidor es la que ve el usuario.
    analisis.decision = decision;
    await base44.asServiceRole.entities.GrantAlert.update(alertId, { analisis_ia: JSON.stringify(analisis), analisis_fecha: new Date().toISOString() });
    const assessmentData = {
      alert_id: alertId,
      titulo: alert.titulo,
      entidad: alert.categoria || '',
      url_oficial: alert.enlace || '',
      decision,
      prioridad: analisis.prioridad || (fecha && fecha >= hoy && fecha <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10) ? 'urgente' : 'media'),
      elegibilidad: analisis.elegibilidad || 'desconocida',
      plazo_estado: !fecha ? 'desconocido' : fecha < hoy ? 'cerrado' : (fecha <= new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10) ? 'proximo' : 'abierto'),
      fecha_limite: fecha || undefined,
      esfuerzo: analisis.esfuerzo || 'desconocido',
      motivos: Array.isArray(analisis.motivos) ? analisis.motivos : [],
      requisitos_confirmados: Array.isArray(analisis.requisitos_confirmados) ? analisis.requisitos_confirmados : [],
      dudas_criticas: dudas,
      documentos_pendientes: Array.isArray(analisis.documentos) ? analisis.documentos : [],
      siguiente_accion: analisis.siguiente_accion || 'Revisar las bases oficiales y confirmar los requisitos.',
      fecha_analisis: new Date().toISOString(),
      fuente_evidencias: Array.isArray(analisis.evidencias) ? analisis.evidencias : [],
      revisado_humano: false,
      notas: 'Recomendación automática. Validar los requisitos y las evidencias oficiales antes de tomar la decisión definitiva.',
    };
    const allAssessments = await base44.asServiceRole.entities.GrantAssessment.list('-created_date', 300);
    const existingAssessment = allAssessments.find((item) => item.alert_id === alertId);
    if (existingAssessment) {
      await base44.asServiceRole.entities.GrantAssessment.update(existingAssessment.id, assessmentData);
    } else {
      await base44.asServiceRole.entities.GrantAssessment.create(assessmentData);
    }

    return Response.json({ success: true, analisis, decision });
  } catch (error) {
    console.error('Error en analyzeGrantBases:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});