import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function withRetry(fn, maxRetries = 3, baseDelayMs = 1500) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const is429 = e.message?.includes('429') || e.message?.includes('Rate limit') || e.response?.status === 429;
      if (!is429 || attempt === maxRetries) throw e;
      await sleep(baseDelayMs * Math.pow(2, attempt));
    }
  }
}

/**
 * Archiva el dorsal actual de cada jugador como una fila DorsalAssignment de la
 * temporada que termina (para conservar el histórico) y, opcionalmente, reasigna
 * el dorsal preferente a los jugadores que renuevan en la nueva temporada.
 *
 * Payload:
 * {
 *   "previousSeason": "2025-2026",   // temporada que termina (de donde se archiva el dorsal actual)
 *   "newSeason": "2026-2027",        // temporada nueva (opcional, para reasignar preferentes)
 *   "reassignPreferred": true        // si true, copia el dorsal preferente a la nueva temporada cuando esté libre
 * }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { previousSeason, newSeason, reassignPreferred = true } = body;
    if (!previousSeason) {
      return Response.json({ error: 'Falta previousSeason' }, { status: 400 });
    }

    const log = [];

    // 1. Cargar jugadores y asignaciones existentes
    const players = await withRetry(() => base44.asServiceRole.entities.Player.list());
    const allAssignments = await withRetry(() => base44.asServiceRole.entities.DorsalAssignment.list());

    const prevAssignments = allAssignments.filter(a => a.temporada === previousSeason);
    const newAssignments = newSeason ? allAssignments.filter(a => a.temporada === newSeason) : [];

    // Map para no duplicar el archivo del dorsal de la temporada saliente
    const prevByPlayer = new Set(prevAssignments.map(a => a.jugador_id));
    // Dorsales ya ocupados en la nueva temporada (para no pisar al reasignar)
    const newDorsalsByCat = {};
    for (const a of newAssignments) {
      const cat = a.categoria || '';
      if (!newDorsalsByCat[cat]) newDorsalsByCat[cat] = new Set();
      newDorsalsByCat[cat].add(a.dorsal);
    }
    const newPlayerSet = new Set(newAssignments.map(a => a.jugador_id));

    // 2. Archivar el dorsal actual de cada jugador como fila de la temporada saliente
    const toArchive = players.filter(p =>
      p.numero_camiseta &&
      !isNaN(parseInt(p.numero_camiseta)) &&
      !prevByPlayer.has(p.id)
    );

    let archived = 0;
    for (let i = 0; i < toArchive.length; i += 6) {
      const chunk = toArchive.slice(i, i + 6);
      const results = await Promise.allSettled(chunk.map(p =>
        withRetry(() => base44.asServiceRole.entities.DorsalAssignment.create({
          jugador_id: p.id,
          jugador_nombre: p.nombre,
          temporada: previousSeason,
          categoria: p.categoria_principal || p.deporte || 'Sin categoría',
          dorsal: parseInt(p.numero_camiseta),
          estado: 'asignado',
          origen: 'manual',
          notas: `Archivado automáticamente al cerrar la temporada ${previousSeason}`,
          asignado_por: user.email
        }))
      ));
      archived += results.filter(r => r.status === 'fulfilled').length;
      if (i + 6 < toArchive.length) await sleep(700);
    }
    log.push(`✅ Dorsales archivados en histórico (${previousSeason}): ${archived}`);

    // 3. Reasignar dorsal preferente en la nueva temporada (solo si está libre)
    let reassigned = 0;
    if (newSeason && reassignPreferred) {
      // Solo jugadores que renuevan y aún no tienen dorsal en la nueva temporada
      const renewing = players.filter(p =>
        p.dorsal_preferente &&
        !isNaN(parseInt(p.dorsal_preferente)) &&
        !newPlayerSet.has(p.id) &&
        (p.estado_renovacion === 'renovado' || p.activo)
      );

      for (const p of renewing) {
        const cat = p.categoria_principal || p.deporte || 'Sin categoría';
        const pref = parseInt(p.dorsal_preferente);
        if (!newDorsalsByCat[cat]) newDorsalsByCat[cat] = new Set();
        if (newDorsalsByCat[cat].has(pref)) continue; // ya ocupado, no pisar

        try {
          await withRetry(() => base44.asServiceRole.entities.DorsalAssignment.create({
            jugador_id: p.id,
            jugador_nombre: p.nombre,
            temporada: newSeason,
            categoria: cat,
            dorsal: pref,
            estado: 'asignado',
            origen: 'preferente_auto',
            notas: `Dorsal preferente reasignado automáticamente para la temporada ${newSeason}`,
            asignado_por: user.email
          }));
          newDorsalsByCat[cat].add(pref);
          // Reflejar también en la ficha del jugador
          await withRetry(() => base44.asServiceRole.entities.Player.update(p.id, {
            numero_camiseta: String(pref)
          }));
          reassigned++;
          await sleep(300);
        } catch (e) {
          console.error(`Error reasignando dorsal a ${p.nombre}:`, e.message);
        }
      }
      log.push(`✅ Dorsales preferentes reasignados en ${newSeason}: ${reassigned}`);
    }

    return Response.json({
      success: true,
      previousSeason,
      newSeason: newSeason || null,
      archived,
      reassigned,
      log
    });

  } catch (error) {
    console.error('Error in archiveDorsalsForNewSeason:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});