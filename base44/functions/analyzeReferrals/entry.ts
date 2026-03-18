import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        
        // 1. Recopilar datos
        const history = await base44.asServiceRole.entities.ReferralHistory.list();
        const rewards = await base44.asServiceRole.entities.ReferralReward.list();
        const users = await base44.asServiceRole.entities.User.list();
        const configs = await base44.asServiceRole.entities.SeasonConfig.filter({ activa: true });
        const currentConfig = configs[0];

        // 2. Procesar estadísticas básicas
        const totalReferrals = history.length;
        const active referrersCount = new Set(history.map(h => h.referidor_email)).size;
        const totalUsers = users.length;
        const participationRate = totalUsers > 0 ? (active / totalUsers * 100).toFixed(1) : 0;
        
        // Agrupar por mes (últimos 6 meses)
        const now = new Date();
        const monthlyStats = {};
        for (let i = 0; i < 6; i++) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            monthlyStats[key] = 0;
        }
        
        history.forEach(h => {
            if (h.fecha_referido) {
                const date = new Date(h.fecha_referido);
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
                if (monthlyStats[key] !== undefined) monthlyStats[key]++;
            }
        });

        const statsSummary = {
            total_referidos: totalReferrals,
            usuarios_participantes: active,
            tasa_participacion: `${participationRate}%`,
            referidos_por_mes: monthlyStats,
            configuracion_actual: {
                premio_base: currentConfig?.referidos_premio_1,
                hotel_activo: currentConfig?.referidos_premio_hotel
            }
        };

        const prompt = `
        Actúa como un consultor experto en fidelización y crecimiento de comunidades deportivas.
        Analiza los siguientes datos del programa "Trae un Socio Amigo" del CD Bustarviejo y genera un informe estratégico.

        Datos del programa:
        ${JSON.stringify(statsSummary, null, 2)}

        Genera un informe en formato Markdown con las siguientes secciones:
        1. 📊 **Diagnóstico de Salud**: Breve valoración del estado actual del programa (¿Está estancado? ¿Crece? ¿Participación baja/alta?).
        2. 🚀 **3 Oportunidades de Mejora**: Sugerencias concretas y accionables para aumentar la participación o efectividad (ej: campañas específicas, cambios en premios, gamificación).
        3. 🔮 **Predicción**: Qué podría pasar si no se hacen cambios vs si se aplican mejoras.
        
        Sé directo, profesional pero motivador. Usa emojis para estructurar.
        `;

        const response = await base44.integrations.Core.InvokeLLM({
            prompt: prompt
        });

        // InvokeLLM returns a string if no schema is provided, or a dict if schema is provided.
        // Documentation says: "If response_json_schema is specified, returns a dict... otherwise returns a string."
        // Wait, the SDK wrapper usually returns the object directly.
        // Let's assume response is the string content since I didn't pass schema.
        
        // Wait, looking at documentation: "The integration returns a dict containing {output: ...}" usually?
        // No, standard InvokeLLM returns the response directly.
        // Let's wrap it in JSON.

        return Response.json({ report: response });
    } catch (error) {
        console.error("Error analyzing referrals:", error);
        return Response.json({ error: error.message }, { status: 500 });
    }
});