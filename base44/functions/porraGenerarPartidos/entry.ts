import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Genera los 72 partidos de fase de grupos del Mundial 2026
// Cada grupo: 6 partidos con el formato estándar FIFA
// Jornada 1: 1v2, 3v4
// Jornada 2: 1v3, 4v2
// Jornada 3: 1v4, 2v3
const ORDEN_PARTIDOS = [
  [1, 2], [3, 4],   // J1
  [1, 3], [4, 2],   // J2
  [1, 4], [2, 3],   // J3
];

const GRUPOS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];

// Fechas estimadas del Mundial 2026 (11 jun - 19 jul)
// Fase de grupos: 11 jun - 27 jun (16 días)
// Cada día ~5 partidos. Aquí asignamos fechas aproximadas que el admin puede ajustar.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admin' }, { status: 403 });
    }

    // Borrar partidos de grupos existentes para regenerar limpio
    const existentes = await base44.asServiceRole.entities.PorraPartido.filter({ fase: 'grupos' });
    for (const p of existentes) {
      await base44.asServiceRole.entities.PorraPartido.delete(p.id);
    }

    // Cargar todos los equipos
    const equipos = await base44.asServiceRole.entities.PorraEquipo.list();
    const equiposPorGrupo = {};
    for (const g of GRUPOS) {
      equiposPorGrupo[g] = equipos
        .filter(e => e.grupo === g)
        .sort((a, b) => (a.orden_grupo || 0) - (b.orden_grupo || 0));
    }

    const partidosACrear = [];
    let numeroPartido = 1;
    const fechaBase = new Date('2026-06-11T16:00:00Z');

    for (const grupo of GRUPOS) {
      const eqs = equiposPorGrupo[grupo];
      if (eqs.length !== 4) {
        return Response.json({ error: `Grupo ${grupo} no tiene 4 equipos (tiene ${eqs.length})` }, { status: 400 });
      }
      for (let i = 0; i < ORDEN_PARTIDOS.length; i++) {
        const [posLocal, posVis] = ORDEN_PARTIDOS[i];
        const local = eqs[posLocal - 1];
        const visitante = eqs[posVis - 1];
        // Distribuir partidos a lo largo de 16 días
        const offsetDias = Math.floor((numeroPartido - 1) / 5);
        const fecha = new Date(fechaBase);
        fecha.setDate(fecha.getDate() + offsetDias);
        fecha.setHours(16 + ((numeroPartido - 1) % 5) * 2);

        partidosACrear.push({
          fase: 'grupos',
          grupo,
          numero_partido: numeroPartido,
          equipo_local_codigo: local.codigo,
          equipo_visitante_codigo: visitante.codigo,
          fecha_partido: fecha.toISOString(),
          finalizado: false,
        });
        numeroPartido++;
      }
    }

    // Bulk create
    await base44.asServiceRole.entities.PorraPartido.bulkCreate(partidosACrear);

    return Response.json({ 
      success: true, 
      partidos_creados: partidosACrear.length,
      eliminados: existentes.length 
    });
  } catch (error) {
    console.error('Error generando partidos:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});