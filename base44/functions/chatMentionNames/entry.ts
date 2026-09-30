import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Devuelve solo NOMBRES de miembros de un chat para las @menciones
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { tipo, categoria } = await req.json();
  const isStaff = user.role === 'admin' || user.es_entrenador || user.es_coordinador;
  const sr = base44.asServiceRole.entities;

  if (tipo === 'staff') {
    if (!isStaff) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const users = await sr.User.list('-created_date', 1000);
    const names = users
      .filter(u => u.role === 'admin' || u.es_entrenador || u.es_coordinador)
      .map(u => u.full_name);
    return Response.json({ names });
  }

  if (tipo === 'equipo' && categoria) {
    const players = await sr.Player.filter({ activo: true }, '-created_date', 2000);
    const inCat = players.filter(p =>
      p.deporte === categoria || p.categoria_principal === categoria || (p.categorias || []).includes(categoria));
    const mine = inCat.some(p => [p.email_padre, p.email_tutor_2, p.email_jugador].includes(user.email));
    if (!mine && !isStaff) return Response.json({ error: 'Forbidden' }, { status: 403 });
    const settings = await sr.CoachSettings.list('-updated_date', 200);
    const coaches = settings
      .filter(s => (s.categorias_entrena || []).includes(categoria))
      .map(s => s.entrenador_nombre);
    const names = inCat.flatMap(p => [p.nombre_tutor_legal, p.nombre_tutor_2]).concat(coaches);
    return Response.json({ names });
  }

  return Response.json({ names: [] });
});