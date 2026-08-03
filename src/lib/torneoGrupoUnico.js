// Clasificación general para el formato "grupo único" (ej: 24 equipos, 3 partidos c/u).
// Todos los equipos de la categoría forman una sola tabla.
// Desempate (según dosier Sierra Norte Madrid Cup):
//   1) Puntos
//   2) Diferencia general de goles/sets
//   3) Goles/sets a favor
//   4) Menos goles/sets en contra
//   5) Nombre (alfabético, estable)

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

/**
 * Clasificación general de un grupo único.
 * @returns {Array} filas ordenadas con { posicion, equipo_id, nombre, ... }
 */
export function calcularClasificacionGeneral(equipos, partidos, torneo) {
  const stats = acumular(equipos, partidos, torneo);
  const filas = Object.values(stats);

  const cmp = (a, b) => {
    // 1) Puntos
    if (b.puntos !== a.puntos) return b.puntos - a.puntos;
    // 2) Diferencia de goles
    if (b.diferencia !== a.diferencia) return b.diferencia - a.diferencia;
    // 3) Goles a favor
    if (b.favor !== a.favor) return b.favor - a.favor;
    // 4) Menos goles en contra
    if (a.contra !== b.contra) return a.contra - b.contra;
    // 5) Alfabético (estable)
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

/**
 * Semillas "en blanco" de una fase final: una entrada por cada posición del rango
 * [desde, hasta], SIN equipo asignado. Sirve para generar el esqueleto del cuadro
 * antes de que la liguilla termine. El nombre es la posición ("1º clasificado"…).
 * @returns {Array} [{ posicion, nombre }] ordenado por semilla (mejor 1º)
 */
export function semillasFasePlaceholder(fase) {
  const semillas = [];
  for (let pos = fase.desde; pos <= fase.hasta; pos++) {
    semillas.push({ posicion: pos, nombre: `${pos}º clasificado` });
  }
  return semillas;
}