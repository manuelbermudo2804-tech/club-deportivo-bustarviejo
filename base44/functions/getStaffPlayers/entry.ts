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

    // Bypass RLS to fetch all players reliably for staff views
    const players = await base44.asServiceRole.entities.Player.list();

    return Response.json({ players: players || [] });
  } catch (error) {
    console.error('[getStaffPlayers] error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});