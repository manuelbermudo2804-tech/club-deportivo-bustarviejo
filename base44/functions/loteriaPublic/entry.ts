import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Datos públicos de la campaña de lotería: configuración + comercios activos.
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const campanas = await base44.asServiceRole.entities.LoteriaCampana.list();
    const campana = campanas && campanas.length > 0 ? campanas[0] : null;

    if (!campana || campana.activa === false) {
      return Response.json({ campana: null, comercios: [] }, { status: 200 });
    }

    const comercios = await base44.asServiceRole.entities.LoteriaComercio.filter({ activo: true });
    comercios.sort((a, b) => (a.orden || 0) - (b.orden || 0));

    // Décimos que quedan en TuLotero (dato público de la peña de empresa)
    let tulotero = null;
    const cerrada = !!campana.fecha_cierre && new Date(campana.fecha_cierre).getTime() <= Date.now();
    if (!cerrada) try {
      const codigo = (campana.tulotero_url || 'cdb26').split('/').filter(Boolean).pop();
      const r = await fetch(`https://web-backend.es.tulotero.net/tuloteroweb/rest/loteriaEmpresas/${codigo}`, { headers: { Accept: 'application/json' } });
      if (r.ok) {
        const penya = (await r.json())?.penyas?.[0];
        if (penya) tulotero = { restantes: penya.participacionesRestantes, total: penya.numeroParticipaciones };
      }
    } catch (_) { /* si TuLotero no responde, la página se muestra igual */ }

    return Response.json({ campana, comercios, tulotero }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});