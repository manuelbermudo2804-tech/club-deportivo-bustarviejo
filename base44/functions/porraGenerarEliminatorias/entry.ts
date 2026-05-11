import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Genera los partidos de eliminatorias del Mundial 2026 (formato 48 equipos)
// 32avos no existe (48 equipos -> 32 clasificados directamente a 16avos)
// 16avos: 16 partidos
// 8vos: 8 partidos
// 4tos: 4 partidos
// Semis: 2 partidos
// Tercer puesto: 1 partido
// Final: 1 partido
// Total: 32 partidos eliminatorios

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Solo admin' }, { status: 403 });
    }

    // Borrar eliminatorias existentes
    const fases = ['16avos', '8vos', '4tos', 'semis', 'tercer_puesto', 'final'];
    for (const fase of fases) {
      const existentes = await base44.asServiceRole.entities.PorraPartido.filter({ fase });
      for (const p of existentes) {
        await base44.asServiceRole.entities.PorraPartido.delete(p.id);
      }
    }

    const partidos = [];

    // 16avos de final - 16 partidos con placeholders genéricos
    // El bracket exacto del Mundial 2026 con 48 equipos lo confirmará FIFA tras el sorteo
    for (let i = 1; i <= 16; i++) {
      partidos.push({
        fase: '16avos',
        numero_partido: i,
        equipo_local_placeholder: `1º Grupo ${String.fromCharCode(64 + ((i - 1) % 12) + 1)}`,
        equipo_visitante_placeholder: `2º/3º Grupo`,
        fecha_partido: new Date('2026-06-28T16:00:00Z').toISOString(),
        finalizado: false,
      });
    }

    // 8vos de final - 8 partidos
    for (let i = 1; i <= 8; i++) {
      partidos.push({
        fase: '8vos',
        numero_partido: i,
        equipo_local_placeholder: `Ganador 16avos-${(i - 1) * 2 + 1}`,
        equipo_visitante_placeholder: `Ganador 16avos-${(i - 1) * 2 + 2}`,
        fecha_partido: new Date('2026-07-04T16:00:00Z').toISOString(),
        finalizado: false,
      });
    }

    // Cuartos - 4 partidos
    for (let i = 1; i <= 4; i++) {
      partidos.push({
        fase: '4tos',
        numero_partido: i,
        equipo_local_placeholder: `Ganador 8vos-${(i - 1) * 2 + 1}`,
        equipo_visitante_placeholder: `Ganador 8vos-${(i - 1) * 2 + 2}`,
        fecha_partido: new Date('2026-07-09T16:00:00Z').toISOString(),
        finalizado: false,
      });
    }

    // Semis - 2 partidos
    for (let i = 1; i <= 2; i++) {
      partidos.push({
        fase: 'semis',
        numero_partido: i,
        equipo_local_placeholder: `Ganador 4tos-${(i - 1) * 2 + 1}`,
        equipo_visitante_placeholder: `Ganador 4tos-${(i - 1) * 2 + 2}`,
        fecha_partido: new Date('2026-07-14T16:00:00Z').toISOString(),
        finalizado: false,
      });
    }

    // Tercer puesto
    partidos.push({
      fase: 'tercer_puesto',
      numero_partido: 1,
      equipo_local_placeholder: 'Perdedor Semi 1',
      equipo_visitante_placeholder: 'Perdedor Semi 2',
      fecha_partido: new Date('2026-07-18T16:00:00Z').toISOString(),
      finalizado: false,
    });

    // Final
    partidos.push({
      fase: 'final',
      numero_partido: 1,
      equipo_local_placeholder: 'Ganador Semi 1',
      equipo_visitante_placeholder: 'Ganador Semi 2',
      fecha_partido: new Date('2026-07-19T17:00:00Z').toISOString(),
      finalizado: false,
    });

    await base44.asServiceRole.entities.PorraPartido.bulkCreate(partidos);

    return Response.json({ success: true, partidos_creados: partidos.length });
  } catch (error) {
    console.error('Error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});