// Clasificación general para el formato "grupo único" (ej: 24 equipos, 3 partidos c/u).
// Todos los equipos de la categoría forman una sola tabla.
// Desempate (según dosier Sierra Norte Madrid Cup):
//   1) Puntos
//   2) Enfrentamiento directo (solo entre los equipos empatados a puntos)
//   3) Diferencia general de goles/sets
//   4) Goles/sets a favor
//   5) Menos goles/sets en contra
//   6) Nombre (alfabético, estable)

function partidosFinalizados(partidos) {
  return partidos.filter(
    (p) => p.finalizado && p.marcador_local != null && p.marcador_visitante != null
  );
}

// Estadística base (puntos, jugados, GF, GC…) de cada equipo sobre un conjunto de partidos
function acumular(equipos, partidos, torneo) {
  const pV = torneo?.puntos_victoria ?? 3;
  const pE = torneo?.puntos_empate ?? 1;
  const pD = torneo?.puntos_derrota ?? 0;

  const stats = {};
  equipos.forEach((e) => {
    stats[e.id] = {
      equipo_id: e.id,
      nombre: e.nombre,
      escudo_url: e.escudo_url || null,
      jugados: 0, ganados: 0, empatados: 0, perdidos: 0,
      favor: 0, contra: 0, diferencia: 0, puntos: 0,
    };
  });

  partidosFinalizados(partidos).forEach((p) => {
    const local = stats[p.equipo_local_id];
    const visit = stats[p.equipo_visitante_id];
    if (!local || !visit) return;
    const ml = p.marcador_local;
    const mv = p.marcador_visitante;
    local.jugados++; visit.jugados++;
    local.favor += ml; local.contra += mv;
    visit.favor += mv; visit.contra += ml;
    if (ml > mv) { local.ganados++; local.puntos += pV; visit.perdidos++; visit.puntos += pD; }
    else if (ml < mv) { visit.ganados++; visit.puntos += pV; local.perdidos++; local.puntos += pD; }
    else { local.empatados++; visit.empatados++; local.puntos += pE; visit.puntos += pE; }
  });

  Object.values(stats).forEach((s) => { s.diferencia = s.favor - s.contra; });
  return stats;
}

// Puntos que cada equipo del subconjunto sacó SOLO en sus enfrentamientos directos
function puntosEnfrentamientoDirecto(ids, partidos, torneo) {
  const setIds = new Set(ids);
  const mini = partidosFinalizados(partidos).filter(
    (p) => setIds.has(p.equipo_local_id) && setIds.has(p.equipo_visitante_id)
  );
  const pV = torneo?.puntos_victoria ?? 3;
  const pE = torneo?.puntos_empate ?? 1;
  const pD = torneo?.puntos_derrota ?? 0;
  const pts = {};
  ids.forEach((id) => (pts[id] = 0));
  mini.forEach((p) => {
    const ml = p.marcador_local, mv = p.marcador_visitante;
    if (ml > mv) { pts[p.equipo_local_id] += pV; pts[p.equipo_visitante_id] += pD; }
    else if (ml < mv) { pts[p.equipo_visitante_id] += pV; pts[p.equipo_local_id] += pD; }
    else { pts[p.equipo_local_id] += pE; pts[p.equipo_visitante_id] += pE; }
  });
  return pts;
}

/**
 * Clasificación general de un grupo único.
 * @returns {Array} filas ordenadas con { posicion, equipo_id, nombre, ... }
 */
export function calcularClasificacionGeneral(equipos, partidos, torneo) {
  const stats = acumular(equipos, partidos, torneo);
  const filas = Object.values(stats);

  const cmp = (a, b) => {
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    // 2) enfrentamiento directo entre los empatados a puntos
    const empatados = filas.filter((f) => f.puntos === a.puntos).map((f) => f.equipo_id);
    if (empatados.length > 1) {
      const h2h = puntosEnfrentamientoDirecto(empatados, partidos, torneo);
      if ((h2h[b.equipo_id] || 0) !== (h2h[a.equipo_id] || 0)) {
        return (h2h[b.equipo_id] || 0) - (h2h[a.equipo_id] || 0);
      }
    }
    if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
    if (b.favor !== a.favor) return b.favor - a.favor;
    if (a.contra !== b.contra) return a.contra - b.contra;
    return a.nombre.localeCompare(b.nombre);
  };

  filas.sort(cmp);
  return filas.map((f, i) => ({ ...f, posicion: i + 1 }));
}

/**
 * Semillas de una fase final (grupo único): equipos cuya posición general cae
 * dentro del rango [desde, hasta] de la fase, ya ordenados por semilla (mejor 1º).
 * @returns {Array} [{ equipo_id, nombre }] listo para construirCuadro
 */
export function semillasFase(equipos, partidos, torneo, fase) {
  const filas = calcularClasificacionGeneral(equipos, partidos, torneo);
  return filas
    .filter((f) => f.posicion >= fase.desde && f.posicion <= fase.hasta)
    .map((f) => ({ equipo_id: f.equipo_id, nombre: f.nombre }));
}