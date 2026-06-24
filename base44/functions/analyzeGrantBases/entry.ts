import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

Busca en internet la información oficial de esta convocatoria a partir del título y el enlace. Si no encuentras los detalles exactos, basa tu respuesta en cómo funcionan habitualmente las subvenciones deportivas de ese tipo de organismo, e indícalo claramente.

Responde en español, de forma sencilla para alguien sin experiencia en trámites administrativos.`;

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
        },
        required: ['resumen', 'documentos', 'proyecto_necesario', 'pasos'],
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
    if (!alert.fecha_limite && /^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      updates.fecha_limite = iso;
      updates.avisos_plazo_enviados = [];
    }
    await base44.asServiceRole.entities.GrantAlert.update(alertId, updates);

    return Response.json({ success: true, analisis });
  } catch (error) {
    console.error('Error en analyzeGrantBases:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});