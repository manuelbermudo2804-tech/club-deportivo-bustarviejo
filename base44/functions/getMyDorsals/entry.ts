import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const email = (user.email || '').toLowerCase();

    // Service role: buscar jugadores por cualquier email del usuario
    const sr = base44.asServiceRole;
    const [a, b, c, d] = await Promise.all([
      sr.entities.Player.filter({ email_padre: email }),
      sr.entities.Player.filter({ email_tutor_2: email }),
      sr.entities.Player.filter({ email_jugador: email }),
      sr.entities.Player.filter({ acceso_menor_email: email }),
    ]);

    const map = new Map();
    [...(a||[]), ...(b||[]), ...(c||[]), ...(d||[])].forEach(p => map.set(p.id, p));
    const players = [...map.values()];

    if (players.length === 0) {
      return Response.json({ assignments: [], players: 0 });
    }

    const playerIds = players.map(p => p.id);
    const all = await sr.entities.DorsalAssignment.filter({ estado: 'asignado' });
    const mine = (all || []).filter(x => playerIds.includes(x.jugador_id));

    if (mine.length === 0) {
      return Response.json({ assignments: [], players: players.length });
    }

    // Temporada más reciente con asignaciones
    const temporadas = [...new Set(mine.map(x => x.temporada).filter(Boolean))].sort().reverse();
    const target = temporadas[0];
    const filtered = mine.filter(x => x.temporada === target);

    // Un dorsal por jugador
    filtered.sort((x, y) => new Date(y.updated_date || 0) - new Date(x.updated_date || 0));
    const seen = new Set();
    const unique = [];
    for (const x of filtered) {
      if (seen.has(x.jugador_id)) continue;
      seen.add(x.jugador_id);
      unique.push({
        jugador_id: x.jugador_id,
        jugador_nombre: x.jugador_nombre,
        dorsal: x.dorsal,
        categoria: x.categoria,
        temporada: x.temporada,
      });
    }

    return Response.json({ assignments: unique, players: players.length, temporada: target });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});