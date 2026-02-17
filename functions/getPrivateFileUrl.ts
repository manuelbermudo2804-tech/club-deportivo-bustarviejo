import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { file_uri, player_id } = await req.json();

    if (!file_uri) {
      return Response.json({ error: 'file_uri requerido' }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';
    const isCoach = user.es_entrenador === true;
    const isCoordinator = user.es_coordinador === true;
    const isTreasurer = user.es_tesorero === true;

    // Admin, entrenador, coordinador y tesorero pueden ver cualquier archivo
    if (isAdmin || isCoach || isCoordinator || isTreasurer) {
      const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
        file_uri,
        expires_in: 300
      });
      return Response.json({ signed_url });
    }

    // Padres: solo pueden ver archivos de sus propios jugadores
    if (player_id) {
      const player = await base44.entities.Player.filter({ id: player_id });
      const p = player[0];

      if (!p) {
        return Response.json({ error: 'Jugador no encontrado' }, { status: 404 });
      }

      const isParent = p.email_padre === user.email || p.email_tutor_2 === user.email;
      const isPlayerSelf = p.email_jugador === user.email;

      if (!isParent && !isPlayerSelf) {
        return Response.json({ error: 'Sin permiso para ver este archivo' }, { status: 403 });
      }
    }

    const { signed_url } = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
      file_uri,
      expires_in: 300
    });

    return Response.json({ signed_url });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});