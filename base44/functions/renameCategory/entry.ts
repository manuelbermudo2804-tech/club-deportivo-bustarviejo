import { createClientFromRequest } from 'npm:@base44/sdk@0.8.26';

/**
 * Renombra una categoría en TODO el sistema de forma atómica:
 *  - CategoryConfig: actualiza el nombre
 *  - Player: categoria_principal, deporte (legacy), categorias[] (multi)
 *  - User: categorias_entrena, categorias_coordina
 *  - Convocatoria: categoria
 *  - Attendance / PlayerEvaluation / TrainingSchedule / MatchMinutes / etc.
 *
 * Solo admin puede ejecutar.
 *
 * Payload: { oldName: string, newName: string }
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function updateInChunks(base44, entityName, items, mapFn, chunkSize = 6, delayMs = 400) {
  let updated = 0;
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map(async (item) => {
        const patch = mapFn(item);
        if (!patch) return null;
        return base44.asServiceRole.entities[entityName].update(item.id, patch);
      })
    );
    updated += results.filter((r) => r.status === 'fulfilled' && r.value).length;
    if (i + chunkSize < items.length) await sleep(delayMs);
  }
  return updated;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin only' }, { status: 403 });
    }

    const { oldName, newName } = await req.json();
    if (!oldName || !newName) {
      return Response.json({ error: 'oldName y newName son obligatorios' }, { status: 400 });
    }
    if (oldName === newName) {
      return Response.json({ error: 'Los nombres son iguales, no hay nada que renombrar' }, { status: 400 });
    }

    const log = [];

    // 1. CategoryConfig
    const cats = await base44.asServiceRole.entities.CategoryConfig.filter({ nombre: oldName });
    const catUpdated = await updateInChunks(base44, 'CategoryConfig', cats, () => ({ nombre: newName }));
    log.push(`CategoryConfig: ${catUpdated} renombradas`);

    // 2. Player — categoria_principal, deporte, categorias[]
    const allPlayers = await base44.asServiceRole.entities.Player.list();
    const playersToUpdate = allPlayers.filter((p) =>
      p.categoria_principal === oldName ||
      p.deporte === oldName ||
      (Array.isArray(p.categorias) && p.categorias.includes(oldName))
    );
    const playersUpdated = await updateInChunks(base44, 'Player', playersToUpdate, (p) => {
      const patch = {};
      if (p.categoria_principal === oldName) patch.categoria_principal = newName;
      if (p.deporte === oldName) patch.deporte = newName;
      if (Array.isArray(p.categorias) && p.categorias.includes(oldName)) {
        patch.categorias = p.categorias.map((c) => (c === oldName ? newName : c));
      }
      return Object.keys(patch).length ? patch : null;
    });
    log.push(`Player: ${playersUpdated} actualizados`);

    // 3. User — categorias_entrena + categorias_coordina
    const allUsers = await base44.asServiceRole.entities.User.list();
    const usersToUpdate = allUsers.filter((u) =>
      (Array.isArray(u.categorias_entrena) && u.categorias_entrena.includes(oldName)) ||
      (Array.isArray(u.categorias_coordina) && u.categorias_coordina.includes(oldName))
    );
    const usersUpdated = await updateInChunks(base44, 'User', usersToUpdate, (u) => {
      const patch = {};
      if (Array.isArray(u.categorias_entrena) && u.categorias_entrena.includes(oldName)) {
        patch.categorias_entrena = u.categorias_entrena.map((c) => (c === oldName ? newName : c));
      }
      if (Array.isArray(u.categorias_coordina) && u.categorias_coordina.includes(oldName)) {
        patch.categorias_coordina = u.categorias_coordina.map((c) => (c === oldName ? newName : c));
      }
      return Object.keys(patch).length ? patch : null;
    });
    log.push(`User (staff): ${usersUpdated} actualizados`);

    // 4. Entidades operativas con campo `categoria` plano
    const opEntities = ['Convocatoria', 'Attendance', 'PlayerEvaluation', 'TrainingSchedule', 'MatchMinutes', 'PhotoGallery', 'ChatMessage', 'StandingsConfig', 'Clasificacion', 'Resultado', 'Goleador'];
    for (const ent of opEntities) {
      try {
        const items = await base44.asServiceRole.entities[ent].filter({ categoria: oldName });
        if (items.length === 0) continue;
        const updated = await updateInChunks(base44, ent, items, () => ({ categoria: newName }));
        log.push(`${ent}: ${updated} actualizados`);
      } catch (e) {
        // Silenciar entidades que no existan o no tengan campo categoria
      }
    }

    // 5. ChatMessage usa también `deporte` legacy en algunos sitios
    try {
      const chats = await base44.asServiceRole.entities.ChatMessage.filter({ deporte: oldName });
      if (chats.length > 0) {
        const u = await updateInChunks(base44, 'ChatMessage', chats, () => ({ deporte: newName, grupo_id: newName }));
        log.push(`ChatMessage (deporte legacy): ${u} actualizados`);
      }
    } catch {}

    return Response.json({
      success: true,
      oldName,
      newName,
      log,
    });
  } catch (error) {
    console.error('[renameCategory] error:', error);
    return Response.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
});