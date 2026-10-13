import { createClientFromRequest } from 'npm:@base44/sdk@0.8.53';

// Devuelve el último aviso "No voy" de un jugador para una fecha.
// Solo para usuarios vinculados al jugador (padre, tutor 2, jugador o acceso juvenil).
Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();
  if (!user) return Response.json({ error: 'No autenticado' }, { status: 401 });
  const { jugador_id, fecha, grupo_id } = await req.json();
  const p = await base44.asServiceRole.entities.Player.get(jugador_id);
  const email = (user.email || '').toLowerCase();
  const vinculados = [p?.email_padre, p?.email_tutor_2, p?.email_jugador, p?.acceso_menor_email]
    .filter(Boolean).map((e) => e.toLowerCase());
  if (user.role !== 'admin' && !vinculados.includes(email)) {
    return Response.json({ error: 'Sin permiso' }, { status: 403 });
  }
  const prefijo = `novoy_${jugador_id}_${fecha}_`;
  const r = await base44.asServiceRole.entities.ChatMessage.filter(
    { grupo_id, client_id: { $regex: `^${prefijo}` } },
    { sort: '-created_date', limit: 1 }
  );
  const m = r.items?.[0];
  return Response.json({
    ultimo: m ? { client_id: m.client_id, remitente_email: m.remitente_email, remitente_nombre: m.remitente_nombre } : null,
  });
});