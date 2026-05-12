import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

// Genera los partidos eliminatorios del Mundial 2026 (48 equipos)
// según el BRACKET OFICIAL FIFA publicado.
//
// Fuente: FIFA.com — "FIFA World Cup 2026 knockout stage match schedule"
// y Anexo C de las Regulaciones del torneo.
//
// Estructura: 16avos (16 partidos M73-M88) → 8vos (8) → 4tos (4) → semis (2)
// → tercer puesto (1) + final (1) = 32 partidos.

// Definición de los 16 cruces oficiales de Ronda de 32 (M73-M88)
// El placeholder describe el cruce real publicado por FIFA.
const RONDA_32 = [
  { num: 1,  fifa: 73, local: '2º A',  visitante: '2º B' },
  { num: 2,  fifa: 74, local: '1º E',  visitante: '3º A/B/C/D/F' },
  { num: 3,  fifa: 75, local: '1º F',  visitante: '2º C' },
  { num: 4,  fifa: 76, local: '1º C',  visitante: '2º F' },
  { num: 5,  fifa: 77, local: '1º I',  visitante: '3º C/D/F/G/H' },
  { num: 6,  fifa: 78, local: '2º E',  visitante: '2º I' },
  { num: 7,  fifa: 79, local: '1º A',  visitante: '3º C/E/F/H/I' },
  { num: 8,  fifa: 80, local: '1º L',  visitante: '3º E/H/I/J/K' },
  { num: 9,  fifa: 81, local: '1º D',  visitante: '3º B/E/F/I/J' },
  { num: 10, fifa: 82, local: '1º G',  visitante: '3º A/E/H/I/J' },
  { num: 11, fifa: 83, local: '2º K',  visitante: '2º L' },
  { num: 12, fifa: 84, local: '1º H',  visitante: '2º J' },
  { num: 13, fifa: 85, local: '1º B',  visitante: '3º E/F/G/I/J' },
  { num: 14, fifa: 86, local: '1º J',  visitante: '2º H' },
  { num: 15, fifa: 87, local: '1º K',  visitante: '3º D/E/I/J/L' },
  { num: 16, fifa: 88, local: '2º D',  visitante: '2º G' },
];

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

    // 16avos de final — cruces oficiales FIFA (M73-M88)
    RONDA_32.forEach(cruce => {
      partidos.push({
        fase: '16avos',
        numero_partido: cruce.num,
        equipo_local_placeholder: cruce.local,
        equipo_visitante_placeholder: cruce.visitante,
        fecha_partido: new Date('2026-06-28T16:00:00Z').toISOString(),
        finalizado: false,
      });
    });

    // 8vos de final — 8 partidos. Cada uno enfrenta a ganadores de 2 partidos
    // consecutivos de 16avos (pares 1-2, 3-4, 5-6, ...).
    for (let i = 1; i <= 8; i++) {
      const m1 = (i - 1) * 2 + 1;
      const m2 = (i - 1) * 2 + 2;
      partidos.push({
        fase: '8vos',
        numero_partido: i,
        equipo_local_placeholder: `Ganador 16avos-${m1}`,
        equipo_visitante_placeholder: `Ganador 16avos-${m2}`,
        fecha_partido: new Date('2026-07-04T16:00:00Z').toISOString(),
        finalizado: false,
      });
    }

    // Cuartos — 4 partidos
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

    // Semis — 2 partidos
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