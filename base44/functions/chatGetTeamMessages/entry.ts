import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Lectura segura de mensajes de chat de equipo (entrenador <-> familias).
// El RLS de ChatMessage depende de campos de usuario (categorias_hijos / categorias_entrena)
// que en producción están desincronizados con el grupo_id real de los mensajes, lo que
// hacía que NADIE pudiera leer. Aquí resolvemos el acceso con datos reales (los jugadores
// de la familia o las categorías que entrena/coordina el usuario) usando service-role.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const categoria = body.categoria;
    if (!categoria) return Response.json({ error: 'Falta categoria' }, { status: 400 });

    const email = user.email;
    const isAdmin = user.role === 'admin';
    const isCoach = user.es_entrenador === true;
    const isCoordinator = user.es_coordinador === true;

    // Normalización idéntica a la del frontend (toGroupId)
    const toGroupId = (s) => (s || '').toString()
      .replace(/\(.*?\)/g, '')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim().replace(/\s+/g, ' ').replace(/\s+/g, '_').toLowerCase();
    // Normaliza también grupo_id ya almacenados (pueden venir con guiones bajos/acentos)
    const normalizeGid = (s) => (s || '').toString()
      .replace(/\(.*?\)/g, '').replace(/_/g, ' ')
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim().replace(/\s+/g, '_').toLowerCase();

    const targetGid = toGroupId(categoria);

    // ===== Verificar que el usuario tiene acceso a esta categoría =====
    let hasAccess = false;
    if (isAdmin) {
      hasAccess = true;
    } else if (isCoach || isCoordinator) {
      const cats = [
        ...(user.categorias_entrena || []),
        ...(user.categorias_coordina || []),
      ];
      hasAccess = cats.some(c => toGroupId(c) === targetGid);
    } else {
      // Familia / jugador: resolver categorías por sus jugadores reales
      const myPlayers = await base44.asServiceRole.entities.Player.filter({
        $or: [{ email_padre: email }, { email_tutor_2: email }, { email_jugador: email }],
        activo: true
      });
      const myCats = myPlayers.map(p => p.categoria_principal || p.deporte).filter(Boolean);
      hasAccess = myCats.some(c => toGroupId(c) === targetGid);
    }

    if (!hasAccess) {
      return Response.json({ error: 'Sin acceso a esta categoría', messages: [] }, { status: 403 });
    }

    // ===== Cargar mensajes de la categoría (match por grupo_id O por deporte) =====
    const all = await base44.asServiceRole.entities.ChatMessage.filter(
      { tipo: { $in: ['padre_a_grupo', 'entrenador_a_grupo', 'admin_a_grupo'] } },
      'created_date', 1000
    );
    const messages = all.filter(m =>
      normalizeGid(m.grupo_id || m.deporte) === targetGid && !m.eliminado
    );

    return Response.json({ messages });
  } catch (error) {
    console.error('chatGetTeamMessages error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});