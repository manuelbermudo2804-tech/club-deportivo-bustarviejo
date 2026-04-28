import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * RFFM Sync Dispatcher
 *
 * Lanza una invocación independiente de `rffmWeeklySync` por cada categoría
 * con `rfef_url` configurada. Cada invocación corre en su propio isolate,
 * evitando el timeout de 60-90s que sufría la versión "todo en uno".
 *
 * Fire-and-forget: NO esperamos las respuestas (sino se acumularían en este
 * isolate y volveríamos al mismo problema). Cada invocación reporta su propio
 * resumen por email cuando termina.
 *
 * Espacia los disparos 1.5s entre sí para no saturar la web RFFM.
 */

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Cargar todas las categorías que tengan al menos una URL RFFM configurada
    const allConfigs = await base44.asServiceRole.entities.StandingsConfig.list();
    const configs = allConfigs.filter(c => c.rfef_url || c.rfef_results_url || c.rfef_scorers_url);

    console.log(`[DISPATCHER] Disparando sync para ${configs.length} categorías`);

    const dispatched = [];
    for (let i = 0; i < configs.length; i++) {
      const cat = configs[i].categoria;
      try {
        // Fire-and-forget: NO esperamos la promesa
        // Cada invocación corre en su propio isolate de Deno (timeout independiente)
        base44.asServiceRole.functions.invoke('rffmWeeklySync', { categoria: cat })
          .catch(e => console.error(`[DISPATCHER] ${cat} fallo:`, e?.message || e));
        dispatched.push(cat);
        console.log(`[DISPATCHER] → ${cat} disparada (${i + 1}/${configs.length})`);
      } catch (e) {
        console.error(`[DISPATCHER] Error disparando ${cat}:`, e?.message || e);
      }
      // Espaciar 1.5s entre disparos para no saturar RFFM con 9 logins simultáneos
      if (i < configs.length - 1) await sleep(1500);
    }

    return Response.json({
      success: true,
      dispatched: dispatched.length,
      categorias: dispatched,
      message: `Sync disparada en paralelo para ${dispatched.length} categorías. Cada una enviará su propio resumen.`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[DISPATCHER] Fatal:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});