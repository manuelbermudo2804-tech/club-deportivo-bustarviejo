import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { playerId, tipo } = await req.json();
    if (!playerId || !['jugador', 'tutor'].includes(tipo)) {
      return Response.json({ error: 'Parámetros inválidos' }, { status: 400 });
    }

    const player = await base44.asServiceRole.entities.Player.get(playerId);
    if (!player) return Response.json({ error: 'Jugador no encontrado' }, { status: 404 });

    // Verificar que el usuario es tutor/familia de este jugador (o admin)
    const esFamilia = player.email_padre === user.email || player.email_tutor_2 === user.email;
    if (!esFamilia && user.role !== 'admin') {
      return Response.json({ error: 'No autorizado para este jugador' }, { status: 403 });
    }

    const nowIso = new Date().toISOString();
    const updateData = tipo === 'jugador'
      ? { firma_jugador_completada: true, firma_jugador_completada_por: user.email, firma_jugador_completada_fecha: nowIso }
      : { firma_tutor_completada: true, firma_tutor_completada_por: user.email, firma_tutor_completada_fecha: nowIso };

    await base44.asServiceRole.entities.Player.update(playerId, updateData);

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});