import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const history = await base44.asServiceRole.entities.ReferralHistory.list();
    const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
    const currentConfig = configs[0] || null;
    const season = currentConfig?.temporada || null;
    const seasonHistory = season
      ? history.filter(item => item.temporada === season)
      : history;

    const totalReferrals = seasonHistory.filter(item => item.referidor_email).length;
    const activeReferrersCount = new Set(
      seasonHistory.map(item => item.referidor_email).filter(Boolean)
    ).size;
    const totalTickets = seasonHistory.reduce(
      (sum, item) => sum + (Number(item.sorteos_otorgados) || 0),
      0
    );

    const now = new Date();
    const monthlyStats = {};
    for (let i = 0; i < 6; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      monthlyStats[key] = 0;
    }

    seasonHistory.forEach(item => {
      if (!item.fecha_referido) return;
      const date = new Date(item.fecha_referido);
      if (Number.isNaN(date.getTime())) return;
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      if (monthlyStats[key] !== undefined) monthlyStats[key]++;
    });

    const stats = {
      temporada: season,
      total_referidos: totalReferrals,
      usuarios_participantes: activeReferrersCount,
      total_papeletas: totalTickets,
      referidos_por_mes: monthlyStats,
      premio_principal: currentConfig?.sorteo_premio_principal_nombre || 'No configurado',
      fecha_sorteo: currentConfig?.sorteo_fecha || null,
      lugar_sorteo: currentConfig?.sorteo_lugar || null
    };

    const prompt = `
Actúa como analista del programa "Trae un Socio Amigo" del CD Bustarviejo.
Analiza exclusivamente los datos facilitados y no inventes cifras ni configuraciones.

Datos actuales:
${JSON.stringify(stats, null, 2)}

Devuelve un informe Markdown breve con:
1. Diagnóstico del programa.
2. Tres observaciones u oportunidades concretas basadas en los datos.
3. Evolución mensual observada.
Si faltan datos para valorar algo, indícalo expresamente. No propongas premios por niveles ni créditos en ropa: el sistema vigente es una papeleta por socio referido validado y un sorteo final.
`;

    const report = await base44.integrations.Core.InvokeLLM({ prompt });
    return Response.json({ report, stats });
  } catch (error) {
    console.error('Error analyzing referrals:', error);
    return Response.json({ error: error.message || 'Unexpected error' }, { status: 500 });
  }
});
