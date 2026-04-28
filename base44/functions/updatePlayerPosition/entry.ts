import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const isStaff = user.role === 'admin' || user.es_entrenador === true || user.es_coordinador === true;
    if (!isStaff) {
      return Response.json({ error: 'Forbidden: Staff access required' }, { status: 403 });
    }

    const body = await req.json();
    const { playerId, posicion, numero_camiseta } = body || {};

    if (!playerId) {
      return Response.json({ error: 'playerId is required' }, { status: 400 });
    }

    const updateData = {};
    if (posicion !== undefined) updateData.posicion = posicion;
    if (numero_camiseta !== undefined) updateData.numero_camiseta = numero_camiseta || null;

    const updated = await base44.asServiceRole.entities.Player.update(playerId, updateData);

    return Response.json({ success: true, player: updated });
  } catch (error) {
    console.error('[updatePlayerPosition] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});