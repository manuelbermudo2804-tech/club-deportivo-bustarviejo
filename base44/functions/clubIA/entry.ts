import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Club IA — observa los datos históricos del club y devuelve observaciones accionables.
// Agrega altas/bajas por mes, renovaciones por temporada, morosidad, referidos y actividad,
// y pide a la IA que actúe como un analista veterano del club.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    const svc = base44.asServiceRole;

    // ---- Cargar datos en paralelo (con límites razonables) ----
    const [players, payments, referrals] = await Promise.all([
      svc.entities.Player.list('-created_date', 2000),
      svc.entities.Payment.list('-created_date', 5000),
      svc.entities.ReferralHistory.list('-created_date', 1000),
    ]);

    const monthKey = (d) => {
      if (!d) return null;
      const dt = new Date(d);
      if (isNaN(dt)) return null;
      return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}`;
    };
    const monthName = (k) => {
      const [, m] = k.split('-');
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return meses[parseInt(m, 10) - 1] || m;
    };

    // ===== RETENCIÓN Y BAJAS =====
    // Altas por mes (created_date) y bajas por mes (activo=false con updated_date como proxy)
    const altasPorMes = {};
    const bajasPorMesNombre = {};
    let totalActivos = 0;
    let totalInactivos = 0;
    let noRenuevan = 0;
    const renovacionPorTemporada = {}; // temporada -> {renovado, no_renueva, pendiente}

    for (const p of players) {
      const altaK = monthKey(p.created_date);
      if (altaK) altasPorMes[altaK] = (altasPorMes[altaK] || 0) + 1;

      if (p.activo === false) {
        totalInactivos++;
        const bajaK = monthKey(p.updated_date);
        if (bajaK) {
          const nombreMes = monthName(bajaK);
          bajasPorMesNombre[nombreMes] = (bajasPorMesNombre[nombreMes] || 0) + 1;
        }
      } else {
        totalActivos++;
      }

      if (p.estado_renovacion === 'no_renueva') noRenuevan++;
      const temp = p.temporada_renovacion || 'sin_temporada';
      if (!renovacionPorTemporada[temp]) renovacionPorTemporada[temp] = { renovado: 0, no_renueva: 0, pendiente: 0 };
      if (p.estado_renovacion === 'renovado') renovacionPorTemporada[temp].renovado++;
      else if (p.estado_renovacion === 'no_renueva') renovacionPorTemporada[temp].no_renueva++;
      else renovacionPorTemporada[temp].pendiente++;
    }

    // Bajas agregadas por nombre de mes (qué meses concentran más bajas históricamente)
    const bajasPorMesOrdenadas = Object.entries(bajasPorMesNombre)
      .sort((a, b) => b[1] - a[1]);

    // ===== FINANZAS Y MOROSIDAD =====
    let pagados = 0;
    let pendientes = 0;
    let enRevision = 0;
    let importePendiente = 0;
    let pendientesAntiguos = 0; // pendientes con +30 días
    const ahora = Date.now();
    const treintaDias = 30 * 24 * 60 * 60 * 1000;

    for (const pay of payments) {
      if (pay.is_deleted) continue;
      if (pay.estado === 'Pagado') pagados++;
      else if (pay.estado === 'En revisión') enRevision++;
      else if (pay.estado === 'Pendiente') {
        pendientes++;
        importePendiente += (pay.cantidad || 0);
        const creado = new Date(pay.created_date).getTime();
        if (!isNaN(creado) && ahora - creado > treintaDias) pendientesAntiguos++;
      }
    }

    // ===== CAPTACIÓN Y CRECIMIENTO =====
    const totalReferidos = referrals.length;
    const referidosPorTemporada = {};
    for (const r of referrals) {
      const t = r.temporada || 'sin_temporada';
      referidosPorTemporada[t] = (referidosPorTemporada[t] || 0) + 1;
    }
    // Municipios de origen (captación geográfica)
    const municipios = {};
    for (const p of players) {
      const m = (p.municipio || '').trim().toLowerCase();
      if (m) municipios[m] = (municipios[m] || 0) + 1;
    }
    const topMunicipios = Object.entries(municipios).sort((a, b) => b[1] - a[1]).slice(0, 8);

    // Altas por nombre de mes agregadas (estacionalidad de captación)
    const altasPorMesNombre = {};
    for (const [k, v] of Object.entries(altasPorMes)) {
      const nombreMes = monthName(k);
      altasPorMesNombre[nombreMes] = (altasPorMesNombre[nombreMes] || 0) + v;
    }
    const altasPorMesOrdenadas = Object.entries(altasPorMesNombre).sort((a, b) => b[1] - a[1]);

    const datosResumen = {
      retencion: {
        jugadores_activos: totalActivos,
        jugadores_de_baja: totalInactivos,
        marcados_no_renueva: noRenuevan,
        bajas_por_mes_del_anyo: bajasPorMesOrdenadas,
        renovacion_por_temporada: renovacionPorTemporada,
      },
      captacion: {
        total_referidos_historicos: totalReferidos,
        referidos_por_temporada: referidosPorTemporada,
        altas_por_mes_del_anyo: altasPorMesOrdenadas,
        top_municipios_origen: topMunicipios,
      },
      finanzas: {
        pagos_pagados: pagados,
        pagos_pendientes: pendientes,
        pagos_en_revision: enRevision,
        importe_pendiente_total_euros: Math.round(importePendiente),
        pagos_pendientes_mas_30_dias: pendientesAntiguos,
      },
    };

    const prompt = `Eres "Club IA", un analista veterano que lleva años observando en silencio los datos de un club deportivo de fútbol base (CD Bustarviejo, Sierra Norte de Madrid). No muestras datos ni gráficas: dices conclusiones y recomendaciones concretas, como un asesor sabio que ha visto patrones repetirse temporada tras temporada.

Estos son los datos históricos agregados del club:
${JSON.stringify(datosResumen, null, 2)}

Analiza estos datos y genera observaciones ACCIONABLES, agrupadas en estos 3 temas: "retencion", "captacion", "finanzas".

Para cada observación:
- "texto": la observación en una o dos frases, en tono de asesor que ha observado el patrón (ej: "Cada junio se concentran las bajas. Lanza la campaña de renovación en mayo, no en julio.").
- "accion": una recomendación concreta y breve de qué hacer.
- "urgencia": "alta", "media" o "baja".

Reglas:
- Solo afirma cosas que se deduzcan de los datos. NO inventes cifras que no estén.
- Si en un tema no hay datos suficientes para una conclusión sólida, devuelve una observación honesta diciendo que aún se están acumulando datos.
- Máximo 3 observaciones por tema. Prioriza las más útiles y sorprendentes.
- Sé directo, humano y memorable. Frases cortas.`;

    const respuesta = await svc.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          retencion: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                texto: { type: 'string' },
                accion: { type: 'string' },
                urgencia: { type: 'string', enum: ['alta', 'media', 'baja'] },
              },
            },
          },
          captacion: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                texto: { type: 'string' },
                accion: { type: 'string' },
                urgencia: { type: 'string', enum: ['alta', 'media', 'baja'] },
              },
            },
          },
          finanzas: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                texto: { type: 'string' },
                accion: { type: 'string' },
                urgencia: { type: 'string', enum: ['alta', 'media', 'baja'] },
              },
            },
          },
        },
      },
    });

    return Response.json({
      insights: respuesta,
      meta: {
        jugadores_analizados: players.length,
        pagos_analizados: payments.length,
        referidos_analizados: referrals.length,
        generado: new Date().toISOString(),
      },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});