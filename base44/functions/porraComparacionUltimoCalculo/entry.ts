import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Devuelve un listado compacto de todos los participantes pagados con
// sus puntos actuales y movimiento de posición. Útil para que el admin
// vea de un vistazo quién subió/bajó tras el último cálculo de resultados.
//
// Solo admin.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admin' }, { status: 403 });
    }

    const participantes = await base44.asServiceRole.entities.PorraParticipante.filter({ estado_pago: 'pagado' });

    const ordenados = participantes
      .map(p => ({
        id: p.id,
        alias: p.alias_equipo,
        nombre: p.nombre,
        puntos_total: p.puntos_total || 0,
        puntos_grupos: p.puntos_grupos || 0,
        puntos_terceros: p.puntos_terceros || 0,
        puntos_eliminatorias: p.puntos_eliminatorias || 0,
        puntos_campeon: p.puntos_campeon || 0,
        puntos_tercer_puesto: p.puntos_tercer_puesto || 0,
        puntos_especiales: p.puntos_especiales || 0,
        posicion_ranking: p.posicion_ranking || 0,
        posicion_anterior: p.posicion_anterior || 0,
        movimiento: (p.posicion_anterior || 0) - (p.posicion_ranking || 0), // +sube, -baja
        ultima_actualizacion: p.updated_date,
      }))
      .sort((a, b) => b.puntos_total - a.puntos_total);

    return Response.json({
      total: ordenados.length,
      participantes: ordenados,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});