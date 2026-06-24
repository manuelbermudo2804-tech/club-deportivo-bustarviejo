import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Redacta un borrador narrativo de la Memoria del Club a partir de los datos agregados.
// Devuelve textos editables: introducción, textos por grupo, voluntariado, otras actividades y conclusiones.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const data = body.data || {};
    const temporada = data?.periodo?.etiqueta || body.temporada || 'la temporada';

    const grupos = (data.grupos || []).map(g =>
      `- ${g.nombre}: ${g.integrantes || 0} integrantes${g.responsables ? `, responsables: ${g.responsables}` : ''}${g.posicion ? `, posición final RFFM: ${g.posicion}` : ''}`
    ).join('\n');

    const eventos = (data.eventos?.lista || []).map(e => `- ${e.fecha} · ${e.titulo} (${e.tipo || ''})`).join('\n');

    const prompt = `Eres el secretario de la Junta Directiva del Club Deportivo Bustarviejo (club de fútbol y baloncesto de Bustarviejo, Madrid). Redacta el borrador de la MEMORIA institucional anual para "${temporada}". Tono: institucional, cercano y agradecido, en primera persona del plural ("nuestro club"), como una memoria oficial para el Ayuntamiento y la asamblea de socios. Español de España.

DATOS REALES DE ${temporada}:
- Jugadores totales: ${data.jugadores?.total || 0}
- Equipos/categorías: ${data.jugadores?.equipos || 0}
- Jugadoras de fútbol femenino: ${data.jugadores?.femenino || 0}
- Socios: ${data.socios?.total || 0}
${data.voluntariado ? `- Voluntariado: ${data.voluntariado.personas} personas` : ''}
${data.sanIsidro ? `- Torneo San Isidro: ${data.sanIsidro.inscritos} inscritos` : ''}

GRUPOS/EQUIPOS:
${grupos || '(sin datos)'}

EVENTOS DEL PERIODO:
${eventos || '(sin eventos registrados)'}

Devuelve un borrador. Para cada grupo, redacta un párrafo breve (2-3 frases) describiendo su temporada, mencionando responsables y posición si se conocen. Para "otras actividades", crea una entrada por cada evento relevante. Sé realista: no inventes datos que no aparezcan; si falta información, redacta de forma genérica pero plausible para un club de pueblo.`;

    const schema = {
      type: 'object',
      properties: {
        introduccion: { type: 'string' },
        disciplinas_intro: { type: 'string' },
        grupos_textos: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              nombre: { type: 'string' },
              texto: { type: 'string' },
            },
          },
        },
        voluntariado: { type: 'string' },
        voluntariado_objetivos: { type: 'array', items: { type: 'string' } },
        otras_actividades: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              titulo: { type: 'string' },
              texto: { type: 'string' },
            },
          },
        },
        conclusiones: { type: 'string' },
        aspectos_mejorar: { type: 'array', items: { type: 'string' } },
      },
      required: ['introduccion', 'voluntariado', 'conclusiones'],
    };

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: schema,
      model: 'claude_sonnet_4_6',
    });

    return Response.json({ draft: result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});