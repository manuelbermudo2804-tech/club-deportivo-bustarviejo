import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Cache en memoria (60s) — la landing recibe muchas visitas anónimas y solo
// necesita un count agregado, no datos en tiempo real.
const LANDING_CACHE = { data: null, expiresAt: 0 };
const LANDING_CACHE_TTL_MS = 60_000;

// Endpoint PÚBLICO (sin auth) para la landing web.
// Devuelve: config, equipos y stats agregadas (participantes pagados + bote).
// Diseñado para que los visitantes anónimos NO necesiten saltarse RLS.
//
// MODO PREVIEW: si la query incluye ?preview=CODIGO y la config tiene
// modo_preview=true + codigo_preview=CODIGO, se devuelve la porra aunque
// 'activa' sea false. Sirve para que admins compartan la URL con beta-testers.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // El código de preview puede venir por query string O por body
    const url = new URL(req.url);
    let previewCodigo = url.searchParams.get('preview') || '';
    if (!previewCodigo && req.method === 'POST') {
      try {
        const body = await req.json();
        previewCodigo = body?.preview_codigo || body?.preview || '';
      } catch {
        // body vacío, ignorar
      }
    }

    // Si hay cache fresca Y no es modo preview, devolver directamente
    const now = Date.now();
    if (!previewCodigo && LANDING_CACHE.data && LANDING_CACHE.expiresAt > now) {
      return Response.json({ ...LANDING_CACHE.data, cached: true });
    }

    const [configs, equipos, participantesPagados] = await Promise.all([
      base44.asServiceRole.entities.PorraConfig.list(),
      base44.asServiceRole.entities.PorraEquipo.list('grupo', 100),
      base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' }),
    ]);

    const config = configs[0] || null;
    const precio = Number(config?.precio_entrada || 15);
    const aporteClub = Number(config?.aporte_inicial_club) || 0;
    const totalParticipantes = participantesPagados.length;

    // ¿El visitante tiene acceso de preview válido?
    const previewValido = !!(
      config?.modo_preview &&
      config?.codigo_preview &&
      previewCodigo &&
      previewCodigo === config.codigo_preview
    );

    // Si la porra NO está activa y NO hay preview válido → devolver activa:false como hasta ahora.
    // Si hay preview válido → forzar activa:true para que la landing se renderice.
    const activaParaCliente = !!config?.activa || previewValido;

    const respuesta = {
      preview_mode: previewValido,
      config: config ? {
        activa: activaParaCliente,
        estado: config.estado,
        nombre_torneo: config.nombre_torneo,
        precio_entrada: precio,
        comision_club_porcentaje: config.comision_club_porcentaje,
        destino_comision_club: config.destino_comision_club,
        permitir_mini_ligas: !!config.permitir_mini_ligas,
        permitir_multiples_porras: !!config.permitir_multiples_porras,
        mostrar_ranking_publico: config.mostrar_ranking_publico !== false,
        fecha_limite_predicciones: config.fecha_limite_predicciones,
        fecha_inicio_mundial: config.fecha_inicio_mundial,
        aporte_inicial_club: aporteClub,
      } : null,
      equipos: equipos.map(e => ({
        codigo: e.codigo,
        nombre: e.nombre,
        bandera_emoji: e.bandera_emoji,
        grupo: e.grupo,
        confederacion: e.confederacion,
        es_anfitrion: e.es_anfitrion,
        orden_grupo: e.orden_grupo,
      })),
      stats: {
        total_participantes: totalParticipantes,
        bote: totalParticipantes * precio + aporteClub,
      },
    };

    // Cachear solo respuestas no-preview (el preview puede cambiar por código)
    if (!previewCodigo) {
      LANDING_CACHE.data = respuesta;
      LANDING_CACHE.expiresAt = now + LANDING_CACHE_TTL_MS;
    }

    return Response.json(respuesta);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});